import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/lib/LanguageContext';
import { business, policyLinks } from '@/lib/business';
import s from '@/styles/Policies.module.css';
export default function SiteFooter() {
 const { lang } = useLanguage();
 const ar = lang === 'ar';
 return <footer className={s.footer} dir={ar ? 'rtl' : 'ltr'} lang={lang} id="contact">
  <div className={s.footerInner}>
   <div className={s.company}>
    <Link href="/" aria-label="Impex home" className={s.logo}><Image src="/IMPEX%20LOGO.png" alt="Impex" width={4590} height={2000} sizes="170px"/></Link>
    <h2>{business.name[lang]}</h2>
    <p>{ar ? 'خدمات ما بعد البيع لمنتجات إمبكس ومدفوعات الوكلاء في المملكة العربية السعودية.' : 'After-sales support for Impex products and dealer payments in Saudi Arabia.'}</p>
    <p>{ar ? 'السجل التجاري' : 'CR No.'}: <bdi>{business.cr}</bdi><br/>{ar ? 'الرقم الموحد / رقم الرخصة التجارية' : 'Unified / Trade License No.'}: <bdi>{business.unifiedNumber}</bdi>{business.vat && <><br/>{ar ? 'الرقم الضريبي' : 'VAT No.'}: <bdi>{business.vat}</bdi></>}</p>
   </div>
   <div><h3>{ar ? 'معلومات وخدمات' : 'Useful information'}</h3><nav aria-label={ar ? 'السياسات' : 'Policies'} className={s.footerLinks}>{policyLinks.map(link => <Link key={link.href} href={`${link.href}?lang=${lang}`}>{link[lang]}</Link>)}</nav></div>
   <div className={s.contact}><h3>{ar ? 'تواصل معنا' : 'Contact & registered address'}</h3><address>{business.address[lang]}</address><a href={`mailto:${business.email}`}>{business.email}</a><a href="tel:+966541463161" dir="ltr">{business.phone}</a><a href={business.whatsapp} target="_blank" rel="noopener noreferrer">{ar ? 'تواصل عبر واتساب ↗' : 'Chat on WhatsApp ↗'}</a></div>
  </div>
  <div className={s.copyright}>© 2026 {business.name[lang]}. {ar ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</div>
 </footer>;
}
