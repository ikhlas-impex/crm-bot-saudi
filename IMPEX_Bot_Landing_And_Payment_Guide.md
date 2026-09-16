# IMPEX Saudi — bot.impexksa.com Landing Page + Payment Completion

Replaces the default Next.js starter page at `bot.impexksa.com` with:

1. A **"Customer Relation Bot for IMPEX"** landing page
2. A button that opens the **Customer Complaint / Pickup Registration** window
3. A **Payment Completion** flow: customer enters their registered Dealer ID → system verifies it against `DealerMaster` → a payment record is written to a new `Payments` tab → customer is sent to the payment gateway → the result is recorded back in the sheet

Builds on the existing system described in `IMPEX_System_Reference_Summary.md` (same Google Sheet, same service-account env vars as `/api/pickup/create.js`).

---

## 0. Why the Next.js page is showing

The project deployed to `bot.impexksa.com` still has the untouched `pages/index.js` from `create-next-app`. Replacing that file (Section 3) fixes it. If `bot.impexksa.com` is meant to be the same project as `impex-saudi.vercel.app`, check in **Vercel → Project → Settings → Domains** that the domain is attached to the correct project — a starter page usually means the domain points at a fresh/empty project.

---

## 1. Final file structure

```
pages/
  index.js                  ← NEW landing page (replaces starter)
  payment.js                ← NEW payment completion page
  payment/result.js         ← NEW page the gateway returns to
  api/payment/verify.js     ← NEW: checks Dealer ID + mobile in DealerMaster
  api/payment/create.js     ← NEW: writes Payments row, creates gateway invoice
  api/payment/callback.js   ← NEW: gateway webhook → marks PAID/FAILED
lib/
  sheets.js                 ← NEW shared Google Sheets helper
styles/
  globals.css               ← replace starter styles (Section 7)
```

---

## 2. New Google Sheet tab: `Payments`

Create a tab named **`Payments`** with this exact header row:

```
paymentid | dealerid | dealername | mobile | servicecenter | ticketno | amount | currency | status | gatewayref | createdat | paidat
```

- `paymentid` → `PAY-KSA-00001`, sequential
- `status` → `PENDING` → `PAID` / `FAILED`
- `ticketno` → optional (customer may type the ticket they are paying for)

Same lesson as `DealerMaster`: don't add columns in code that don't exist in the header row.

---

## 3. Environment variables (Vercel → Settings → Environment Variables)

Already present:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
GOOGLE_SHEET_ID=1VvDVd_2KlC1TL3blZOSn2ISrgXi2VSqE4SM9H4rx4Zo
```

New:
```
NEXT_PUBLIC_COMPLAINT_URL=https://impex-saudi.vercel.app/
NEXT_PUBLIC_SITE_URL=https://bot.impexksa.com
PAYMENT_SECRET_KEY=sk_live_xxxxxxxx        # gateway secret key (Moyasar example)
```

`NEXT_PUBLIC_COMPLAINT_URL` points to the existing dealer request form. If you move that form into this project, change it to `/complaint`.

Install dependency (if not already there):
```bash
npm install googleapis
```

---

## 4. `lib/sheets.js` — shared helper

```js
import { google } from "googleapis";

export function getSheets() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export const SHEET_ID = process.env.GOOGLE_SHEET_ID;

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
```

---

## 5. `pages/index.js` — landing page

```jsx
import Head from "next/head";
import Link from "next/link";

const COMPLAINT_URL = process.env.NEXT_PUBLIC_COMPLAINT_URL || "/";

export default function Home() {
  return (
    <>
      <Head>
        <title>IMPEX Customer Relation Bot</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="wrap">
        <div className="card">
          <p className="eyebrow">IMPEX Saudi Arabia</p>
          <h1>Customer Relation Bot</h1>
          <p className="sub">
            Register a complaint or pickup request, or complete a payment
            using your registered Dealer ID.
          </p>

          <div className="actions">
            <a className="btn primary" href={COMPLAINT_URL}>
              📝 Register a Complaint
              <span>Service / pickup request</span>
            </a>
            <Link className="btn" href="/payment">
              💳 Complete a Payment
              <span>For registered dealers</span>
            </Link>
          </div>

          <p className="help">
            Not registered yet? Message us on WhatsApp to register — you will
            receive your Dealer ID (e.g. DLR012).
          </p>
        </div>
      </main>
    </>
  );
}
```

---

## 6. `pages/payment.js` — payment completion page

Two steps: **verify** (Dealer ID + mobile) → **pay** (amount + optional ticket no).

```jsx
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

