import { useState, useEffect } from 'react';

export const ARABIC_REGEX = /[\u0600-\u06FF]/;
export const translationCache = new Map();

// Helper to batch translate an array of texts in 1 single HTTP call
export async function batchTranslate(texts) {
  if (!Array.isArray(texts) || texts.length === 0) return;

  const toFetch = Array.from(
    new Set(
      texts.filter(
        (t) => typeof t === 'string' && ARABIC_REGEX.test(t) && !translationCache.has(t)
      )
    )
  );

  if (toFetch.length === 0) return;

  try {
    const res = await fetch('/api/admin/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: toFetch }),
    });
    const data = await res.json();
    if (data.success && data.translations) {
      Object.entries(data.translations).forEach(([orig, trans]) => {
        translationCache.set(orig, trans);
      });
      // Notify all listening components to update from cache
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('translations-updated'));
      }
    }
  } catch (err) {
    console.error('Batch translate failed', err);
  }
}

export default function ComplaintText({ text }) {
  const [translated, setTranslated] = useState(translationCache.get(text) || null);

  useEffect(() => {
    if (!text || !ARABIC_REGEX.test(text)) return;

    if (translationCache.has(text)) {
      setTranslated(translationCache.get(text));
    }

    const handleUpdate = () => {
      if (translationCache.has(text)) {
        setTranslated(translationCache.get(text));
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('translations-updated', handleUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('translations-updated', handleUpdate);
      }
    };
  }, [text]);

  if (!text) return null;

  const isArabic = ARABIC_REGEX.test(text);

  return (
    <div>
      <div>{text}</div>
      {isArabic && (
        <div style={{ color: '#8ab4f8', fontStyle: 'italic', fontSize: '0.75rem', marginTop: '0.25rem' }}>
          {translated ? `EN: ${translated}` : '...'}
        </div>
      )}
    </div>
  );
}
