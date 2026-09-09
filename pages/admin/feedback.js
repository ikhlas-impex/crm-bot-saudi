import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ComplaintText, { batchTranslate } from '../../components/ComplaintText';

export default function FeedbackDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const [feedback, setFeedback] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL, FLAGGED
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFeedbackDetails, setSelectedFeedbackDetails] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState('');

  // Advanced Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Close filter popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest('.filter-dropdown-container')) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getSessionId = () =>
    typeof window !== 'undefined' ? sessionStorage.getItem('sessionid') : null;

  async function fetchCustomerDetails(uid) {
    const sessionid = getSessionId();
    setLoadingCustomer(true);
    setCustomerError('');
    try {
      const res = await fetch('/api/admin/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionid, uid }),
      });
      const data = await res.json();
      if (!data.success) {
        setCustomerError(data.message || t('common.error'));
      } else {
        setCustomerDetails(data.customer);
        if (data.customer) {
          const texts = [];
          if (data.customer.city) texts.push(data.customer.city);
          if (data.customer.area) texts.push(data.customer.area);
          if (data.customer.customername) texts.push(data.customer.customername);
          if (data.customer.complaintdetails) texts.push(data.customer.complaintdetails);
          batchTranslate(texts);
        }
      }
    } catch (err) {
      setCustomerError(t('common.error'));
    } finally {
      setLoadingCustomer(false);
    }
  }

  const loadFeedback = useCallback(async () => {
    const sessionid = getSessionId();
    if (!sessionid) {
      router.push('/admin/login');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionid }),
      });
      const data = await res.json();
      if (!data.success) {
        if (res.status === 401) {
          sessionStorage.removeItem('sessionid');
          router.push('/admin/login');
          return;
        }
        setError(data.message || t('common.error'));
        setFeedback([]);
        return;
      }
      
      let items = data.feedback || [];
      if (filter === 'FLAGGED') {
        items = items.filter(f => f.flagged);
      }
      
      setFeedback(items);
    } catch (err) {
      console.error(err);
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [filter, router, t]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  function exportToExcel() {
    import('xlsx').then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(displayedFeedback);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Feedback');
      XLSX.writeFile(wb, `feedback-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  }

  function logout() {
    sessionStorage.clear();
    router.push('/admin/login');
  }

  // Filtering & Sorting
  const fromTime = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
  const toTime = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null;

  const displayedFeedback = feedback.filter((f) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const combined = `${f.uid || ''} ${f.q4_resolution || ''} ${f.flagreason || ''} ${f.q8_comments || ''}`.toLowerCase();
      if (!combined.includes(q)) return false;
    }
    if (fromTime || toTime) {
      const itemTime = new Date(f.submittedat).getTime();
      if (!isNaN(itemTime)) {
        if (fromTime && itemTime < fromTime) return false;
        if (toTime && itemTime > toTime) return false;
      }
    }
    return true;
  });

  displayedFeedback.sort((a, b) => {
    const timeA = new Date(a.submittedat).getTime() || 0;
    const timeB = new Date(b.submittedat).getTime() || 0;
    if (timeA !== timeB && timeA > 0 && timeB > 0) {
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    }
    return sortOrder === 'asc'
      ? (a.uid || '').localeCompare(b.uid || '', undefined, { numeric: true })
      : (b.uid || '').localeCompare(a.uid || '', undefined, { numeric: true });
  });

  let activeFilterCount = 0;
  if (dateFrom || dateTo) activeFilterCount++;
  if (sortOrder !== 'desc') activeFilterCount++;
  if (searchQuery.trim()) activeFilterCount++;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <Head>
        <title>{`Impex - ${t('admin.feedbackDashboard')}`}</title>
      </Head>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', textAlign: 'start', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {t('admin.feedbackDashboard')}
        </h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/admin/complaints" className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1.5rem', textDecoration: 'none' }}>
            {t('admin.complaintsDashboard')}
          </Link>
          <Link href="/admin/feedback" className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1.5rem', textDecoration: 'none' }}>
            {t('admin.feedbackDashboard')}
          </Link>
          <LanguageSwitcher />
          <button className="btn btn-secondary" onClick={logout} style={{ width: 'auto', padding: '0.5rem 1.5rem', borderRadius: '8px' }}>{t('common.logout')}</button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button 
          className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={() => setFilter('ALL')}
        >
          {t('admin.allFeedback')}
        </button>
        <button 
          className={`btn ${filter === 'FLAGGED' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={() => setFilter('FLAGGED')}
        >
          {t('admin.flaggedFeedback')}
        </button>

        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 0.25rem' }} />

        {/* Filter Popover Button */}
        <div className="filter-dropdown-container">
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            <span>{t('admin.filterBtn')}</span>
            {activeFilterCount > 0 && <span className="filter-active-badge">{activeFilterCount}</span>}
          </button>

          {isFilterOpen && (
            <div className="filter-popover" onClick={(e) => e.stopPropagation()}>
              <div className="filter-popover-header">
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t('admin.filterOptions')}</span>
                <button 
                  type="button" 
                  className="btn-clear-filters" 
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setSortOrder('desc');
                    setSearchQuery('');
                  }}
                >
                  {t('admin.clearAll')}
                </button>
              </div>

              <div className="filter-group">
                <label className="filter-label">{t('admin.dateRange')}</label>
                <div className="date-range-grid">
                  <div>
                    <span className="filter-sublabel">{t('admin.fromDate')}</span>
                    <input 
                      type="date" 
                      value={dateFrom} 
                      onChange={(e) => setDateFrom(e.target.value)} 
                      onClick={(e) => { try { if (e.target.showPicker) e.target.showPicker(); } catch (err) {} }}
                    />
                  </div>
                  <div>
                    <span className="filter-sublabel">{t('admin.toDate')}</span>
                    <input 
                      type="date" 
                      value={dateTo} 
                      onChange={(e) => setDateTo(e.target.value)} 
                      onClick={(e) => { try { if (e.target.showPicker) e.target.showPicker(); } catch (err) {} }}
                    />
                  </div>
                </div>
              </div>

              <div className="filter-group">
                <label className="filter-label">{t('admin.sortOrder')}</label>
                <select 
                  value={sortOrder} 
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <option value="desc">{t('admin.sortDesc')}</option>
                  <option value="asc">{t('admin.sortAsc')}</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Search Field */}
        <input 
          type="text" 
          placeholder={t('admin.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            fontSize: '0.875rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'rgba(15, 23, 42, 0.6)',
            color: 'white',
            width: '200px'
          }}
        />
        
        <div style={{ flex: 1 }} />
        
        <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={loadFeedback}>
          {t('common.refresh')}
        </button>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'linear-gradient(to right, #10b981, #059669)', border: 'none', color: 'white' }} onClick={exportToExcel} disabled={displayedFeedback.length === 0}>
          {t('common.exportToExcel')}
        </button>
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" style={{width: '40px', height: '40px'}}/></div>}
      {error && <div className="glass-panel" style={{ padding: '1rem', color: 'var(--error-color)', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>{error}</div>}

      <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start', minWidth: '1000px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('admin.colUid')}</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('admin.colDate')}</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('admin.colScore')}</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('admin.colResolution')}</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('admin.colStatus')}</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('admin.colReason')}</th>
            </tr>
          </thead>

          <tbody>
            {displayedFeedback.map((f, idx) => (
              <tr key={f.uid} style={{ borderBottom: idx === displayedFeedback.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#a5b4fc', fontSize: '0.875rem' }}>
                  <button 
                    onClick={() => setSelectedFeedbackDetails(f)}
                    style={{ background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {f.uid}
                  </button>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{new Date(f.submittedat).toLocaleString()}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 500, color: Number(f.q6_overall_experience) <= 5 ? '#ef4444' : '#10b981' }}>
                    {f.q6_overall_experience}/10
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ color: f.q4_resolution === 'Not Resolved' ? '#ef4444' : f.q4_resolution === 'Partially Resolved' ? '#f59e0b' : 'var(--text-primary)' }}>
                    {f.q4_resolution}
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  {f.flagged ? (
                    <span className="badge badge-warning" style={{ fontSize: '0.65rem', background: '#ef4444' }}>FLAGGED</span>
                  ) : (
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>OK</span>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.875rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.flagreason}>
                    {f.flagreason || '-'}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && displayedFeedback.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>No feedback found matching this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedFeedbackDetails && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => { setSelectedFeedbackDetails(null); setCustomerDetails(null); setCustomerError(''); }}>
          <div className="glass-panel" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                  {customerDetails ? 'Customer Profile' : 'Feedback Details'}: {selectedFeedbackDetails.uid}
                </h2>
                {!customerDetails ? (
                  <button 
                    onClick={() => fetchCustomerDetails(selectedFeedbackDetails.uid)}
                    style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', transition: 'opacity 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                    disabled={loadingCustomer}
                  >
                    {loadingCustomer ? 'Loading...' : 'View Customer Profile'}
                  </button>
                ) : (
                  <button 
                    onClick={() => setCustomerDetails(null)}
                    style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', transition: 'opacity 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    ← Back to Feedback
                  </button>
                )}
              </div>
              <button 
                onClick={() => { setSelectedFeedbackDetails(null); setCustomerDetails(null); setCustomerError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', padding: 0 }}
              >
                &times;
              </button>
            </div>
            
            {customerError && <div style={{ color: 'var(--error-color)', marginBottom: '1rem' }}>{customerError}</div>}

            {!customerDetails ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                  <div>
                    <h3 style={{ color: '#a5b4fc', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Scores (out of 10)</h3>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '180px', display: 'inline-block' }}>Technician Behaviour:</strong> {selectedFeedbackDetails.q1_technician_behaviour}</p>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '180px', display: 'inline-block' }}>Technician Punctuality:</strong> {selectedFeedbackDetails.q2_technician_punctuality}</p>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '180px', display: 'inline-block' }}>Service Quality:</strong> {selectedFeedbackDetails.q3_service_quality}</p>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '180px', display: 'inline-block' }}>Response Time:</strong> {selectedFeedbackDetails.q5_response_time}</p>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '180px', display: 'inline-block' }}>Product Satisfaction:</strong> {selectedFeedbackDetails.q7_product_satisfaction}</p>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '180px', display: 'inline-block' }}>Recommend Impex:</strong> {selectedFeedbackDetails.q9_recommendation}</p>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.875rem', fontWeight: 'bold' }}><strong style={{ color: 'var(--text-secondary)', width: '180px', display: 'inline-block' }}>Overall Experience:</strong> {selectedFeedbackDetails.q6_overall_experience}</p>
                  </div>
                  
                  <div>
                    <h3 style={{ color: '#a5b4fc', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Resolution</h3>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Status:</strong> {selectedFeedbackDetails.q4_resolution}</p>
                    {selectedFeedbackDetails.q4_comment && (
                      <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Pending Issue:</strong> {selectedFeedbackDetails.q4_comment}</p>
                    )}
                    
                    <h3 style={{ color: '#a5b4fc', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>Comments</h3>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{selectedFeedbackDetails.q8_comments}</p>
                  </div>
                </div>
                
                {selectedFeedbackDetails.flagged && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#ef4444' }}>Flag Reason</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>{selectedFeedbackDetails.flagreason}</p>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div>
                  <h3 style={{ color: '#a5b4fc', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Contact Info</h3>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Name:</strong> {customerDetails.customername}</p>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Phone:</strong> {customerDetails.phone}</p>
                  {customerDetails.altmobile && <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Alt Phone:</strong> {customerDetails.altmobile}</p>}
                  
                  <h3 style={{ color: '#a5b4fc', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>Location</h3>
                  <div style={{ margin: '0.5rem 0', fontSize: '0.875rem', display: 'flex' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', flexShrink: 0 }}>Address:</strong> <div style={{ flex: 1 }}>{customerDetails.address || 'N/A'}</div></div>
                  <div style={{ margin: '0.5rem 0', fontSize: '0.875rem', display: 'flex' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', flexShrink: 0 }}>City:</strong> <div style={{ flex: 1 }}>{customerDetails.city ? <ComplaintText text={customerDetails.city} /> : 'N/A'}</div></div>
                  <div style={{ margin: '0.5rem 0', fontSize: '0.875rem', display: 'flex' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', flexShrink: 0 }}>Area:</strong> <div style={{ flex: 1 }}>{customerDetails.area ? <ComplaintText text={customerDetails.area} /> : 'N/A'}</div></div>
                </div>
                
                <div>
                  <h3 style={{ color: '#a5b4fc', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Product Info</h3>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Group:</strong> {customerDetails.productgroup}</p>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Model:</strong> {customerDetails.model}</p>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Warranty:</strong> {customerDetails.warrantystatus}</p>
                  
                  <h3 style={{ color: '#a5b4fc', fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>Original Complaint</h3>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Status:</strong> {customerDetails.status}</p>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}><strong style={{ color: 'var(--text-secondary)', width: '120px', display: 'inline-block' }}>Service Centre:</strong> {customerDetails.servicecentre}</p>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.875rem', marginTop: '1rem' }}><strong style={{ color: 'var(--text-secondary)' }}>Complaint Details:</strong><br/><br/><span style={{ whiteSpace: 'pre-wrap', display: 'block', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>{customerDetails.complaintdetails}</span></p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
