import { readTab, phoneKey } from "../../../lib/sheets";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { dealerid = "", mobile = "" } = req.body || {};
  try {
    const dealers = await readTab("DealerMaster");
    const d = dealers.find(
      (x) =>
        x.dealerid.toUpperCase() === dealerid.trim().toUpperCase() &&
        phoneKey(x.mobilenumber) === phoneKey(mobile)
    );
    if (!d)
      return res.json({ success: false, message: "Dealer ID and mobile do not match our records." });
    if (d.status && d.status.toLowerCase() === "inactive")
      return res.json({ success: false, message: "This dealer account is inactive." });

    res.json({
      success: true,
      dealer: { dealerid: d.dealerid, dealername: d.dealername, servicecenter: d.servicecenter },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Server error." });
  }
}
