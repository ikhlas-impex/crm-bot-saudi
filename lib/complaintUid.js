import { randomUUID } from 'crypto';

// Ticket numbers are assigned from each row's position in the sheet. Appends are
// serialised by Google Sheets, so positions are unique even when customers register
// at the same moment - reading "highest number + 1" before saving is not.
//
// A new row is first saved with a placeholder in the uid column. Its number is then
// worked out from the rows above it, counting any placeholder there as the number
// that row is about to receive. The result is the same whether or not those rows
// have finished, so concurrent registrations cannot get the same ticket.

const UID_PREFIX = 'IMX-KSA-SVC-';
const PLACEHOLDER_PREFIX = 'PENDING-';
const UID_PATTERN = /IMX-KSA-SVC-(\d+)/;

export function createUidPlaceholder() {
  return `${PLACEHOLDER_PREFIX}${randomUUID()}`;
}

// uidColumn: values of the uid column from the first data row down, as returned by
// the Sheets API ([[uid], [], [uid], ...]). rowIndex: position of the new row in it.
export function uidForRow(uidColumn, rowIndex) {
  let seq = 0;
  for (let i = 0; i < rowIndex; i++) {
    const value = String(uidColumn[i]?.[0] || '');
    const match = value.match(UID_PATTERN);
    if (match) {
      seq = Math.max(seq, parseInt(match[1], 10));
    } else if (value.startsWith(PLACEHOLDER_PREFIX)) {
      seq += 1;
    }
  }
  return `${UID_PREFIX}${String(seq + 1).padStart(5, '0')}`;
}

// Replaces a saved row's placeholder with its ticket number and returns the number.
export async function assignUid(sheets, spreadsheetId, sheetName, placeholder) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:A`,
  });
  const uidColumn = res.data.values || [];
  const rowIndex = uidColumn.findIndex(([value]) => value === placeholder);
  if (rowIndex === -1) {
    throw new Error(`Saved complaint row not found for ${placeholder}`);
  }

  const uid = uidForRow(uidColumn, rowIndex);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowIndex + 2}`, // +2: sheet rows start at 1, and row 1 is the header
    valueInputOption: 'RAW',
    requestBody: { values: [[uid]] },
  });
  return uid;
}