export default function Payment() {
  const [dealerid, setDealerid] = useState("");
  const [mobile, setMobile] = useState("");
  const [dealer, setDealer] = useState(null);
  const [amount, setAmount] = useState("");
  const [ticketno, setTicketno] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(url, body) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return r.json();
  }

  async function verify() {
    setMsg(""); setBusy(true);
    try {
      const d = await post("/api/payment/verify", { dealerid, mobile });
      if (d.success) setDealer(d.dealer);
      else setMsg(d.message || "Dealer ID not found.");
    } catch { setMsg("Network error, please try again."); }
    setBusy(false);
  }

  async function pay() {
    setMsg("");
    const amt = Number(amount);
    if (!amt || amt <= 0) return setMsg("Enter a valid amount.");
    setBusy(true);
    try {
      const d = await post("/api/payment/create", {
        dealerid, mobile, amount: amt, ticketno,
      });
      if (d.success && d.paymentUrl) window.location.href = d.paymentUrl;
      else { setMsg(d.message || "Could not start payment."); setBusy(false); }
    } catch { setMsg("Network error, please try again."); setBusy(false); }
  }

  return (
    <>
      <Head><title>Complete Payment — IMPEX</title></Head>
      <main className="wrap">
        <div className="card">
          <Link href="/" className="back">← Back</Link>
          <h1>Complete a Payment</h1>

          {!dealer ? (
            <>
              <label>Registered Dealer ID</label>
              <input value={dealerid} placeholder="DLR012"
                onChange={(e) => setDealerid(e.target.value.toUpperCase())} />
              <label>Registered mobile number</label>
              <input value={mobile} placeholder="05XXXXXXXX" inputMode="tel"
                onChange={(e) => setMobile(e.target.value)} />
              <button className="btn primary" disabled={busy || !dealerid || !mobile}
                onClick={verify}>
                {busy ? "Checking…" : "Verify"}
              </button>
            </>
          ) : (
            <>
              <div className="info">
                <b>{dealer.dealername}</b><br />
                {dealer.dealerid} · {dealer.servicecenter}
              </div>
              <label>Ticket number (optional)</label>
              <input value={ticketno} placeholder="IMX-KSA-00012"
                onChange={(e) => setTicketno(e.target.value.toUpperCase())} />
              <label>Amount (SAR)</label>
              <input value={amount} inputMode="decimal" placeholder="0.00"
                onChange={(e) => setAmount(e.target.value)} />
              <button className="btn primary" disabled={busy} onClick={pay}>
                {busy ? "Redirecting…" : "Proceed to Payment"}
              </button>
            </>
          )}
          {msg && <p className="error">{msg}</p>}
        </div>
      </main>
    </>
  );
}
```

---

## 7. API routes

### `pages/api/payment/verify.js`

Requires **both** Dealer ID and mobile so nobody can look up other dealers just by guessing `DLR0XX`.

```js
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
```

### `pages/api/payment/create.js`

Re-verifies on the server (never trust the client), writes a `PENDING` row, creates a gateway invoice, stores its ID in `gatewayref`, returns the payment URL.

> Gateway shown: **Moyasar** (Saudi, supports mada / Visa / Mastercard / Apple Pay). To use HyperPay, Tap, PayTabs etc., replace only the `createInvoice()` function and the callback check.

```js
import { getSheets, readTab, phoneKey, SHEET_ID } from "../../../lib/sheets";

