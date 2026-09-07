import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import ComplaintText, { batchTranslate } from '../../components/ComplaintText';
import { useLanguage } from '@/lib/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const N8N_BASE = 'https://n8n.srv1623198.hstgr.cloud/webhook';

// Client-side SWR cache store (stale-while-revalidate)
const complaintsCache = new Map();

export default function ComplaintsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState('PENDING_PAYMENT_VERIFICATION');
  const [loading, setLoading] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [error, setError] = useState('');
  const [actioningUid, setActioningUid] = useState(null);
  const [crossingUid, setCrossingUid] = useState(null);
  const [remarksDraft, setRemarksDraft] = useState('');
  const [selectedProofsComplaint, setSelectedProofsComplaint] = useState(null);
  const [selectedComplaintDetails, setSelectedComplaintDetails] = useState(null);

  // Pagination state (20 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const getSessionId = () =>
    typeof window !== 'undefined' ? sessionStorage.getItem('sessionid') : null;

  // Trigger batch translation for all loaded complaints in 1 single HTTP request
  const triggerBatchTranslation = (items) => {
    if (!Array.isArray(items)) return;
    const allTexts = [];
    items.forEach((c) => {
      if (c.complaintdetails) allTexts.push(c.complaintdetails);
      if (c.customername) allTexts.push(c.customername);
    });
    batchTranslate(allTexts);
  };

  const loadComplaints = useCallback(async (isManualRefresh = false) => {
    const sessionid = getSessionId();
    if (!sessionid) {
      router.push('/admin/login');
      return;
    }

    // 1. Instant Cache Load (SWR pattern: show cached data instantly)
    const cacheKey = filter;
    const cached = complaintsCache.get(cacheKey);
    if (cached && !isManualRefresh) {
      setComplaints(cached);
      triggerBatchTranslation(cached);
      setLoading(false);
      setIsRevalidating(true);
    } else {
      setLoading(true);
      setIsRevalidating(false);
    }

    setError('');
    
    try {
      const body = { sessionid };
      if (filter === 'PENDING_REVIEW') {
        body.reviewStatusFilter = 'PENDING';
      } else if (filter === 'FOLLOW_UP') {
        body.reviewStatusFilter = 'NOT_CHECKED';
      } else {
        body.statusFilter = filter === 'ALL' ? '' : filter;
      }

      const res = await fetch(`${N8N_BASE}/impex-complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        if (res.status === 401 || data.message?.toLowerCase().includes('session')) {
          sessionStorage.removeItem('sessionid');
          router.push('/admin/login');
          return;
        }
        setError(data.message || t('common.error'));
        if (!cached) setComplaints([]);
        return;
      }
      
      const newComplaints = data.complaints || [];
      complaintsCache.set(cacheKey, newComplaints);
      setComplaints(newComplaints);
      triggerBatchTranslation(newComplaints);
      
      // Auto-scroll logic for follow-up
      if (filter === 'FOLLOW_UP' && router.query.uid) {
        setTimeout(() => {
          const el = document.getElementById(`row-${router.query.uid}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    } catch (err) {
      console.error(err);
      if (!cached) setError(t('common.error'));
    } finally {
      setLoading(false);
      setIsRevalidating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, router.query.uid]);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 on filter change
    loadComplaints();
  }, [loadComplaints, filter]);

  useEffect(() => {
    if (router.query.uid && filter !== 'FOLLOW_UP') {
      setFilter('FOLLOW_UP');
    }
  }, [router.query.uid, filter]);

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
      if (data.warning) alert(data.warning);
      await loadComplaints(true);
    } catch (err) {
      console.error(err);
      alert('Network error - action may not have completed');
    } finally {
      setActioningUid(null);
    }
  }

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
      await loadComplaints(true);
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setActioningUid(null);
    }
  }

  function startCross(uid, existingRemarks = '') {
    setCrossingUid(uid);
    setRemarksDraft(existingRemarks);
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
      await loadComplaints(true);
    } catch (err) {
      console.error(err);
      alert('Network error');
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

  // Filter out cancelled / non-UID complaints from pending & follow-up tabs
  const activeComplaints = complaints.filter((c) => {
    if (filter === 'PENDING_REVIEW' || filter === 'PENDING_PAYMENT_VERIFICATION' || filter === 'FOLLOW_UP') {
      if (!c.uid || c.status === 'OW_CANCELLED' || (c.status && c.status.toLowerCase().includes('cancelled'))) {
        return false;
      }
    }
    return true;
  });

  // Pagination Math
  const totalPages = Math.ceil(activeComplaints.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const displayedComplaints = activeComplaints.slice(startIndex, startIndex + pageSize);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <Head>
        <title>Impex - {t('admin.complaintsDashboard')}</title>
      </Head>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', textAlign: 'start', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t('admin.complaintsDashboard')}
        </h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/admin/complaints" className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1.5rem', textDecoration: 'none' }}>
            {t('admin.complaintsDashboard')}
          </Link>
          <Link href="/admin/feedback" className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1.5rem', textDecoration: 'none' }}>
            {t('admin.feedbackDashboard')}
          </Link>
          <LanguageSwitcher />
          <button className="btn btn-secondary" onClick={logout} style={{ width: 'auto', padding: '0.5rem 1.5rem', borderRadius: '8px' }}>{t('common.logout')}</button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button 
          className={`btn ${filter === 'PENDING_PAYMENT_VERIFICATION' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={() => setFilter('PENDING_PAYMENT_VERIFICATION')}
        >
          {t('admin.pendingVerification')}
        </button>
        <button 
          className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={() => setFilter('ALL')}
        >
          {t('admin.allComplaints')}
        </button>
        <button 
          className={`btn ${filter === 'OW_CANCELLED' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={() => setFilter('OW_CANCELLED')}
        >
          {t('admin.cancelled')}
        </button>
        
        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 0.5rem' }} />
        
        <button 
          className={`btn ${filter === 'PENDING_REVIEW' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={() => setFilter('PENDING_REVIEW')}
        >
          {t('admin.pendingReview')}
        </button>
        
        <button 
          className={`btn ${filter === 'FOLLOW_UP' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={() => setFilter('FOLLOW_UP')}
        >
          {t('admin.followUp')}
        </button>
        
        <div style={{ flex: 1 }} />
        
        {isRevalidating && (
          <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} /> {t('admin.updating')}
          </span>
        )}

        <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={() => loadComplaints(true)}>
          {t('common.refresh')}
        </button>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'linear-gradient(to right, #10b981, #059669)', border: 'none', color: 'white' }} onClick={exportToExcel} disabled={complaints.length === 0}>
          {t('common.exportToExcel')}
        </button>
      </div>

      {loading && complaints.length === 0 && <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" style={{width: '40px', height: '40px'}}/></div>}
      {error && <div className="glass-panel" style={{ padding: '1rem', color: 'var(--error-color)', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>{error}</div>}

      <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start', minWidth: '1100px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('admin.colUid')}</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('admin.colDate')}</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('admin.colCustomer')}</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('admin.colProduct')}</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('admin.colStatus')}</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('admin.colComplaint')}</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('admin.colProof')}</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('admin.colReview')}</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('admin.colActions')}</th>
            </tr>
          </thead>

          <tbody>
            {displayedComplaints.map((c, idx) => (
              <tr key={c.uid || `${c.phone}-${c.createdat}`} id={`row-${c.uid}`} style={{ borderBottom: idx === displayedComplaints.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', background: (filter === 'FOLLOW_UP' && router.query.uid === c.uid) ? 'rgba(245, 158, 11, 0.1)' : 'transparent' }}>
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
                  <div style={{ fontWeight: 500 }}><ComplaintText text={c.customername} /></div>
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
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.status ? c.status.replace(/_/g, ' ') : 'N/A'}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', maxWidth: '200px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }} title={c.complaintdetails}>
                    <ComplaintText text={c.complaintdetails || 'No details'} />
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
                  {!c.uid ? (
                    <span style={{ color: '#666', fontSize: '0.75rem' }}>N/A</span>
                  ) : !c.reviewstatus ? (
                    <span style={{ color: '#999', fontSize: '0.75rem' }}>Pending</span>
                  ) : c.reviewstatus === 'CHECKED' ? (
                    <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Checked</span>
                  ) : c.reviewstatus === 'NOT_CHECKED' ? (
                    <div style={{ fontSize: '0.75rem' }}>
                      <span style={{ color: '#ef4444', fontWeight: 'bold' }}>✗ Not Checked</span>
                      {c.reviewremarks && (
                        <div style={{ marginTop: '0.25rem', color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.reviewremarks}>
                          {c.reviewremarks}
                        </div>
                      )}
                      {c.reviewedby && filter === 'FOLLOW_UP' && (
                         <div style={{ marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.65rem' }}>
                           {c.reviewedby}, {c.reviewedat ? new Date(c.reviewedat).toLocaleDateString() : ''}
                         </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: '#999', fontSize: '0.75rem' }}>{c.reviewstatus}</span>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>
                  {!c.uid ? (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic' }}>No action required</span>
                  ) : filter === 'PENDING_REVIEW' ? (
                    crossingUid === c.uid ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '180px' }}>
                        <textarea
                          placeholder="Reason for Not Checked"
                          value={remarksDraft}
                          onChange={(e) => setRemarksDraft(e.target.value)}
                          rows={2}
                          style={{ padding: '0.5rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.75rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', width: 'auto' }} disabled={actioningUid === c.uid} onClick={() => submitCross(c.uid)}>
                            {actioningUid === c.uid ? <div className="spinner" style={{margin: 0, width: '12px', height: '12px', borderWidth: '2px'}}/> : 'Confirm ✗'}
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', width: 'auto' }} onClick={() => setCrossingUid(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                        <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', width: 'auto', fontSize: '0.75rem', borderRadius: '6px' }} disabled={actioningUid === c.uid} onClick={() => markChecked(c.uid)}>
                          ✓ Checked
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', width: 'auto', fontSize: '0.75rem', borderRadius: '6px', borderColor: 'var(--error-color)', color: 'var(--error-color)' }} disabled={actioningUid === c.uid} onClick={() => startCross(c.uid)}>
                          ✗ Not Checked
                        </button>
                      </div>
                    )
                  ) : filter === 'FOLLOW_UP' ? (
                    crossingUid === c.uid ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '180px' }}>
                        <textarea
                          value={remarksDraft}
                          onChange={(e) => setRemarksDraft(e.target.value)}
                          rows={2}
                          style={{ padding: '0.5rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.75rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', width: 'auto' }} disabled={actioningUid === c.uid} onClick={() => submitCross(c.uid)}>
                            {actioningUid === c.uid ? <div className="spinner" style={{margin: 0, width: '12px', height: '12px', borderWidth: '2px'}}/> : 'Save'}
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', width: 'auto' }} onClick={() => setCrossingUid(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                        <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', width: 'auto', fontSize: '0.75rem', borderRadius: '6px' }} disabled={actioningUid === c.uid} onClick={() => markChecked(c.uid)}>
                          ✓ Resolve (Checked)
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', width: 'auto', fontSize: '0.75rem', borderRadius: '6px', borderColor: 'var(--error-color)', color: 'var(--error-color)' }} disabled={actioningUid === c.uid} onClick={() => startCross(c.uid, c.reviewremarks)}>
                          ✗ Update Reason
                        </button>
                      </div>
                    )
                  ) : c.status === 'PENDING_PAYMENT_VERIFICATION' ? (
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
                  ) : c.reviewstatus === 'NOT_CHECKED' ? (
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', width: 'auto', fontSize: '0.75rem', borderRadius: '6px', borderColor: '#f59e0b', color: '#f59e0b' }} 
                      onClick={() => setFilter('FOLLOW_UP')}
                    >
                      Follow Up
                    </button>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontStyle: 'italic' }}>No action required</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && activeComplaints.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>No complaints found matching this filter.</td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {activeComplaints.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Showing <strong style={{ color: 'white' }}>{startIndex + 1}</strong> to <strong style={{ color: 'white' }}>{Math.min(startIndex + pageSize, activeComplaints.length)}</strong> of <strong style={{ color: 'white' }}>{activeComplaints.length}</strong> complaints
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', width: 'auto' }} 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                ← Prev
              </button>
              
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0.5rem' }}>
                Page <strong style={{ color: 'white' }}>{currentPage}</strong> of <strong style={{ color: 'white' }}>{totalPages}</strong>
              </span>

              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', width: 'auto' }} 
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              >
                Next →
              </button>
            </div>
          </div>
        )}
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
                <div style={{ margin: '0.5rem 0', fontSize: '0.875rem', display: 'flex' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', flexShrink: 0 }}>Name:</strong> <div style={{ flex: 1 }}><ComplaintText text={selectedComplaintDetails.customername} /></div></div>
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
                <div style={{ margin: '0.5rem 0', fontSize: '0.875rem', marginTop: '1rem' }}><strong style={{ color: 'var(--text-secondary)' }}>Review Remarks:</strong><br/><br/><span style={{ whiteSpace: 'pre-wrap', display: 'block', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>{selectedComplaintDetails.reviewremarks || 'None'}</span></div>
              </div>
              
              <div>
                <h3 style={{ color: '#a5b4fc', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Complaint Details</h3>
                <div style={{ margin: '0.5rem 0', fontSize: '0.875rem', lineHeight: '1.5' }}>
                  <ComplaintText text={selectedComplaintDetails.complaintdetails || 'No details provided.'} />
                </div>
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
