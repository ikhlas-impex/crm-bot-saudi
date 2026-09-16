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
      <main className="landing-wrap">
        <div className="landing-card">
          <Link href="/" className="landing-back">← Back</Link>
          <h1>Complete a Payment</h1>

          {!dealer ? (
            <>
              <label>Registered Dealer ID</label>
              <input value={dealerid} placeholder="DLR012"
                onChange={(e) => setDealerid(e.target.value.toUpperCase())} />
              <label>Registered mobile number</label>
              <input value={mobile} placeholder="05XXXXXXXX" inputMode="tel"
                onChange={(e) => setMobile(e.target.value)} />
              <button className="landing-btn landing-primary" disabled={busy || !dealerid || !mobile}
                onClick={verify}>
                {busy ? "Checking…" : "Verify"}
              </button>
            </>
          ) : (
            <>
              <div className="landing-info">
                <b>{dealer.dealername}</b><br />
                {dealer.dealerid} · {dealer.servicecenter}
              </div>
              <label>Ticket number (optional)</label>
              <input value={ticketno} placeholder="IMX-KSA-00012"
                onChange={(e) => setTicketno(e.target.value.toUpperCase())} />
              <label>Amount (SAR)</label>
              <input value={amount} inputMode="decimal" placeholder="0.00"
                onChange={(e) => setAmount(e.target.value)} />
              <button className="landing-btn landing-primary" disabled={busy} onClick={pay}>
                {busy ? "Redirecting…" : "Proceed to Payment"}
              </button>
            </>
          )}
          {msg && <p className="landing-error">{msg}</p>}
        </div>
      </main>
    </>
  );
}
