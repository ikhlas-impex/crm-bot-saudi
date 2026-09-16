import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/lib/LanguageContext';
import { policyLinks } from '@/lib/business';
import s from '@/styles/Policies.module.css';
export default function PolicyLayout({ title, children }) {
 const { lang, switchLanguage } = useLanguage();
 return <div className={s.page} dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
  <Head><title>{title} | Impex Saudi Arabia</title><meta name="description" content={`${title} — Impex Saudi Arabia customer services and dealer payments.`}/></Head>
  <header className={s.header}><Link href="/" className={s.logo} aria-label="Impex home"><Image src="/IMPEX%20LOGO.png" alt="Impex" width={4590} height={2000} sizes="170px" preload/></Link><div><Link href="/">{lang === 'ar' ? 'الرئيسية' : 'Back to home'}</Link><button onClick={() => switchLanguage(lang === 'ar' ? 'en' : 'ar')}>{lang === 'ar' ? 'English' : 'العربية'}</button></div></header>
  <main className={s.main}><span className={s.eyebrow}>{lang === 'ar' ? 'إمبكس · معلومات العملاء' : 'IMPEX · CUSTOMER INFORMATION'}</span><h1>{title}</h1><nav className={s.policyNav} aria-label={lang === 'ar' ? 'معلومات العملاء' : 'Customer information'}>{policyLinks.map(link => <Link key={link.href} href={`${link.href}?lang=${lang}`}>{link[lang]}</Link>)}</nav>{children}</main>
 </div>;
}
