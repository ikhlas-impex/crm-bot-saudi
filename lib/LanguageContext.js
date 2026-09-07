import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { translations } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const router = useRouter();
  const [lang, setLangState] = useState('en');

  // Synchronize language from URL query or localStorage on initial load
  useEffect(() => {
    let initialLang = null;

    // 1. Check URL search params directly first
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const queryLang = urlParams.get('lang')?.toLowerCase();
      if (queryLang === 'ar' || queryLang === 'en') {
        initialLang = queryLang;
      }
    }

    // 2. Fall back to router query if not found above
    if (!initialLang && router.isReady && router.query.lang) {
      const rLang = String(router.query.lang).toLowerCase();
      if (rLang === 'ar' || rLang === 'en') {
        initialLang = rLang;
      }
    }

    // 3. Fall back to localStorage
    if (!initialLang && typeof window !== 'undefined') {
      const stored = localStorage.getItem('impex_lang');
      if (stored === 'ar' || stored === 'en') {
        initialLang = stored;
      }
    }

    // Default to 'en' if nothing else found
    if (initialLang && initialLang !== lang) {
      setLangState(initialLang);
    }
  }, [router.isReady, router.query.lang]);

  // Keep HTML document dir & lang attributes in sync
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.dir = dir;
      document.documentElement.lang = lang;
      localStorage.setItem('impex_lang', lang);
    }
  }, [lang]);

  // Function to switch language and update URL query smoothly without full reload
  const switchLanguage = useCallback((newLang) => {
    if (newLang !== 'en' && newLang !== 'ar') return;
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('impex_lang', newLang);

      // Preserve existing query params (e.g. phone, uid) while updating lang
      const currentQuery = { ...router.query, lang: newLang };
      router.replace(
        {
          pathname: router.pathname,
          query: currentQuery,
        },
        undefined,
        { shallow: true }
      );
    }
  }, [router]);

  // Helper translation function with fallback & interpolation
  const t = useCallback((path, replacements = {}) => {
    if (!path) return '';
    const parts = path.split('.');
    let obj = translations[lang];

    for (const part of parts) {
      if (obj && obj[part] !== undefined) {
        obj = obj[part];
      } else {
        // Fallback to English
        let fallback = translations.en;
        for (const p of parts) {
          if (fallback && fallback[p] !== undefined) {
            fallback = fallback[p];
          } else {
            return path; // Return key if not found
          }
        }
        obj = fallback;
        break;
      }
    }

    if (typeof obj === 'string') {
      let result = obj;
      Object.entries(replacements).forEach(([k, v]) => {
        result = result.replace(new RegExp(`{${k}}`, 'g'), v);
      });
      return result;
    }

    return obj || path;
  }, [lang]);

  const value = {
    lang,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    isRtl: lang === 'ar',
    switchLanguage,
    setLang: switchLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
