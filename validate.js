import { getSheetsClient } from '../../../lib/googleAuth';

const SPREADSHEET_ID = process.env.GOOGLE_CUSTOMER_SHEET_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { uid } = req.body || {};
  if (!uid) {
    return res.status(400).json({ success: false, message: 'uid is required' });
  }

  try {
    const sheets = getSheetsClient();

    const complaintsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Complaints!A2:A',
    });
    const complaintUids = (complaintsRes.data.values || []).map((r) => r[0]);

    if (!complaintUids.includes(uid)) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'The Service UID entered could not be found. Please check the UID and enter it again.',
      });
    }

    const feedbackRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Feedback!A2:A',
    });
    const feedbackUids = (feedbackRes.data.values || []).map((r) => r[0]);

    if (feedbackUids.includes(uid)) {
      return res.status(200).json({
        success: true,
        valid: true,
        alreadySubmitted: true,
        message: 'Feedback for this Service UID has already been received. Thank you for your valuable feedback.',
      });
    }

    return res.status(200).json({ success: true, valid: true, alreadySubmitted: false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}
