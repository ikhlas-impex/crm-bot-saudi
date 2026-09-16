import { getSheets, readTab, phoneKey, SHEET_ID } from "../../../lib/sheets";

async function createInvoice({ amount, paymentid, dealerid }) {
  const auth = Buffer.from(process.env.MOYASAR_SECRET_KEY + ":").toString("base64");
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://bot.impexksa.com";
  const r = await fetch("https://api.moyasar.com/v1/invoices", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(amount * 100), // halalas
      currency: "SAR",
      description: `IMPEX ${paymentid} (${dealerid})`,
      callback_url: `${site}/api/payment/callback`,
      success_url: `${site}/payment/result?pid=${paymentid}`,
      back_url: `${site}/payment`,
      metadata: { paymentid, dealerid },
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  return { id: data.id, url: data.url };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { dealerid = "", mobile = "", amount, ticketno = "" } = req.body || {};
  const amt = Number(amount);
  if (!amt || amt <= 0 || amt > 100000)
    return res.json({ success: false, message: "Invalid amount." });

  try {
    const dealers = await readTab("DealerMaster");
    const d = dealers.find(
      (x) =>
        x.dealerid.toUpperCase() === dealerid.trim().toUpperCase() &&
        phoneKey(x.mobilenumber) === phoneKey(mobile)
    );
    if (!d) return res.json({ success: false, message: "Dealer not verified." });

    // Next sequential payment ID
    const payments = await readTab("Payments");
    const maxNo = payments.reduce((m, p) => {
      const n = parseInt((p.paymentid || "").replace(/\D/g, ""), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    const paymentid = `PAY-KSA-${String(maxNo + 1).padStart(5, "0")}`;

    const invoice = await createInvoice({ amount: amt, paymentid, dealerid: d.dealerid });

    const sheets = getSheets();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Payments!A:L",
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          paymentid, d.dealerid, d.dealername, d.mobilenumber, d.servicecenter,
          ticketno.trim(), amt.toFixed(2), "SAR", "PENDING", invoice.id,
          new Date().toISOString(), "",
        ]],
      },
    });

    res.json({ success: true, paymentid, paymentUrl: invoice.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Could not start payment." });
  }
}
