import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Login failed');
        return;
      }
      sessionStorage.setItem('sessionid', data.sessionid);
      sessionStorage.setItem('role', data.role);
      sessionStorage.setItem('servicecentre', data.servicecentre || '');
      router.push('/admin');
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <Head>
        <title>Impex - Admin Login</title>
      </Head>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '2rem' }}>Impex Admin</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          {error && <p style={{ color: 'var(--error-color)', fontSize: '0.875rem' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? <div className="spinner" /> : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
