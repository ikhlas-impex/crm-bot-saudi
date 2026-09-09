import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useLanguage } from '@/lib/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const MAX_UID_ATTEMPTS = 3;

const initialAnswers = {
  q1_technician_behaviour: '',
  q2_technician_punctuality: '',
  q3_service_quality: '',
  q4_resolution: '',
  q4_comment: '',
  q5_response_time: '',
  q6_overall_experience: '',
  q7_product_satisfaction: '',
  q8_comments: '',
  q9_recommendation: '',
};

const RatingBubble = ({ value, selectedValue, onClick }) => {
  const isSelected = value === selectedValue;
  // Calculate hue from 0 (red) to 120 (green) based on 1-10 scale
  const hue = (value - 1) * (120 / 9);
  const selectedBg = `hsl(${hue}, 85%, 55%)`;
  const selectedShadow = `0 4px 15px hsla(${hue}, 85%, 55%, 0.4)`;

  return (
    <button
      type="button"
      onClick={() => onClick(value.toString())}
      style={{
        flex: 1,
        aspectRatio: '1 / 1',
        maxWidth: '45px',
        minWidth: '24px',
        borderRadius: '50%',
        border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.1)',
        background: isSelected ? selectedBg : 'rgba(255,255,255,0.02)',
        color: isSelected ? '#fff' : '#94a3b8',
        fontSize: 'clamp(0.7rem, 2.5vw, 1rem)',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isSelected ? selectedShadow : 'none',
        transform: isSelected ? 'scale(1.15) translateY(-2px)' : 'scale(1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      {value}
    </button>
  );
};

const RatingInputRow = ({ label, value, onChange }) => {
  const { t } = useLanguage();
  return (
    <div style={{ marginBottom: '2.5rem', animation: 'fadeInUp 0.5s ease-out' }}>
      <label style={{ display: 'block', marginBottom: '1.25rem', fontSize: '1.15rem', fontWeight: 500, color: '#f8fafc' }}>{label}</label>
      <div style={{ display: 'flex', gap: '1.5%', justifyContent: 'space-between', width: '100%', flexWrap: 'nowrap' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <RatingBubble key={n} value={n} selectedValue={Number(value)} onClick={onChange} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>
        <span>{t('feedback.veryPoor')}</span>
        <span>{t('feedback.excellent')}</span>
      </div>
    </div>
  );
};

const ResolutionCards = ({ value, onChange }) => {
  const { t } = useLanguage();
  const optionsMap = [
    { key: 'Completely Resolved', label: t('feedback.resCompletely') },
    { key: 'Partially Resolved', label: t('feedback.resPartially') },
    { key: 'Not Resolved', label: t('feedback.resNot') },
  ];

  return (
    <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', animation: 'fadeInUp 0.5s ease-out' }}>
      {optionsMap.map(({ key: optKey, label }) => {
        const isSelected = value === optKey;
        const baseColor = optKey === 'Not Resolved' ? '#ef4444' : optKey === 'Partially Resolved' ? '#f59e0b' : '#10b981';
        return (
          <button
            key={optKey}
            type="button"
            onClick={() => onChange(optKey)}
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              border: isSelected ? `2px solid ${baseColor}` : '2px solid rgba(255,255,255,0.05)',
              background: isSelected ? `${baseColor}15` : 'rgba(255,255,255,0.02)',
              color: isSelected ? baseColor : '#cbd5e1',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'start',
              boxShadow: isSelected ? `0 4px 15px ${baseColor}33` : 'none',
              transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default function FeedbackPage() {
  const router = useRouter();
  const { t, isRtl } = useLanguage();
  const [lookupState, setLookupState] = useState('idle'); // 'idle', 'loading', 'pick', 'none'
  const [pickList, setPickList] = useState([]);

  const [wizardStep, setWizardStep] = useState(0); // 0: UID, 1: Tech, 2: Service, 3: Overall, 4: Done, -1: Already
  const [uid, setUid] = useState('');
  const [uidInput, setUidInput] = useState('');
  const [uidError, setUidError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [checking, setChecking] = useState(false);
  const [answers, setAnswers] = useState(initialAnswers);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Auto-lookup by phone if Interakt handed one off in the URL
  useEffect(() => {
    if (!router.isReady) return;
    const phone = router.query.phone;
    if (!phone) {
      setLookupState('idle');
      return;
    }
    setLookupState('loading');
    (async () => {
      try {
        const res = await fetch('/api/feedback/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });
        const data = await res.json();
        if (!data.success || !data.complaints || data.complaints.length === 0) {
          setLookupState('none');
          return;
        }
        if (data.complaints.length === 1) {
          setUid(data.complaints[0].uid);
          setLookupState('idle');
          setWizardStep(1); // Skip UID entry
          return;
        }
        setPickList(data.complaints);
        setLookupState('pick');
      } catch (err) {
        console.error(err);
        setLookupState('idle'); // fall back to manual entry
      }
    })();
  }, [router.isReady, router.query.phone]);

  function selectFromPickList(pickedUid) {
    setUid(pickedUid);
    setLookupState('idle');
    setWizardStep(1);
  }

  // Styles injection for animations
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes checkmark {
        0% { stroke-dashoffset: 100; opacity: 0; }
        100% { stroke-dashoffset: 0; opacity: 1; }
      }
      .wizard-card {
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 2.5rem;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .nav-btn {
        padding: 0.75rem 2rem;
        border-radius: 10px;
        font-weight: 600;
        transition: all 0.2s;
        border: none;
        cursor: pointer;
      }
      .nav-btn-primary {
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        color: white;
      }
      .nav-btn-primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(139, 92, 246, 0.3);
      }
      .nav-btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .nav-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
      }
      .nav-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      .textarea-premium {
        width: 100%;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        padding: 1rem;
        color: #f8fafc;
        font-family: inherit;
        resize: vertical;
        transition: border-color 0.2s;
      }
      .textarea-premium:focus {
        outline: none;
        border-color: #8b5cf6;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  async function handleUidSubmit(e) {
    e.preventDefault();
    setUidError('');
    setChecking(true);
    try {
      const res = await fetch('/api/feedback/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: uidInput.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        setUidError(t('common.error'));
        return;
      }
      if (!data.valid) {
        const next = attempts + 1;
        setAttempts(next);
        if (next >= MAX_UID_ATTEMPTS) {
          setUidError(t('common.contactSupport'));
        } else {
          setUidError(data.message);
        }
        return;
      }
      if (data.alreadySubmitted) {
        setUid(uidInput.trim());
        setWizardStep(-1);
        return;
      }
      setUid(uidInput.trim());
      setWizardStep(1);
    } catch (err) {
      console.error(err);
      setUidError(t('common.error'));
    } finally {
      setChecking(false);
    }
  }

  function updateAnswer(key, value) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  async function handleFormSubmit() {
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, ...answers }),
      });
      const data = await res.json();
      if (!data.success) {
        setSubmitError(data.message || t('common.error'));
        return;
      }
      setWizardStep(4);
    } catch (err) {
      console.error(err);
      setSubmitError(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  const needsResolutionComment = answers.q4_resolution === 'Partially Resolved' || answers.q4_resolution === 'Not Resolved';
  const lowOverallScore = answers.q6_overall_experience !== '' && Number(answers.q6_overall_experience) <= 5;
  const attemptsExhausted = attempts >= MAX_UID_ATTEMPTS;

  // Validation per step
  const canProceedStep1 = answers.q1_technician_behaviour && answers.q2_technician_punctuality;
  const canProceedStep2 = answers.q3_service_quality && answers.q4_resolution && answers.q5_response_time && (!needsResolutionComment || answers.q4_comment.trim() !== '');
  const canProceedStep3 = answers.q6_overall_experience && answers.q7_product_satisfaction && answers.q9_recommendation && (!lowOverallScore || answers.q8_comments.trim() !== '');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', fontFamily: "'Outfit', sans-serif" }}>
      <Head>
        <title>{`Impex - ${t('feedback.title')}`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div style={{ width: '100%', maxWidth: '640px' }}>
        
        <div className="page-top-panel">
          <h1 style={{ fontSize: '1.75rem', margin: 0, background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {t('feedback.title')}
          </h1>
          <LanguageSwitcher />
        </div>

        {wizardStep > 0 && wizardStep < 4 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', animation: 'fadeInUp 0.6s' }}>
            {[1, 2, 3].map(step => (
              <div key={step} style={{ flex: 1, height: '4px', borderRadius: '2px', background: step <= wizardStep ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)', transition: 'background 0.4s' }} />
            ))}
          </div>
        )}

        <div className="wizard-card">
          
          {lookupState === 'loading' && (
            <div style={{ textAlign: 'center', padding: '3rem 0', animation: 'fadeInUp 0.5s' }}>
              <div style={{ width: '50px', height: '50px', margin: '0 auto 1.5rem', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <h2 style={{ color: '#f8fafc', margin: '0 0 1rem 0' }}>{t('feedback.lookingUp')}</h2>
              <p style={{ color: '#94a3b8' }}>{t('feedback.lookingUpWait')}</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {lookupState === 'none' && (
            <div style={{ textAlign: 'center', padding: '2rem 0', animation: 'fadeInUp 0.5s' }}>
              <h2 style={{ fontSize: '2rem', margin: '0 0 1rem 0', color: '#f8fafc' }}>{t('feedback.noRequestsTitle')}</h2>
              <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                {t('feedback.noRequestsMsg')}
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => setLookupState('idle')} className="nav-btn nav-btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
                  {t('feedback.enterManually')}
                </button>
                <a
                  href="https://wa.me/966541463161"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-btn"
                  style={{ padding: '1rem 2rem', fontSize: '1.1rem', background: '#25D366', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  💬 {t('common.returnToWhatsapp')}
                </a>
              </div>
            </div>
          )}

          {lookupState === 'pick' && (
            <div style={{ animation: 'fadeInUp 0.5s' }}>
              <h2 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0', color: '#f8fafc' }}>{t('feedback.selectRequestTitle')}</h2>
              <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>{t('feedback.selectRequestMsg')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {pickList.map((c) => (
                  <button
                    key={c.uid}
                    onClick={() => selectFromPickList(c.uid)}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.03)',
                      color: '#f8fafc',
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'start',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <strong style={{ color: '#60a5fa', display: 'block', marginBottom: '0.25rem' }}>{c.uid}</strong>
                    <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{t(`productCategories.${c.productgroup}`) || c.productgroup} {c.model ? `(${c.model})` : ''} — {c.date}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 0: UID ENTRY */}
          {lookupState === 'idle' && wizardStep === 0 && (
            <form onSubmit={handleUidSubmit}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {t('feedback.title')}
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: '1.5' }}>
                  {t('feedback.subtitle')}
                </p>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e2e8f0', fontWeight: 500 }}>{t('feedback.uidInputLabel')}</label>
                <input
                  type="text"
                  value={uidInput}
                  onChange={(e) => setUidInput(e.target.value)}
                  placeholder={t('feedback.uidPlaceholder')}
                  required
                  disabled={attemptsExhausted}
                  style={{ width: '100%', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '1.1rem' }}
                />
                {uidError && <p style={{ color: '#ef4444', marginTop: '0.5rem', fontSize: '0.9rem', animation: 'fadeInUp 0.3s' }}>{uidError}</p>}
              </div>

              <button type="submit" className="nav-btn nav-btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} disabled={checking || attemptsExhausted}>
                {checking ? t('feedback.verifying') : t('feedback.beginBtn')}
              </button>

              {attemptsExhausted && (
                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                  <a
                    href="https://wa.me/966541463161"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nav-btn"
                    style={{ padding: '0.85rem 1.5rem', fontSize: '1rem', background: '#25D366', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    💬 {t('common.contactSupport')}
                  </a>
                </div>
              )}
            </form>
          )}

          {/* ALREADY SUBMITTED */}
          {lookupState === 'idle' && wizardStep === -1 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                <span style={{ fontSize: '2.5rem' }}>✓</span>
              </div>
              <h2 style={{ fontSize: '2rem', margin: '0 0 1rem 0', color: '#f8fafc' }}>{t('feedback.alreadySubmittedTitle')}</h2>
              <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                {t('feedback.alreadySubmittedMsg', { uid })}
              </p>
              <a
                href="https://wa.me/966541463161"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-btn"
                style={{ padding: '1rem 2rem', fontSize: '1.1rem', background: '#25D366', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                💬 {t('common.returnToWhatsapp')}
              </a>
            </div>
          )}

          {/* STEP 1: TECHNICIAN */}
          {lookupState === 'idle' && wizardStep === 1 && (
            <div style={{ animation: 'fadeInUp 0.5s' }}>
              <h2 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0', color: '#f8fafc' }}>{t('feedback.techStepTitle')}</h2>
              <p style={{ color: '#94a3b8', marginBottom: '2.5rem' }}>{t('feedback.techStepSubtitle')}</p>

              <RatingInputRow label={t('feedback.q1')} value={answers.q1_technician_behaviour} onChange={(v) => updateAnswer('q1_technician_behaviour', v)} />
              <RatingInputRow label={t('feedback.q2')} value={answers.q2_technician_punctuality} onChange={(v) => updateAnswer('q2_technician_punctuality', v)} />
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem' }}>
                <button className="nav-btn nav-btn-primary" disabled={!canProceedStep1} onClick={() => setWizardStep(2)}>
                  {t('feedback.continueBtn')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SERVICE & RESOLUTION */}
          {lookupState === 'idle' && wizardStep === 2 && (
            <div style={{ animation: 'fadeInUp 0.5s' }}>
              <h2 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0', color: '#f8fafc' }}>{t('feedback.serviceStepTitle')}</h2>
              <p style={{ color: '#94a3b8', marginBottom: '2.5rem' }}>{t('feedback.serviceStepSubtitle')}</p>

              <RatingInputRow label={t('feedback.q3')} value={answers.q3_service_quality} onChange={(v) => updateAnswer('q3_service_quality', v)} />
              <RatingInputRow label={t('feedback.q5')} value={answers.q5_response_time} onChange={(v) => updateAnswer('q5_response_time', v)} />

              <div style={{ marginBottom: '2.5rem', animation: 'fadeInUp 0.5s' }}>
                <label style={{ display: 'block', marginBottom: '1.25rem', fontSize: '1.15rem', fontWeight: 500, color: '#f8fafc' }}>{t('feedback.q4Question')}</label>
                <ResolutionCards value={answers.q4_resolution} onChange={(v) => updateAnswer('q4_resolution', v)} />
                
                {needsResolutionComment && (
                  <div style={{ marginTop: '1rem', animation: 'fadeInUp 0.3s' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1' }}>{t('feedback.pendingExplainLabel')}</label>
                    <textarea
                      className="textarea-premium"
                      rows={3}
                      value={answers.q4_comment}
                      onChange={(e) => updateAnswer('q4_comment', e.target.value)}
                      placeholder={t('feedback.pendingExplainPlaceholder')}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
                <button className="nav-btn nav-btn-secondary" onClick={() => setWizardStep(1)}>
                  {isRtl ? '→ ' + t('common.back') : '← ' + t('common.back')}
                </button>
                <button className="nav-btn nav-btn-primary" disabled={!canProceedStep2} onClick={() => setWizardStep(3)}>
                  {t('feedback.continueBtn')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: OVERALL & COMMENTS */}
          {lookupState === 'idle' && wizardStep === 3 && (
            <div style={{ animation: 'fadeInUp 0.5s' }}>
              <h2 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0', color: '#f8fafc' }}>{t('feedback.overallStepTitle')}</h2>
              <p style={{ color: '#94a3b8', marginBottom: '2.5rem' }}>{t('feedback.overallStepSubtitle')}</p>

              <RatingInputRow label={t('feedback.q6')} value={answers.q6_overall_experience} onChange={(v) => updateAnswer('q6_overall_experience', v)} />
              
              {lowOverallScore && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2.5rem', animation: 'fadeInUp 0.4s' }}>
                  <p style={{ margin: '0 0 1rem 0', color: '#f8fafc', fontWeight: 500 }}>{t('feedback.lowScoreMsg')}</p>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.9rem' }}>{t('feedback.lowScoreLabel')}</label>
                  <textarea
                    className="textarea-premium"
                    rows={3}
                    value={answers.q8_comments}
                    onChange={(e) => updateAnswer('q8_comments', e.target.value)}
                    placeholder={t('feedback.lowScorePlaceholder')}
                  />
                </div>
              )}

              <RatingInputRow label={t('feedback.q7')} value={answers.q7_product_satisfaction} onChange={(v) => updateAnswer('q7_product_satisfaction', v)} />

              {!lowOverallScore && (
                <div style={{ marginBottom: '2.5rem', animation: 'fadeInUp 0.5s' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '1.15rem', fontWeight: 500, color: '#f8fafc' }}>{t('feedback.q8')}</label>
                  <textarea
                    className="textarea-premium"
                    rows={3}
                    value={answers.q8_comments}
                    onChange={(e) => updateAnswer('q8_comments', e.target.value)}
                    placeholder={t('feedback.q8Placeholder')}
                  />
                </div>
              )}

              <RatingInputRow label={t('feedback.q9')} value={answers.q9_recommendation} onChange={(v) => updateAnswer('q9_recommendation', v)} />

              {submitError && <p style={{ color: '#ef4444', textAlign: 'center', marginBottom: '1rem' }}>{submitError}</p>}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
                <button className="nav-btn nav-btn-secondary" disabled={submitting} onClick={() => setWizardStep(2)}>
                  {isRtl ? '→ ' + t('common.back') : '← ' + t('common.back')}
                </button>
                <button className="nav-btn nav-btn-primary" disabled={!canProceedStep3 || submitting} onClick={handleFormSubmit}>
                  {submitting ? t('feedback.submittingBtn') : t('feedback.submitFeedbackBtn')}
                </button>
              </div>
            </div>
          )}

          {/* DONE STEP */}
          {lookupState === 'idle' && wizardStep === 4 && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <svg style={{ width: '100px', height: '100px', margin: '0 auto 2rem auto', overflow: 'visible' }} viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="25" fill="none" stroke="#10b981" strokeWidth="2" />
                <path fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeDasharray="100" strokeDashoffset="0" style={{ animation: 'checkmark 0.8s ease-out forwards' }} d="M14 27l7 7 16-16" />
              </svg>
              <h2 style={{ fontSize: '2.2rem', margin: '0 0 1rem 0', color: '#f8fafc' }}>{t('feedback.thankYouTitle')}</h2>
              <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '0.5rem' }}>
                {t('feedback.thankYouMsg1', { uid })}
              </p>
              <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                {t('feedback.thankYouMsg2')}
              </p>
              <a
                href="https://wa.me/966541463161"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-btn"
                style={{ padding: '1rem 2rem', fontSize: '1.1rem', background: '#25D366', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                💬 {t('common.returnToWhatsapp')}
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

