import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useLanguage } from '@/lib/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function AdminLogin() {
  const router = useRouter();
  const { t } = useLanguage();
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
        setError(data.message || t('common.error'));
        return;
      }
      sessionStorage.setItem('sessionid', data.sessionid);
      sessionStorage.setItem('role', data.role);
      sessionStorage.setItem('servicecentre', data.servicecentre || '');
      router.push('/admin');
    } catch (err) {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <Head>
        <title>{`Impex - ${t('admin.loginTitle')}`}</title>
      </Head>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Impex Admin</h1>
          <LanguageSwitcher />
        </div>
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
            {loading ? <div className="spinner" /> : t('admin.loginBtn')}
          </button>
        </form>
      </div>
    </div>
  );
}

