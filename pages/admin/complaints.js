import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function ComplaintsPage() {
  const router = useRouter();
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState('PENDING_PAYMENT_VERIFICATION');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actioningUid, setActioningUid] = useState(null);
  const [selectedProofsComplaint, setSelectedProofsComplaint] = useState(null);
  const [selectedComplaintDetails, setSelectedComplaintDetails] = useState(null);

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
      const res = await fetch('/api/admin/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionid,
          statusFilter: filter === 'ALL' ? '' : filter,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        if (res.status === 401) {
          sessionStorage.removeItem('sessionid');
          router.push('/admin/login');
          return;
        }
        setError(data.message || 'Failed to load complaints');
        setComplaints([]);
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
      const res = await fetch('/api/admin/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionid: getSessionId(), uid, action }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Action failed');
        return;
      }
      if (data.warning) alert(data.warning);
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
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <Head>
        <title>Impex - Admin Dashboard</title>
      </Head>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', textAlign: 'left', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Complaints Dashboard
        </h1>
        <button className="btn btn-secondary" onClick={logout} style={{ width: 'auto', padding: '0.5rem 1.5rem', borderRadius: '8px' }}>Log out</button>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button 
          className={`btn ${filter === 'PENDING_PAYMENT_VERIFICATION' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={() => setFilter('PENDING_PAYMENT_VERIFICATION')}
        >
          Pending Verification
        </button>
        <button 
          className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={() => setFilter('ALL')}
        >
          All Complaints
        </button>
        <button 
          className={`btn ${filter === 'OW_CANCELLED' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={() => setFilter('OW_CANCELLED')}
        >
          Cancelled
        </button>
        
        <div style={{ flex: 1 }} />
        
        <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={loadComplaints}>
          Refresh ↻
        </button>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'linear-gradient(to right, #10b981, #059669)', border: 'none', color: 'white' }} onClick={exportToExcel} disabled={complaints.length === 0}>
          Export to Excel
        </button>
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" style={{width: '40px', height: '40px'}}/></div>}
      {error && <div className="glass-panel" style={{ padding: '1rem', color: 'var(--error-color)', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>{error}</div>}

      <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>UID</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Date</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Customer</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Product</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Complaint</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Proof</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c, idx) => (
              <tr key={c.uid || `${c.phone}-${c.createdat}`} style={{ borderBottom: idx === complaints.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#a5b4fc', fontSize: '0.875rem' }}>
                  <button 
                    onClick={() => setSelectedComplaintDetails(c)}
                    style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {c.uid || '(cancelled)'}
                  </button>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{c.date}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 500 }}>{c.customername}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{c.phone}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 500 }}>{c.productgroup}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{c.model}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span className={`badge ${c.paymentstatus === 'VERIFIED' ? 'badge-success' : c.paymentstatus === 'PENDING_VERIFICATION' ? 'badge-warning' : ''}`} style={{ fontSize: '0.65rem' }}>
                      {c.paymentstatus || 'N/A'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.status.replace(/_/g, ' ')}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.complaintdetails}>
                    {c.complaintdetails || 'No details'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {c.warrantystatus && (
                      <>
                        Warranty:{' '}
                        <span style={{ color: c.warrantystatus.toLowerCase() === 'iw' ? '#10b981' : c.warrantystatus.toLowerCase() === 'ow' ? '#ef4444' : 'inherit', fontWeight: 'bold' }}>
                          {c.warrantystatus}
                        </span>
                      </>
                    )}
                  </div>
                </td>
                <td style={{ padding: '1rem', position: 'relative' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', borderRadius: '6px' }}
                    onClick={() => setSelectedProofsComplaint(c)}
                  >
                    View Proofs
                  </button>
                </td>
                <td style={{ padding: '1rem' }}>
                  {c.status === 'PENDING_PAYMENT_VERIFICATION' ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.4rem 0.8rem', width: 'auto', fontSize: '0.75rem', borderRadius: '6px' }}
                        disabled={actioningUid === c.uid} 
                        onClick={() => handleVerify(c.uid, 'approve')}
                      >
                        {actioningUid === c.uid ? <div className="spinner" style={{margin: 0, width: '12px', height: '12px', borderWidth: '2px'}}/> : 'Approve'}
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.8rem', width: 'auto', fontSize: '0.75rem', borderRadius: '6px', borderColor: 'var(--error-color)', color: 'var(--error-color)' }}
                        disabled={actioningUid === c.uid} 
                        onClick={() => handleVerify(c.uid, 'reject')}
                      >
                        Reject
                      </button>
                    </div>
                  ) : <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic' }}>No action required</span>}
                </td>
              </tr>
            ))}
            {!loading && complaints.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>No complaints found matching this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedComplaintDetails && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedComplaintDetails(null)}>
          <div className="glass-panel" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedComplaintDetails(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              &times;
            </button>
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', color: 'var(--text-primary)' }}>Complaint Details: {selectedComplaintDetails.uid || 'N/A'}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <div>
                <h3 style={{ color: '#a5b4fc', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Customer Info</h3>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Name:</strong> {selectedComplaintDetails.customername}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Phone:</strong> {selectedComplaintDetails.phone}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Alt Mobile:</strong> {selectedComplaintDetails.altmobile || 'N/A'}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Address:</strong> {selectedComplaintDetails.address || 'N/A'}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>City/Area:</strong> {[selectedComplaintDetails.city, selectedComplaintDetails.area].filter(Boolean).join(', ') || 'N/A'}</p>
              </div>
              
              <div>
                <h3 style={{ color: '#a5b4fc', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Product Info</h3>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Group:</strong> {selectedComplaintDetails.productgroup}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Model:</strong> {selectedComplaintDetails.model}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Date of Purchase:</strong> {selectedComplaintDetails.dop || 'N/A'}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Warranty:</strong> <span style={{ color: selectedComplaintDetails.warrantystatus?.toLowerCase() === 'iw' ? '#10b981' : selectedComplaintDetails.warrantystatus?.toLowerCase() === 'ow' ? '#ef4444' : 'inherit', fontWeight: 'bold' }}>{selectedComplaintDetails.warrantystatus || 'N/A'}</span></p>
              </div>

              <div>
                <h3 style={{ color: '#a5b4fc', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Status & Action</h3>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Status:</strong> {selectedComplaintDetails.status}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Service Centre:</strong> {selectedComplaintDetails.servicecentre || 'N/A'}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Created At:</strong> {selectedComplaintDetails.createdat || 'N/A'}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Verified By:</strong> {selectedComplaintDetails.verifiedby || 'N/A'}</p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Verified At:</strong> {selectedComplaintDetails.verifiedat || 'N/A'}</p>
                {selectedComplaintDetails.cancelreason && (
                  <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--error-color)', width: '120px', display: 'inline-block' }}>Cancel Reason:</strong> {selectedComplaintDetails.cancelreason}</p>
                )}
              </div>
              
              <div>
                <h3 style={{ color: '#a5b4fc', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Complaint Details</h3>
                <p style={{ margin: '0.5rem 0', fontSize: '0.875rem', lineHeight: '1.5' }}>{selectedComplaintDetails.complaintdetails || 'No details provided.'}</p>
              </div>
            </div>
            
            <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {selectedComplaintDetails.invoiceimg && <a href={selectedComplaintDetails.invoiceimg} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>View Invoice</a>}
              {selectedComplaintDetails.modelserialimg && <a href={selectedComplaintDetails.modelserialimg} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>View Serial No Photo</a>}
              {selectedComplaintDetails.productimg && <a href={selectedComplaintDetails.productimg} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>View Product Photo</a>}
              {selectedComplaintDetails.paymentproofimg && <a href={selectedComplaintDetails.paymentproofimg} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>View Payment Proof</a>}
            </div>
          </div>
        </div>
      )}

      {selectedProofsComplaint && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} onClick={() => setSelectedProofsComplaint(null)}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '350px', padding: '1.5rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedProofsComplaint(null)}
              style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              &times;
            </button>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>Attached Proofs</h3>
            
            {selectedProofsComplaint.invoiceimg ? <a href={selectedProofsComplaint.invoiceimg} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.75rem', textAlign: 'center' }}>View Invoice</a> : <span style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '0.5rem' }}>No Invoice</span>}
            {selectedProofsComplaint.modelserialimg ? <a href={selectedProofsComplaint.modelserialimg} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.75rem', textAlign: 'center' }}>View Serial No Photo</a> : <span style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '0.5rem' }}>No Serial Photo</span>}
            {selectedProofsComplaint.productimg ? <a href={selectedProofsComplaint.productimg} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.75rem', textAlign: 'center' }}>View Product Photo</a> : <span style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '0.5rem' }}>No Product Photo</span>}
            {selectedProofsComplaint.paymentproofimg ? <a href={selectedProofsComplaint.paymentproofimg} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '0.75rem', textAlign: 'center' }}>View Payment Proof</a> : <span style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '0.5rem' }}>No Payment Proof</span>}
          </div>
        </div>
      )}
    </div>
  );
}
