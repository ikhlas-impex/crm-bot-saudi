import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

const N8N_BASE = 'https://n8n.srv1623198.hstgr.cloud/webhook';

export default function StatusPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actioningUid, setActioningUid] = useState(null);
  const [crossingUid, setCrossingUid] = useState(null);
  const [remarksDraft, setRemarksDraft] = useState('');

  const getSessionId = () =>
    typeof window !== 'undefined' ? sessionStorage.getItem('sessionid') : null;

  const load = useCallback(async () => {
    const sessionid = getSessionId();
    if (!sessionid) {
      router.push('/admin/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${N8N_BASE}/impex-complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionid, reviewStatusFilter: 'PENDING' }),
      });
      const data = await res.json();
      if (!data.success) {
        sessionStorage.removeItem('sessionid');
        router.push('/admin/login');
        return;
      }
      setItems(data.complaints || []);
    } catch (err) {
      console.error(err);
      setError('Network error loading complaints');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markChecked(uid) {
    setActioningUid(uid);
    try {
      const res = await fetch(`${N8N_BASE}/impex-review-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionid: getSessionId(), uid, action: 'check' }),
      });
      const data = await res.json();
      if (!data.success) { alert(data.message || 'Action failed'); return; }
      await load();
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setActioningUid(null);
    }
  }

  function startCross(uid) {
    setCrossingUid(uid);
    setRemarksDraft('');
  }

  async function submitCross(uid) {
    if (!remarksDraft.trim()) {
      alert('Please enter a reason before marking Not Checked.');
      return;
    }
    setActioningUid(uid);
    try {
      const res = await fetch(`${N8N_BASE}/impex-review-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionid: getSessionId(), uid, action: 'cross', remarks: remarksDraft.trim() }),
      });
      const data = await res.json();
      if (!data.success) { alert(data.message || 'Action failed'); return; }
      setCrossingUid(null);
      await load();
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setActioningUid(null);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Status — Pending Review</h2>
      <p style={{ color: '#666' }}>
        Complaints not yet reviewed. Mark Checked if everything's in order,
        or Cross with a reason to send it to Follow-up.
      </p>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>UID</th><th>Date</th><th>Customer</th><th>Product</th>
            <th>Status</th><th>Service Centre</th><th>Review</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.uid}>
              <td>{c.uid}</td>
              <td>{c.date}</td>
              <td>{c.customername}</td>
              <td>{c.productgroup} {c.model ? `(${c.model})` : ''}</td>
              <td>{c.status}</td>
              <td>{c.servicecentre}</td>
              <td>
                {crossingUid === c.uid ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 260 }}>
                    <textarea
                      placeholder="Reason for Not Checked"
                      value={remarksDraft}
                      onChange={(e) => setRemarksDraft(e.target.value)}
                      rows={2}
                      style={{ padding: 6 }}
                    />
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button disabled={actioningUid === c.uid} onClick={() => submitCross(c.uid)}>
                        Confirm ✗
                      </button>
                      <button onClick={() => setCrossingUid(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button disabled={actioningUid === c.uid} onClick={() => markChecked(c.uid)}>
                      ✓ Checked
                    </button>
                    <button disabled={actioningUid === c.uid} onClick={() => startCross(c.uid)}>
                      ✗ Not Checked
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {!loading && items.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 16 }}>Nothing pending review.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
