import { getSheetsClient } from '../../../lib/googleAuth';
import crypto from 'crypto';

const SPREADSHEET_ID = process.env.GOOGLE_CUSTOMER_SHEET_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  try {
    const sheets = getSheetsClient();
    
    // Read Users sheet
    const usersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Users!A2:D', // Expected: username | password | role | servicecentre
    });
    
    const rows = usersRes.data.values || [];
    const userRow = rows.find(r => r[0] === username && r[1] === password);
    
    if (!userRow) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const role = userRow[2];
    const servicecentre = userRow[3] || '';
    
    // Generate session
    const sessionid = crypto.randomBytes(32).toString('hex');
    const createdat = new Date().toISOString();
    
    // Expires in 24 hours
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);
    const expiresat = expires.toISOString();
    
    // Write to Sessions sheet
    // Sessions tab: sessionid | username | role | servicecentre | createdat | expiresat
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sessions!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[sessionid, username, role, servicecentre, createdat, expiresat]]
      },
    });
    
    return res.status(200).json({
      success: true,
      sessionid,
      role,
      servicecentre
    });
    
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal error during login' });
  }
}
