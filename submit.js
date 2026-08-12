import { getSheetsClient } from '../../../lib/googleAuth';

const SPREADSHEET_ID = process.env.GOOGLE_CUSTOMER_SHEET_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const {
    uid,
    q1_technician_behaviour,
    q2_technician_punctuality,
    q3_service_quality,
    q4_resolution, // 'Completely Resolved' | 'Partially Resolved' | 'Not Resolved'
    q4_comment,
    q5_response_time,
    q6_overall_experience,
    q7_product_satisfaction,
    q8_comments,
    q9_recommendation,
  } = req.body || {};

  if (!uid) {
    return res.status(400).json({ success: false, message: 'uid is required' });
  }
  const required = {
    q1_technician_behaviour, q2_technician_punctuality, q3_service_quality,
    q4_resolution, q5_response_time, q6_overall_experience, q7_product_satisfaction,
    q9_recommendation,
  };
  for (const [key, val] of Object.entries(required)) {
    if (val === undefined || val === null || val === '') {
      return res.status(400).json({ success: false, message: `${key} is required` });
    }
  }

  try {
    const sheets = getSheetsClient();

    // Re-validate server-side - don't trust the client alone. Pull columns
    // A (uid) and C (phone) from Complaints in one read.
    const complaintsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Complaints!A2:C',
    });
    const complaintRow = (complaintsRes.data.values || []).find((r) => r[0] === uid);
    if (!complaintRow) {
      return res.status(404).json({ success: false, message: 'UID not found' });
    }
    const phone = complaintRow[2] || '';

    const feedbackRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Feedback!A2:A',
    });
    const feedbackUids = (feedbackRes.data.values || []).map((r) => r[0]);
    if (feedbackUids.includes(uid)) {
      return res.status(409).json({ success: false, message: 'Feedback already submitted for this UID' });
    }

    const flagReasons = [];
    if (Number(q6_overall_experience) <= 5) {
      flagReasons.push('Customer reports low satisfaction score - Follow-up required.');
    }
    if (q4_resolution === 'Not Resolved') {
      flagReasons.push('Customer reports issue not resolved - Follow-up required.');
    }
    const flagged = flagReasons.length > 0;

    const now = new Date().toISOString();
    const row = [
      uid,
      q1_technician_behaviour,
      q2_technician_punctuality,
      q3_service_quality,
      q4_resolution,
      q4_comment || '',
      q5_response_time,
      q6_overall_experience,
      q7_product_satisfaction,
      q8_comments || 'NO',
      q9_recommendation,
      flagged ? 'TRUE' : 'FALSE',
      flagReasons.join(' '),
      now,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Feedback!A:N',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });

    // Awaited on purpose - an unawaited call here would be the exact same
    // bug that silently dropped the complaint-registration confirmation.
    try {
      const confirmRes = await fetch('https://n8n.srv1623198.hstgr.cloud/webhook/impex-feedback-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, phone }),
      });
      if (!confirmRes.ok) {
        console.error('impex-feedback-confirm returned non-OK status', confirmRes.status, await confirmRes.text());
      }
    } catch (e) {
      console.error('impex-feedback-confirm call failed', e);
    }

    return res.status(200).json({ success: true, uid });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
}