async function createInvoice({ amount, paymentid, dealerid }) {
  const auth = Buffer.from(process.env.PAYMENT_SECRET_KEY + ":").toString("base64");
  const site = process.env.NEXT_PUBLIC_SITE_URL;
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
```

### `pages/api/payment/callback.js`

Gateway calls this after payment. We **don't trust the webhook body** — we re-fetch the invoice from the gateway using our secret key and update the row from that.

```js
import { getSheets, readTab, SHEET_ID } from "../../../lib/sheets";

export default async function handler(req, res) {
  try {
    const body = req.body || {};
    const invoiceId = body.invoice_id || body.data?.invoice_id || body.id || req.query.invoice_id;
    if (!invoiceId) return res.status(400).json({ ok: false });

    const auth = Buffer.from(process.env.PAYMENT_SECRET_KEY + ":").toString("base64");
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
```

Register `https://bot.impexksa.com/api/payment/callback` as the webhook URL in the gateway dashboard as well.

### `pages/payment/result.js`

```jsx
import Link from "next/link";
import { useRouter } from "next/router";

export default function Result() {
  const { pid } = useRouter().query;
  return (
    <main className="wrap">
      <div className="card">
        <h1>Thank you</h1>
        <p className="sub">
          Your payment {pid ? <b>{pid}</b> : ""} has been received and is being
          confirmed. Keep this reference for your records.
        </p>
        <Link className="btn primary" href="/">Back to Home</Link>
      </div>
    </main>
  );
}
```

---

## 8. `styles/globals.css` (replace starter content)

Also delete `styles/Home.module.css` imports from any old file.

```css
:root { --bg:#0f172a; --card:#ffffff; --text:#0f172a; --muted:#64748b;
        --brand:#0e7c3a; --border:#e2e8f0; --err:#b91c1c; }
* { box-sizing: border-box; }
body { margin:0; font-family: system-ui, "Segoe UI", Roboto, Arial, sans-serif;
       background: linear-gradient(160deg, #0e7c3a 0%, #0f172a 70%); color: var(--text); }
.wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; }
.card { background:var(--card); width:100%; max-width:460px; border-radius:16px;
        padding:32px 26px; box-shadow:0 20px 50px rgba(0,0,0,.25); }
.eyebrow { color:var(--brand); font-weight:600; letter-spacing:.08em;
           text-transform:uppercase; font-size:12px; margin:0 0 6px; }
h1 { margin:0 0 10px; font-size:26px; }
.sub, .help { color:var(--muted); line-height:1.5; }
.help { font-size:13px; margin-top:22px; }
.actions { display:grid; gap:12px; margin-top:22px; }
.btn { display:block; width:100%; text-align:left; padding:14px 16px; border-radius:12px;
       border:1px solid var(--border); background:#fff; color:var(--text); font-size:16px;
       font-weight:600; text-decoration:none; cursor:pointer; margin-top:14px; }
.actions .btn { margin-top:0; }
.btn span { display:block; font-size:12px; font-weight:400; color:var(--muted); margin-top:3px; }
.btn.primary { background:var(--brand); color:#fff; border-color:var(--brand); text-align:center; }
.btn.primary span { color:#d1fae5; }
.btn:disabled { opacity:.6; cursor:not-allowed; }
label { display:block; font-size:13px; font-weight:600; margin:16px 0 6px; }
input { width:100%; padding:12px; border:1px solid var(--border); border-radius:10px; font-size:16px; }
.info { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px; margin-top:12px; }
.error { color:var(--err); margin-top:12px; font-size:14px; }
.back { color:var(--muted); text-decoration:none; font-size:14px; }
```

Make sure `pages/_app.js` imports it:
```js
import "../styles/globals.css";
export default function App({ Component, pageProps }) { return <Component {...pageProps} />; }
```

---

## 9. Deployment & test checklist

1. Add `Payments` tab with the header row (Section 2); confirm the service account email has **Editor** access to the sheet.
2. Add the new env vars in Vercel; use a **test** gateway key (`sk_test_…`) first.
3. Push the files → Vercel redeploys → open `bot.impexksa.com` — the landing page should replace the Next.js screen.
4. Click **Register a Complaint** → opens the existing form.
5. Click **Complete a Payment** → enter a real Dealer ID + wrong mobile → should be rejected.
6. Enter correct Dealer ID + mobile → dealer card shows → enter amount → redirected to gateway.
7. Check `Payments` tab: new row with `PENDING` and `gatewayref`.
8. Pay with a gateway test card → row flips to `PAID` with `paidat` filled.
9. Switch to the live key once all steps pass.

---

## 10. Optional next steps

- **WhatsApp receipt:** in `callback.js`, when status becomes `PAID`, fire an n8n webhook (e.g. `impex-payment-confirm`) that sends a new Interakt template `payment_confirmation` (variables: dealer, paymentid, amount, ticketno). Needs a new Utility template approved first.
- **Admin dashboard:** add a **Payments** tab to `/admin` via a session-gated `impex-payments` n8n webhook, following the same service-center scoping pattern as `impex-status`.
- **Arabic toggle:** the landing page text can be switched with a simple `lang` state and `dir="rtl"` on `.card`.
