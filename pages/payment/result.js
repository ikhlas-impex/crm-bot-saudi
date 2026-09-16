import Link from "next/link";
import { useRouter } from "next/router";

export default function Result() {
  const { pid } = useRouter().query;
  return (
    <main className="landing-wrap">
      <div className="landing-card">
        <h1>Thank you</h1>
        <p className="landing-sub">
          Your payment {pid ? <b>{pid}</b> : ""} has been received and is being
          confirmed. Keep this reference for your records.
        </p>
        <Link className="landing-btn landing-primary" href="/">Back to Home</Link>
      </div>
    </main>
  );
}
