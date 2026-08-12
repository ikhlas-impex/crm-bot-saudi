import { getSheetsClient } from '../../../lib/googleAuth';
import { validateSession } from '../../../lib/validateSession';

const SPREADSHEET_ID = process.env.GOOGLE_CUSTOMER_SHEET_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { sessionid } = req.body;

  try {
    const session = await validateSession(sessionid);
    if (!session.valid) {
      return res.status(401).json({ success: false, message: session.message });
    }

    const sheets = getSheetsClient();
    
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Feedback!A2:N',
    });
    
    const rows = result.data.values || [];
    
    let feedback = rows.map(r => ({
      uid: r[0] || '',
      q1_technician_behaviour: r[1] || '',
      q2_technician_punctuality: r[2] || '',
      q3_service_quality: r[3] || '',
      q4_resolution: r[4] || '',
      q4_comment: r[5] || '',
      q5_response_time: r[6] || '',
      q6_overall_experience: r[7] || '',
      q7_product_satisfaction: r[8] || '',
      q8_comments: r[9] || '',
      q9_recommendation: r[10] || '',
      flagged: r[11] === 'TRUE',
      flagreason: r[12] || '',
      submittedat: r[13] || ''
    }));
    
    // Sort descending by submittedat
    feedback.sort((a, b) => new Date(b.submittedat || 0) - new Date(a.submittedat || 0));

    return res.status(200).json({ success: true, feedback });
  } catch (err) {
    console.error('Feedback fetch error:', err);
    return res.status(500).json({ success: false, message: 'Internal error fetching feedback' });
  }
}
