import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function FeedbackDashboard() {
  const router = useRouter();
  const [feedback, setFeedback] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL, FLAGGED
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFeedbackDetails, setSelectedFeedbackDetails] = useState(null);

  const getSessionId = () =>
    typeof window !== 'undefined' ? sessionStorage.getItem('sessionid') : null;

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
        setError(data.message || 'Failed to load feedback');
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
      setError('Network error loading feedback');
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  function exportToExcel() {
    import('xlsx').then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(feedback);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Feedback');
      XLSX.writeFile(wb, `feedback-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  }

  function logout() {
    sessionStorage.clear();
    router.push('/admin/login');
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <Head>
        <title>Impex - Admin Dashboard - Feedback</title>
      </Head>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', textAlign: 'left', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Feedback Dashboard
        </h1>
        <button className="btn btn-secondary" onClick={logout} style={{ width: 'auto', padding: '0.5rem 1.5rem', borderRadius: '8px' }}>Log out</button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <Link href="/admin/complaints" className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1.5rem', textDecoration: 'none' }}>
          Complaints
        </Link>
        <Link href="/admin/feedback" className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1.5rem', textDecoration: 'none' }}>
          Feedback
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button 
          className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={() => setFilter('ALL')}
        >
          All Feedback
        </button>
        <button 
          className={`btn ${filter === 'FLAGGED' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={() => setFilter('FLAGGED')}
        >
          Flagged Feedback
        </button>
        
        <div style={{ flex: 1 }} />
        
        <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem' }} onClick={loadFeedback}>
          Refresh ↻
        </button>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'linear-gradient(to right, #10b981, #059669)', border: 'none', color: 'white' }} onClick={exportToExcel} disabled={feedback.length === 0}>
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
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Overall Score</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Resolution</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '1.25rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {feedback.map((f, idx) => (
              <tr key={f.uid} style={{ borderBottom: idx === feedback.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
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
            {!loading && feedback.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>No feedback found matching this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedFeedbackDetails && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedFeedbackDetails(null)}>
          <div className="glass-panel" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedFeedbackDetails(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              &times;
            </button>
            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', color: 'var(--text-primary)' }}>Feedback Details: {selectedFeedbackDetails.uid}</h2>
            
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
          </div>
        </div>
      )}
    </div>
  );
}
