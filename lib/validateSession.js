import { getSheetsClient } from './googleAuth';

const SPREADSHEET_ID = process.env.GOOGLE_CUSTOMER_SHEET_ID;

// Sessions tab: sessionid | username | role | servicecentre | createdat | expiresat
export async function validateSession(sessionid) {
  if (!sessionid) {
    return { valid: false, message: 'No session provided' };
  }

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sessions!A2:F',
  });
  const rows = res.data.values || [];
  const row = rows.find((r) => r[0] === sessionid);

  if (!row) {
    return { valid: false, message: 'Invalid session' };
  }

  const [, username, role, servicecentre, , expiresat] = row;

  if (!expiresat || new Date() > new Date(expiresat)) {
    return { valid: false, message: 'Session expired' };
  }

  return { valid: true, username, role, servicecentre: servicecentre || '' };
}
