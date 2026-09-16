import Head from "next/head";
import Link from "next/link";

const COMPLAINT_URL = process.env.NEXT_PUBLIC_COMPLAINT_URL || "/register";

export default function Home() {
  return (
    <>
      <Head>
        <title>IMPEX Customer Relation Bot</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="landing-wrap">
        <div className="landing-card">
          <p className="landing-eyebrow">IMPEX Saudi Arabia</p>
          <h1>Customer Relation Bot</h1>
          <p className="landing-sub">
            Register a complaint or pickup request, or complete a payment
            using your registered Dealer ID.
          </p>

          <div className="landing-actions">
            <a className="landing-btn landing-primary" href={COMPLAINT_URL}>
              📝 Register a Complaint
              <span>Service / pickup request</span>
            </a>
            <Link className="landing-btn" href="/payment">
              💳 Complete a Payment
              <span>For registered dealers</span>
            </Link>
          </div>

          <p className="landing-help">
            Not registered yet? Message us on WhatsApp to register — you will
            receive your Dealer ID (e.g. DLR012).
          </p>
        </div>
      </main>
    </>
  );
}
