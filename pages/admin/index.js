import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function AdminHub() {
  const router = useRouter();

  useEffect(() => {
    const sessionid = sessionStorage.getItem('sessionid');
    if (!sessionid) {
      router.push('/admin/login');
    }
  }, [router]);

  function logout() {
    sessionStorage.clear();
    router.push('/admin/login');
  }

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', paddingTop: '4rem' }}>
      <Head>
        <title>Impex - Admin Hub</title>
      </Head>
      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', textAlign: 'left', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Admin Hub
        </h1>
        <button className="btn btn-secondary" onClick={logout} style={{ width: 'auto', padding: '0.5rem 1.5rem', borderRadius: '8px' }}>Log out</button>
      </div>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Welcome to the Admin Hub</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Please select a dashboard to manage.</p>
        
        <Link href="/admin/complaints" className="btn btn-primary" style={{ padding: '1rem', fontSize: '1.1rem', textDecoration: 'none', display: 'block' }}>
          Complaints Dashboard
        </Link>
        <Link href="/admin/feedback" className="btn btn-secondary" style={{ padding: '1rem', fontSize: '1.1rem', textDecoration: 'none', display: 'block' }}>
          Feedback Dashboard
        </Link>
      </div>
    </div>
  );
}
