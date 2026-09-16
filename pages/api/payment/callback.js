import { getSheets, readTab, SHEET_ID } from "../../../lib/sheets";

export default async function handler(req, res) {
  try {
    const body = req.body || {};
    const invoiceId = body.invoice_id || body.data?.invoice_id || body.id || req.query.invoice_id;
    if (!invoiceId) return res.status(400).json({ ok: false });

    const auth = Buffer.from(process.env.MOYASAR_SECRET_KEY + ":").toString("base64");
    const r = await fetch(`https://api.moyasar.com/v1/invoices/${invoiceId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const inv = await r.json();
    const newStatus = inv.status === "paid" ? "PAID" : inv.status === "failed" ? "FAILED" : "PENDING";

    const payments = await readTab("Payments");
    const row = payments.find((p) => p.gatewayref === invoiceId);
    if (!row) return res.status(404).json({ ok: false });
    if (row.status === "PAID") return res.json({ ok: true }); // idempotent

    // I = status, L = paidat
    const sheets = getSheets();
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          { range: `Payments!I${row._row}`, values: [[newStatus]] },
          { range: `Payments!L${row._row}`, values: [[newStatus === "PAID" ? new Date().toISOString() : ""]] },
        ],
      },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
}
