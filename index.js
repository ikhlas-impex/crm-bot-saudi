import { useState } from 'react';

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

function RatingInput({ label, value, onChange, max = 10 }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', marginBottom: 4 }}>
        {label} <span style={{ color: '#999' }}>(1 = Very Poor, {max} = Excellent)</span>
      </label>
      <input
        type="number"
        min={max === 10 && label.includes('Recommend') ? 0 : 1}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        style={{ width: 80, padding: 6 }}
      />
    </div>
  );
}

export default function FeedbackPage() {
  const [step, setStep] = useState('uid'); // uid | already | form | done
  const [uid, setUid] = useState('');
  const [uidInput, setUidInput] = useState('');
  const [uidError, setUidError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [checking, setChecking] = useState(false);
  const [answers, setAnswers] = useState(initialAnswers);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

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
        setUidError('Something went wrong checking that UID. Please try again.');
        return;
      }
      if (!data.valid) {
        const next = attempts + 1;
        setAttempts(next);
        if (next >= MAX_UID_ATTEMPTS) {
          setUidError(
            'We could not find that Service UID after several attempts. Please contact IMPEX Customer Care for assistance.'
          );
        } else {
          setUidError(data.message);
        }
        return;
      }
      if (data.alreadySubmitted) {
        setUid(uidInput.trim());
        setStep('already');
        return;
      }
      setUid(uidInput.trim());
      setStep('form');
    } catch (err) {
      console.error(err);
      setUidError('Network error - please try again.');
    } finally {
      setChecking(false);
    }
  }

  function updateAnswer(key, value) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
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
        setSubmitError(data.message || 'Submission failed - please try again.');
        return;
      }
      setStep('done');
    } catch (err) {
      console.error(err);
      setSubmitError('Network error - please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const needsResolutionComment = answers.q4_resolution === 'Partially Resolved' || answers.q4_resolution === 'Not Resolved';
  const lowOverallScore = answers.q6_overall_experience !== '' && Number(answers.q6_overall_experience) <= 5;

  const attemptsExhausted = attempts >= MAX_UID_ATTEMPTS;

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Impex Service Feedback</h1>

      {step === 'uid' && (
        <form onSubmit={handleUidSubmit}>
          <p>Thank you for choosing Impex Service. To provide feedback about your completed service request, please enter your Service UID.</p>
          <p style={{ color: '#999', fontSize: 14 }}>Example: IMX-KSA-SVC-00001</p>
          <input
            type="text"
            value={uidInput}
            onChange={(e) => setUidInput(e.target.value)}
            placeholder="Service UID"
            required
            disabled={attemptsExhausted}
            style={{ width: '100%', padding: 10, marginBottom: 12 }}
          />
          {uidError && <p style={{ color: 'crimson' }}>{uidError}</p>}
          <button type="submit" disabled={checking || attemptsExhausted} style={{ padding: '10px 20px' }}>
            {checking ? 'Checking...' : 'Continue'}
          </button>
        </form>
      )}

      {step === 'already' && (
        <div>
          <h2>Feedback Already Received</h2>
          <p>Feedback for this Service UID has already been received. Thank you for your valuable feedback.</p>
        </div>
      )}

      {step === 'form' && (
        <form onSubmit={handleFormSubmit}>
          <p>Please rate your experience for Service UID: <strong>{uid}</strong></p>

          <RatingInput label="Q1. Technician Behaviour" value={answers.q1_technician_behaviour} onChange={(v) => updateAnswer('q1_technician_behaviour', v)} />
          <RatingInput label="Q2. Technician Punctuality / Arrival Time" value={answers.q2_technician_punctuality} onChange={(v) => updateAnswer('q2_technician_punctuality', v)} />
          <RatingInput label="Q3. Service Quality" value={answers.q3_service_quality} onChange={(v) => updateAnswer('q3_service_quality', v)} />

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Q4. Was your reported problem resolved?</label>
            {['Completely Resolved', 'Partially Resolved', 'Not Resolved'].map((opt) => (
              <label key={opt} style={{ display: 'block', marginBottom: 4 }}>
                <input
                  type="radio"
                  name="q4_resolution"
                  value={opt}
                  checked={answers.q4_resolution === opt}
                  onChange={(e) => updateAnswer('q4_resolution', e.target.value)}
                  required
                />{' '}
                {opt}
              </label>
            ))}
            {needsResolutionComment && (
              <textarea
                placeholder="Please briefly explain what issue is still pending."
                value={answers.q4_comment}
                onChange={(e) => updateAnswer('q4_comment', e.target.value)}
                style={{ width: '100%', padding: 8, marginTop: 8 }}
                rows={3}
              />
            )}
          </div>

          <RatingInput label="Q5. Response Time" value={answers.q5_response_time} onChange={(v) => updateAnswer('q5_response_time', v)} />

          <div style={{ marginBottom: 16 }}>
            <RatingInput label="Q6. Overall Service Experience" value={answers.q6_overall_experience} onChange={(v) => updateAnswer('q6_overall_experience', v)} />
            {lowOverallScore && (
              <div style={{ background: '#3a1f1f', padding: 10, borderRadius: 4 }}>
                <p>We are sorry that your experience did not meet your expectations.</p>
                <p>Please tell us briefly what went wrong so that our team can review and improve the service.</p>
                <textarea
                  value={answers.q8_comments}
                  onChange={(e) => updateAnswer('q8_comments', e.target.value)}
                  style={{ width: '100%', padding: 8 }}
                  rows={3}
                />
              </div>
            )}
          </div>

          <RatingInput label="Q7. Product Satisfaction" value={answers.q7_product_satisfaction} onChange={(v) => updateAnswer('q7_product_satisfaction', v)} />

          {!lowOverallScore && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Q8. Any additional comments or suggestions? (optional - leave blank or type NO if none)</label>
              <textarea
                value={answers.q8_comments}
                onChange={(e) => updateAnswer('q8_comments', e.target.value)}
                style={{ width: '100%', padding: 8 }}
                rows={3}
              />
            </div>
          )}

          <RatingInput label="Q9. How likely are you to recommend Impex" value={answers.q9_recommendation} onChange={(v) => updateAnswer('q9_recommendation', v)} />

          {submitError && <p style={{ color: 'crimson' }}>{submitError}</p>}
          <button type="submit" disabled={submitting} style={{ padding: '10px 20px' }}>
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      )}

      {step === 'done' && (
        <div>
          <h2>Thank you for your valuable feedback!</h2>
          <p>Your feedback has been successfully recorded against Service UID: <strong>{uid}</strong>.</p>
          <p>Your feedback helps us improve our products and service quality.</p>
          <p>Thank you for choosing Impex. Have a great day!</p>
        </div>
      )}
    </div>
  );
}
