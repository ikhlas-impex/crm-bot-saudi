import { useState, useEffect } from 'react';

const ARABIC_REGEX = /[\u0600-\u06FF]/;

// Module-level cache so re-renders (e.g. clicking Refresh) don't
// re-translate text that's already been translated this session.
const translationCache = new Map();

export default function ComplaintText({ text }) {
  const [translated, setTranslated] = useState(translationCache.get(text) || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!text || !ARABIC_REGEX.test(text)) {
      return;
    }
    if (translationCache.has(text)) {
      setTranslated(translationCache.get(text));
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch('/api/admin/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success) {
          translationCache.set(text, data.translated);
          setTranslated(data.translated);
        }
      })
      .catch((err) => console.error('translate failed', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!text) return null;

  const isArabic = ARABIC_REGEX.test(text);

  return (
    <div>
      <div>{text}</div>
      {isArabic && (
        <div style={{ color: '#8ab4f8', fontStyle: 'italic', fontSize: 13, marginTop: 4 }}>
          {loading ? 'Translating...' : translated ? `EN: ${translated}` : null}
        </div>
      )}
    </div>
  );
}
