import { getSheetsClient } from '../../../lib/googleAuth';
import { validateSession } from '../../../lib/validateSession';

const SPREADSHEET_ID = process.env.GOOGLE_CUSTOMER_SHEET_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { sessionid, statusFilter } = req.body;

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
    
    let complaints = rows.map(r => ({
      uid: r[0] || '',
      date: r[1] || '',
      phone: r[2] || '',
      customername: r[3] || '',
      altmobile: r[4] || '',
      address: r[5] || '',
      city: r[6] || '',
      area: r[7] || '',
      productgroup: r[8] || '',
      model: r[9] || '',
      modelserialimg: r[10] || '',
      productimg: r[11] || '',
      invoiceimg: r[12] || '',
      complaintdetails: r[13] || '',
      dop: r[14] || '',
      warrantystatus: r[15] || '',
      chargeamount: r[16] || '0',
      paymentproofimg: r[17] || '',
      paymentstatus: r[18] || '',
      status: r[19] || '',
      servicecentre: r[20] || '',
      cancelreason: r[21] || '',
      createdat: r[22] || '',
      verifiedby: r[23] || '',
      verifiedat: r[24] || ''
    }));
    
    // Apply filters
    if (session.role !== 'admin') {
      complaints = complaints.filter(c => c.servicecentre === session.servicecentre);
    }
    
    if (statusFilter) {
      complaints = complaints.filter(c => c.status === statusFilter);
    }
    
    // Sort descending by createdat
    complaints.sort((a, b) => new Date(b.createdat || 0) - new Date(a.createdat || 0));

    return res.status(200).json({ success: true, complaints });
  } catch (err) {
    console.error('Complaints fetch error:', err);
    return res.status(500).json({ success: false, message: 'Internal error fetching complaints' });
  }
}
