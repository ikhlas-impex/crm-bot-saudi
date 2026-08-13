import { getSheetsClient } from '../../../lib/googleAuth';
import { validateSession } from '../../../lib/validateSession';

const SPREADSHEET_ID = process.env.GOOGLE_CUSTOMER_SHEET_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { sessionid, uid } = req.body;

  if (!uid) {
    return res.status(400).json({ success: false, message: 'UID is required' });
  }

  try {
    const session = await validateSession(sessionid);
    if (!session.valid) {
      return res.status(401).json({ success: false, message: session.message });
    }

    const sheets = getSheetsClient();
    
    // Fetch from Complaints tab where customer info resides
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Complaints!A2:Y',
    });
    
    const rows = result.data.values || [];
    
    // Find the specific row for the requested UID
    const row = rows.find(r => r[0] === uid);
    
    if (!row) {
      return res.status(404).json({ success: false, message: 'Customer details not found for this UID' });
    }
    
    // Extract customer details
    const customer = {
      uid: row[0] || '',
      date: row[1] || '',
      phone: row[2] || '',
      customername: row[3] || '',
      altmobile: row[4] || '',
      address: row[5] || '',
      city: row[6] || '',
      area: row[7] || '',
      productgroup: row[8] || '',
      model: row[9] || '',
      complaintdetails: row[13] || '',
      dop: row[14] || '',
      warrantystatus: row[15] || '',
      status: row[19] || '',
      servicecentre: row[20] || ''
    };
    
    // Apply access filters (admin can see all, branch can only see their branch's customers)
    if (session.role !== 'admin' && customer.servicecentre !== session.servicecentre) {
      return res.status(403).json({ success: false, message: 'Access denied to this customer record' });
    }

    return res.status(200).json({ success: true, customer });
  } catch (err) {
    console.error('Customer fetch error:', err);
    return res.status(500).json({ success: false, message: 'Internal error fetching customer details' });
  }
}
