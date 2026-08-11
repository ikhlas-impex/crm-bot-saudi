import { getSheetsClient } from '../../../lib/googleAuth';
import { validateSession } from '../../../lib/validateSession';

const SPREADSHEET_ID = process.env.GOOGLE_CUSTOMER_SHEET_ID;

// Column letters in the Complaints tab (A=uid ... Y=verifiedat)
const COL = {
  phone: 'C',
  customername: 'D',
  productgroup: 'I',
  paymentstatus: 'S',
  status: 'T',
  servicecentre: 'U',
  cancelreason: 'V',
  verifiedby: 'X',
  verifiedat: 'Y',
};

async function sendWhatsAppTemplate({ phone, templateName, bodyValues }) {
  let digits = String(phone || '').replace(/\D/g, '');
  digits = digits.replace(/^0+/, '');

  let countryCode = '966';
  if (digits.length === 10) countryCode = '91';
  else if (digits.length === 9) countryCode = '966';

  const res = await fetch('https://api.interakt.ai/v1/public/message/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${process.env.INTERAKT_API_KEY}`,
    },
    body: JSON.stringify({
      countryCode: '+' + countryCode,
      phoneNumber: digits,
      type: 'Template',
      template: { name: templateName, languageCode: 'en', bodyValues },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Interakt send failed: ${res.status} ${text}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { sessionid, uid, action, rejectionreason } = req.body || {};

  if (!uid || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: "uid and a valid action ('approve' | 'reject') are required" });
  }

  try {
    const session = await validateSession(sessionid);
    if (!session.valid) {
      return res.status(401).json({ success: false, message: session.message });
    }

    const sheets = getSheetsClient();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Complaints!A2:Y',
    });
    const rows = result.data.values || [];
    const rowIndex = rows.findIndex((r) => r[0] === uid);

    if (rowIndex === -1) {
      return res.status(404).json({ success: false, message: 'UID not found' });
    }

    const row = rows[rowIndex];
    const rowNum = rowIndex + 2; // +2: header row + 1-indexing
    const phone = row[2];
    const customername = row[3];
    const productgroup = row[8];
    const servicecentre = row[20];
    const currentStatus = row[19];

    if (session.role !== 'admin' && servicecentre !== session.servicecentre) {
      return res.status(403).json({ success: false, message: 'Not authorized for this service centre' });
    }

    if (currentStatus !== 'PENDING_PAYMENT_VERIFICATION') {
      return res.status(409).json({
        success: false,
        message: `Complaint is not pending verification (current status: ${currentStatus})`,
      });
    }

    const now = new Date().toISOString();
    let status, paymentstatus, templateName, bodyValues;

    if (action === 'approve') {
      status = 'REGISTERED';
      paymentstatus = 'VERIFIED';
      templateName = 'payment_verified_confirmation';
      bodyValues = [customername, uid, productgroup, servicecentre];
    } else {
      status = currentStatus; // unchanged - stays pending unless you manually revisit it
      paymentstatus = 'REJECTED';
      templateName = 'payment_rejected_notice';
      bodyValues = [customername, uid];
    }

    const data = [
      { range: `Complaints!${COL.paymentstatus}${rowNum}`, values: [[paymentstatus]] },
      { range: `Complaints!${COL.status}${rowNum}`, values: [[status]] },
      { range: `Complaints!${COL.verifiedby}${rowNum}`, values: [[session.username]] },
      { range: `Complaints!${COL.verifiedat}${rowNum}`, values: [[now]] },
    ];
    if (action === 'reject') {
      data.push({
        range: `Complaints!${COL.cancelreason}${rowNum}`,
        values: [[rejectionreason || 'Payment proof rejected']],
      });
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { valueInputOption: 'USER_ENTERED', data },
    });

    try {
      await sendWhatsAppTemplate({ phone, templateName, bodyValues });
    } catch (sendErr) {
      // Sheet is already updated at this point - don't fail the whole request,
      // but tell the caller the WhatsApp send didn't go through so they can retry it.
      console.error('WhatsApp send failed after sheet update:', sendErr);
      return res.status(200).json({
        success: true,
        uid,
        status,
        paymentstatus,
        warning: 'Row updated but WhatsApp confirmation failed to send - check Interakt manually.',
      });
    }

    return res.status(200).json({ success: true, uid, status, paymentstatus });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}
