import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'fs';

// File uploads need the raw body - disable Next's default JSON body parser.
export const config = {
  api: {
    bodyParser: false,
  },
};

const SPREADSHEET_ID = process.env.GOOGLE_CUSTOMER_SHEET_ID;
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const SHEET_NAME = 'Complaints';

// Sheet header row, in order - keep this in sync with the actual sheet.
// uid | date | phone | customername | altmobile | address | city | area |
// productgroup | model | modelserialimg | productimg | invoiceimg |
// complaintdetails | dop | warrantystatus | chargeamount | paymentproofimg |
// paymentstatus | status | servicecentre | cancelreason | createdat |
// verifiedby | verifiedat

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key,
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file',
    ]
  });
}

async function uploadToDrive(auth, file) {
  if (!file) return '';
  const drive = google.drive({ version: 'v3', auth });
  const created = await drive.files.create({
    requestBody: {
      name: `${Date.now()}-${file.originalFilename || 'upload'}`,
      parents: [DRIVE_FOLDER_ID],
    },
    media: {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.filepath),
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  const fileId = created.data.id;
  // Anyone-with-the-link reader access so the admin dashboard can render it
  // inline without extra auth plumbing. Tighten this if that's a concern.
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
    supportsAllDrives: true,
  });
  return `https://drive.google.com/uc?id=${fileId}`;
}

function nextSequence(existingUidColumn) {
  let maxSeq = 0;
  for (const row of existingUidColumn) {
    const uid = String(row[0] || '');
    const match = uid.match(/IMX-KSA-SVC-(\d+)/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxSeq) maxSeq = n;
    }
  }
  return maxSeq;
}

function parseForm(req) {
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve([fields, files]);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  if (!SPREADSHEET_ID || !DRIVE_FOLDER_ID) {
    return res.status(500).json({ success: false, message: 'GOOGLE_CUSTOMER_SHEET_ID / GOOGLE_DRIVE_FOLDER_ID not configured' });
  }

  try {
    const [rawFields, files] = await parseForm(req);
    // formidable gives every field as an array when multiples isn't set for it - normalise
    const fields = {};
    for (const key of Object.keys(rawFields)) {
      fields[key] = Array.isArray(rawFields[key]) ? rawFields[key][0] : rawFields[key];
    }
    
    // Also normalize files to prevent undefined errors when trying to read file.filepath
    for (const key of Object.keys(files)) {
      files[key] = Array.isArray(files[key]) ? files[key][0] : files[key];
    }

    const warrantystatus = fields.warrantystatus; // 'IW' | 'OW'
    const decision = fields.decision || '';        // 'accepted' | 'cancelled' - OW only

    if (warrantystatus !== 'IW' && !(warrantystatus === 'OW' && (decision === 'accepted' || decision === 'cancelled'))) {
      return res.status(400).json({ success: false, message: 'Invalid warrantystatus/decision combination' });
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:A`,
    });
    let seq = nextSequence(readRes.data.values || []);

    let uid = '';
    let status = '';
    let cancelreason = '';
    let paymentstatus = 'N/A';
    let sendConfirmationNow = false;

    if (warrantystatus === 'IW') {
      seq += 1;
      uid = `IMX-KSA-SVC-${String(seq).padStart(5, '0')}`;
      status = 'REGISTERED';
      sendConfirmationNow = true;
    } else if (decision === 'accepted') {
      seq += 1;
      uid = `IMX-KSA-SVC-${String(seq).padStart(5, '0')}`;
      status = 'PENDING_PAYMENT_VERIFICATION';
      paymentstatus = 'PENDING_VERIFICATION';
    } else {
      status = 'OW_CANCELLED';
      cancelreason = 'OW - Customer not willing to pay';
    }

    const [modelserialimg, productimg, invoiceimg, paymentproofimg] = await Promise.all([
      uploadToDrive(auth, files.modelserialimg),
      uploadToDrive(auth, files.productimg),
      uploadToDrive(auth, files.invoiceimg),
      uploadToDrive(auth, files.paymentproofimg),
    ]);

    const now = new Date().toISOString();

    const row = [
      uid,
      now.slice(0, 10),
      fields.phone || '',
      fields.customername || '',
      fields.altmobile || '',
      fields.address || '',
      fields.city || '',
      fields.area || '',
      fields.productgroup || '',
      fields.model || '',
      modelserialimg,
      productimg,
      invoiceimg,
      fields.complaintdetails || '',
      fields.dop || '',
      warrantystatus,
      fields.chargeamount || 0,
      paymentproofimg,
      paymentstatus,
      status,
      fields.servicecentre || '',
      cancelreason,
      now,
      '',
      '',
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:Y`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    if (sendConfirmationNow) {
      // Must await on Vercel, otherwise the function terminates before the request sends
      try {
        await fetch('https://n8n.srv1623198.hstgr.cloud/webhook/impex-complaint-confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid,
            phone: fields.phone,
            customername: fields.customername,
            productgroup: fields.productgroup,
            servicecentre: fields.servicecentre,
          }),
        });
      } catch (e) {
        console.error('impex-complaint-confirm call failed', e);
      }
    }

    return res.status(200).json({
      success: true,
      uid,
      status,
      warrantystatus,
      chargeamount: fields.chargeamount || 0,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal error', error: String(err) });
  }
}
