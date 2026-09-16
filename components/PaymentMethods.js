import Image from 'next/image';
import { useLanguage } from '@/lib/LanguageContext';
import s from '@/styles/Policies.module.css';
export default function PaymentMethods() {
 const { lang } = useLanguage();
 return <section className={s.paymentMethods} aria-label={lang === 'ar' ? 'وسائل الدفع' : 'Payment methods'}>
  <div className={s.paymentLogos}>{[['mada','mada'],['visa','Visa'],['mastercard','Mastercard'],['apple-pay','Apple Pay']].map(([file,name]) => <span key={file}><Image src={`/payment-methods/${file}.svg`} alt={name} width={66} height={36} unoptimized /></span>)}</div>
  <p>{lang === 'ar' ? 'تتم معالجة المدفوعات عبر ميسر. تظهر الوسائل المتاحة في صفحة الدفع؛ يعتمد Apple Pay على الجهاز والبطاقة.' : 'Payments processed by Moyasar. Available methods appear at checkout; Apple Pay depends on your device and card.'}</p>
 </section>;
}
