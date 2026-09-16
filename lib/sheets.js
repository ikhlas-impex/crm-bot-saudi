import { google } from "googleapis";

export function getSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export const SHEET_ID = process.env.GOOGLE_CUSTOMER_SHEET_ID;

// Reads a tab and returns array of objects keyed by header row
export async function readTab(tab) {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A:Z`,
  });
  const [header = [], ...rows] = res.data.values || [];
  return rows.map((r, i) => {
    const obj = { _row: i + 2 }; // actual sheet row number
    header.forEach((h, j) => (obj[h.trim()] = (r[j] ?? "").toString().trim()));
    return obj;
  });
}

// Last 9 digits — matches both 05XXXXXXXX and 9665XXXXXXXX formats
export const phoneKey = (p = "") => p.replace(/\D/g, "").slice(-9);
