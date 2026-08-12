import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

const N8N_BASE = 'https://n8n.srv1623198.hstgr.cloud/webhook';

/**
 * n8n-based version. Login (pages/admin/login.js -> /api/admin/login) stays
 * self-contained and writes sessions into CUSTOMER_SHEET's Sessions tab.
 * This page then reads/acts on complaints via the n8n workflows
 * impex-complaints and impex-payment-verify, both of which now read
 * Sessions from that same CUSTOMER_SHEET - that's the fix from last message.
 *
 * pages/api/admin/complaints.js and pages/api/admin/verify-payment.js are
 * no longer called by this page. Safe to leave them in the repo unused, or
 * delete them - your call, they don't conflict with anything.
 */
export default function ComplaintsPage() {
  const router = useRouter();
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState('PENDING_PAYMENT_VERIFICATION');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actioningUid, setActioningUid] = useState(null);

  const getSessionId = () =>
    typeof window !== 'undefined' ? sessionStorage.getItem('sessionid') : null;

  const loadComplaints = useCallback(async () => {
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
        body: JSON.stringify({
          sessionid,
          statusFilter: filter === 'ALL' ? '' : filter,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        // Both "Invalid session." and "Session expired." land here
        sessionStorage.removeItem('sessionid');
        router.push('/admin/login');
        return;
      }
      setComplaints(data.complaints || []);
    } catch (err) {
      console.error(err);
      setError('Network error loading complaints');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  async function handleVerify(uid, action) {
    if (action === 'reject' && !window.confirm(`Reject payment proof for ${uid}?`)) return;
    setActioningUid(uid);
    try {
      const res = await fetch(`${N8N_BASE}/impex-payment-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionid: getSessionId(), uid, action }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Action failed');
        return;
      }
      await loadComplaints();
    } catch (err) {
      console.error(err);
      alert('Network error - action may not have completed');
    } finally {
      setActioningUid(null);
    }
  }

  function exportToExcel() {
    import('xlsx').then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(complaints);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Complaints');
      XLSX.writeFile(wb, `complaints-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  }

  function logout() {
    sessionStorage.clear();
    router.push('/admin/login');
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Complaints</h2>
        <button onClick={logout}>Log out</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setFilter('PENDING_PAYMENT_VERIFICATION')} disabled={filter === 'PENDING_PAYMENT_VERIFICATION'}>
          Pending Payment Verification
        </button>
        <button onClick={() => setFilter('ALL')} disabled={filter === 'ALL'}>
          All Complaints
        </button>
        <button onClick={loadComplaints}>Refresh</button>
        <button onClick={exportToExcel} disabled={complaints.length === 0}>
          Export to Excel
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>UID</th><th>Date</th><th>Customer</th><th>Phone</th>
            <th>Product</th><th>Model</th><th>Warranty</th><th>Charge (SAR)</th>
            <th>Payment Status</th><th>Status</th><th>Service Centre</th>
            <th>Proof</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map((c) => (
            <tr key={c.uid || `${c.phone}-${c.createdat}`}>
              <td>{c.uid || '(cancelled - no UID)'}</td>
              <td>{c.date}</td>
              <td>{c.customername}</td>
              <td>{c.phone}</td>
              <td>{c.productgroup}</td>
              <td>{c.model}</td>
              <td>{c.warrantystatus}</td>
              <td>{c.chargeamount}</td>
              <td>{c.paymentstatus}</td>
              <td>{c.status}</td>
              <td>{c.servicecentre}</td>
              <td>
                {c.paymentproofimg ? (
                  <a href={c.paymentproofimg} target="_blank" rel="noreferrer">
                    <img src={c.paymentproofimg} alt="payment proof" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4 }} />
                  </a>
                ) : '-'}
              </td>
              <td>
                {c.status === 'PENDING_PAYMENT_VERIFICATION' ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button disabled={actioningUid === c.uid} onClick={() => handleVerify(c.uid, 'approve')}>
                      Approve
                    </button>
                    <button disabled={actioningUid === c.uid} onClick={() => handleVerify(c.uid, 'reject')}>
                      Reject
                    </button>
                  </div>
                ) : '-'}
              </td>
            </tr>
          ))}
          {!loading && complaints.length === 0 && (
            <tr><td colSpan={13} style={{ textAlign: 'center', padding: 16 }}>No complaints found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
