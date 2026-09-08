import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

const N8N_BASE = 'https://n8n.srv1623198.hstgr.cloud/webhook';

export default function FollowUpPage() {
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
        body: JSON.stringify({ sessionid, reviewStatusFilter: 'NOT_CHECKED' }),
      });
      const data = await res.json();
      if (!data.success) {
        sessionStorage.removeItem('sessionid');
        router.push('/admin/login');
        return;
      }
      setItems(data.complaints || []);

      // If arriving from the "Follow Up" button on All Complaints with a
      // specific uid, scroll to it once the list has loaded.
      if (router.query.uid) {
        setTimeout(() => {
          const el = document.getElementById(`row-${router.query.uid}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    } catch (err) {
      console.error(err);
      setError('Network error loading complaints');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.uid]);

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
      await load(); // resolved - drops out of this list
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setActioningUid(null);
    }
  }

  function startCross(uid, existingRemarks) {
    setCrossingUid(uid);
    setRemarksDraft(existingRemarks || '');
  }

  async function submitCross(uid) {
    if (!remarksDraft.trim()) {
      alert('Please enter a reason.');
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
      await load(); // stays in this list with updated remarks/timestamp
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setActioningUid(null);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Follow-up</h2>
      <p style={{ color: '#666' }}>
        Complaints marked Not Checked. Review the remarks, take action, then
        mark Checked to resolve - or update the remarks and leave it here
        for another round.
      </p>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {items.map((c) => (
        <div
          key={c.uid}
          id={`row-${c.uid}`}
          style={{
            border: '1px solid #444',
            borderRadius: 6,
            padding: 16,
            marginBottom: 12,
            background: router.query.uid === c.uid ? '#2a2a1a' : 'transparent',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{c.uid}</strong>
            <span>{c.date}</span>
          </div>
          <p>{c.customername} — {c.productgroup} {c.model ? `(${c.model})` : ''}</p>
          <p>Status: {c.status} | Service Centre: {c.servicecentre}</p>
          <p style={{ background: '#3a1f1f', padding: 8, borderRadius: 4 }}>
            <strong>Reason:</strong> {c.reviewremarks || '-'}
            {c.reviewedby && (
              <span style={{ display: 'block', fontSize: 12, color: '#999' }}>
                — {c.reviewedby}, {c.reviewedat}
              </span>
            )}
          </p>

          {crossingUid === c.uid ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 400 }}>
              <textarea
                value={remarksDraft}
                onChange={(e) => setRemarksDraft(e.target.value)}
                rows={2}
                style={{ padding: 6 }}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button disabled={actioningUid === c.uid} onClick={() => submitCross(c.uid)}>
                  Save & Keep in Follow-up
                </button>
                <button onClick={() => setCrossingUid(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              <button disabled={actioningUid === c.uid} onClick={() => markChecked(c.uid)}>
                ✓ Resolve (Checked)
              </button>
              <button disabled={actioningUid === c.uid} onClick={() => startCross(c.uid, c.reviewremarks)}>
                ✗ Update Reason
              </button>
            </div>
          )}
        </div>
      ))}

      {!loading && items.length === 0 && <p>Nothing in follow-up right now.</p>}
    </div>
  );
}
