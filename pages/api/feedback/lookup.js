import { getSheetsClient } from '../../../lib/googleAuth';

const SPREADSHEET_ID = process.env.GOOGLE_CUSTOMER_SHEET_ID;

// Complaints column indices (A2:T covers columns A-T)
const COL = { uid: 0, date: 1, phone: 2, productgroup: 8, model: 9, status: 19 };

function normalizePhone(p) {
  return String(p || '').replace(/\D/g, '').replace(/^0+/, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { phone } = req.body || {};
  if (!phone) {
    return res.status(400).json({ success: false, message: 'phone is required' });
  }

  try {
    const sheets = getSheetsClient();
    const target = normalizePhone(phone);

    const complaintsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Complaints!A2:T',
    });
    const rows = complaintsRes.data.values || [];

    // Fuzzy match - stored numbers and Interakt's incoming number don't
    // always agree on whether a country code prefix is included.
    const matches = rows.filter((r) => {
      const rowPhone = normalizePhone(r[COL.phone]);
      if (!rowPhone) return false;
      return rowPhone === target || rowPhone.endsWith(target) || target.endsWith(rowPhone);
    }).filter((r) => r[COL.status] === 'REGISTERED'); // only completed/registered service, not pending or cancelled

    const feedbackRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Feedback!A2:A',
    });
    const feedbackUids = new Set((feedbackRes.data.values || []).map((r) => r[0]));

    const eligible = matches
      .filter((r) => !feedbackUids.has(r[COL.uid]))
      .map((r) => ({
        uid: r[COL.uid],
        date: r[COL.date],
        productgroup: r[COL.productgroup],
        model: r[COL.model],
      }));

    return res.status(200).json({ success: true, complaints: eligible });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}
