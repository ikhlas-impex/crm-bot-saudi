import { useLanguage } from '../lib/LanguageContext';

export default function LanguageSwitcher({ className = '', style = {} }) {
  const { lang, switchLanguage } = useLanguage();

  return (
    <div
      className={`language-switcher-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '9999px',
        padding: '3px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 0.5rem',
          color: '#94a3b8',
          fontSize: '0.85rem',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '1rem', marginRight: lang === 'ar' ? '0' : '4px', marginLeft: lang === 'ar' ? '4px' : '0' }}>🌐</span>
      </div>

      <button
        type="button"
        onClick={() => switchLanguage('en')}
        style={{
          border: 'none',
          background: lang === 'en' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'transparent',
          color: lang === 'en' ? '#ffffff' : '#94a3b8',
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: lang === 'en' ? '0 2px 8px rgba(59, 130, 246, 0.4)' : 'none',
          outline: 'none',
        }}
      >
        English
      </button>

      <button
        type="button"
        onClick={() => switchLanguage('ar')}
        style={{
          border: 'none',
          background: lang === 'ar' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'transparent',
          color: lang === 'ar' ? '#ffffff' : '#94a3b8',
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.8rem',
          fontWeight: 600,
          fontFamily: "'Outfit', sans-serif",
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: lang === 'ar' ? '0 2px 8px rgba(59, 130, 246, 0.4)' : 'none',
          outline: 'none',
        }}
      >
        العربية
      </button>
    </div>
  );
}
