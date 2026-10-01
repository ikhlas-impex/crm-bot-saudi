import { useEffect, useRef, useState } from 'react';

/**
 * Renders the Moyasar hosted payment form.
 *
 * Flow: the customer submits card details -> Moyasar creates the payment and calls
 * on_completed (status is usually 'initiated' at this point, NOT 'paid') -> the
 * browser is redirected to the bank's 3-D Secure page -> Moyasar redirects back to
 * callback_url with ?id=...&status=paid|failed&message=...
 *
 * Because that redirect is a full page load, the parent must persist its state in
 * onBeforeRedirect(payment) and finish the registration when it sees ?id= on return.
 */
export default function MoyasarPaymentForm({ amount, description, metadata, onBeforeRedirect, onError, lang = 'en' }) {
  const formRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState('');

  // Keep latest callbacks/metadata in refs so re-renders of the parent don't re-init the form
  const callbacksRef = useRef({ onBeforeRedirect, onError, metadata });
  useEffect(() => {
    callbacksRef.current = { onBeforeRedirect, onError, metadata };
  });

  const publishableKey = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY;

  useEffect(() => {
    if (!publishableKey || publishableKey.includes('YOUR_PUBLISHABLE_KEY')) {
      setInitError(
        lang === 'ar'
          ? 'مفتاح بوابة ميسر غير مهيأ بعد. يرجى إضافة NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY في ملف .env'
          : 'Moyasar Publishable Key is not configured yet. Please add NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY to your .env file.'
      );
      setLoading(false);
      return;
    }

    let intervalId = null;

    const initForm = () => {
      if (window.Moyasar && formRef.current) {
        setLoading(false);
        try {
          // Clear container content before re-initializing
          formRef.current.innerHTML = '';

          // Determine base callback URL (current URL without query parameters)
          const baseUrl = window.location.origin + window.location.pathname;

          window.Moyasar.init({
            element: formRef.current,
            amount: Math.round(Number(amount) * 100), // In Halalas (1 SAR = 100 Halalas)
            currency: 'SAR',
            description: description || 'Impex Customer Service Fee',
            publishable_api_key: publishableKey,
            callback_url: baseUrl,
            methods: ['creditcard', 'applepay'],
            supported_networks: ['mada', 'visa', 'mastercard', 'amex'],
            apple_pay: {
              country: 'SA',
              label: 'IMPEX Service',
              validate_merchant_url: 'https://api.moyasar.com/v1/applepay/initiate',
            },
            metadata: callbacksRef.current.metadata || {},
            // Called once the payment is created, before redirecting to 3-D Secure.
            // Moyasar waits for the returned promise, so the draft is saved before the page unloads.
            on_completed: async function (payment) {
              if (callbacksRef.current.onBeforeRedirect) {
                await callbacksRef.current.onBeforeRedirect(payment);
              }
            },
            on_failed: async function (error) {
              console.error('Moyasar payment failed:', error);
              callbacksRef.current.onError?.(
                typeof error === 'string'
                  ? error
                  : error?.message || (lang === 'ar' ? 'فشلت عملية الدفع. يرجى المحاولة مرة أخرى.' : 'Payment failed. Please try again.')
              );
            },
          });

          // Check after a short delay if Moyasar rendered child elements.
          // If the publishable key is unauthorized or invalid, Moyasar clears or fails to mount.
          setTimeout(() => {
            if (formRef.current && formRef.current.children.length === 0) {
              setInitError(
                lang === 'ar'
                  ? 'تعذر تحميل نموذج ميسر. يرجى التأكد من صحة مفتاح NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY في ملف .env وإعادة تشغيل الخادم (npm run dev).'
                  : 'Unable to load Moyasar payment form. Please verify your NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY in .env (from dashboard.moyasar.com) and restart the dev server (npm run dev).'
              );
            }
          }, 1200);

        } catch (err) {
          console.error('Failed to initialize Moyasar form:', err);
          setInitError(err.message || 'Error initializing payment form');
        }
      }
    };

    // Poll for window.Moyasar script load if not immediately present
    if (window.Moyasar) {
      initForm();
    } else {
      intervalId = setInterval(() => {
        if (window.Moyasar) {
          clearInterval(intervalId);
          initForm();
        }
      }, 200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [amount, description, publishableKey, lang]);

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.85)',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      borderRadius: '12px',
      padding: '1.25rem',
      margin: '1rem 0',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '0.75rem'
      }}>
        <div style={{ fontWeight: '700', fontSize: '1rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>💳</span> {lang === 'ar' ? 'الدفع الإلكتروني السريع (مدى / فيزا / ماستركارد / Apple Pay)' : 'Online Payment (Mada / Visa / Mastercard / Apple Pay)'}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: '600', background: 'rgba(52, 211, 153, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
          🔒 {lang === 'ar' ? 'دفع آمن 100%' : '100% Secure'}
        </div>
      </div>

      {initError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '8px',
          padding: '0.875rem',
          color: '#fca5a5',
          fontSize: '0.875rem',
          marginBottom: '1rem'
        }}>
          ⚠️ {initError}
        </div>
      )}

      {loading && !initError && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
          <div className="spinner" style={{ margin: '0 auto 0.75rem auto' }} />
          <div>{lang === 'ar' ? 'جاري تحميل نموذج الدفع الآمن...' : 'Loading secure payment form...'}</div>
        </div>
      )}

      <div ref={formRef} className="mysr-form" style={{ minHeight: '220px' }}></div>
    </div>
  );
}
