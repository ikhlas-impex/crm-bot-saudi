import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

export default function Register() {
  const [mobile, setMobile] = useState("");
  const router = useRouter();

  function handleSubmit(e) {
    e.preventDefault();
    if (mobile.trim().length >= 9) {
      router.push(`/complaint?phone=${encodeURIComponent(mobile.trim())}`);
    } else {
      alert("Please enter a valid phone number.");
    }
  }

  return (
    <>
      <Head>
        <title>Enter Mobile - IMPEX</title>
      </Head>
      <main className="landing-wrap">
        <div className="landing-card">
          <Link href="/" className="landing-back">← Back</Link>
          <h1>Enter Mobile Number</h1>
          <p className="landing-sub">
            Please enter your mobile number to proceed with your complaint or service request.
          </p>

          <form onSubmit={handleSubmit}>
            <label>Mobile Number</label>
            <input 
              value={mobile} 
              placeholder="05XXXXXXXX" 
              inputMode="tel"
              onChange={(e) => setMobile(e.target.value)} 
              required
            />
            <button 
              type="submit" 
              className="landing-btn landing-primary" 
              disabled={!mobile}
              style={{ marginTop: '20px' }}
            >
              Continue
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
