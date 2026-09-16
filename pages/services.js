import Link from 'next/link';
import PolicyLayout from '@/components/PolicyLayout';
import PaymentMethods from '@/components/PaymentMethods';
import { useLanguage } from '@/lib/LanguageContext';
import { business } from '@/lib/business';
import models from '@/data/eligible-models.json';
import s from '@/styles/Policies.module.css';
const categoryArabic = { 'Air Conditioner':'مكيفات الهواء', 'Big cooler':'مبردات الهواء الكبيرة', 'Chest Freezers':'المجمدات الأفقية', 'Chillers':'الثلاجات التجارية', 'Dish washer':'غسالات الصحون', 'Refrigerator':'الثلاجات', 'TV':'التلفزيونات', 'Washing Machine':'غسالات الملابس' };
export default function Services() {
 const { lang } = useLanguage(); const ar=lang==='ar';
 const charges=Object.values(models.categories).map(item=>item.charge);
 const range=`${Math.min(...charges)}–${Math.max(...charges)}`;
 const rows = ar ? [
  ['الصيانة ضمن الضمان','للأعطال المشمولة بضمان إمبكس الساري، بعد التحقق من أهلية الضمان.','0 ريال للأعطال المشمولة'],
  ['الصيانة خارج الضمان','تختلف رسوم الخدمة حسب فئة المنتج. تُحدد أعمال الإصلاح وقطع الغيار في عرض السعر.',`${range} ريال رسوم الخدمة`],
  ['الفحص والتشخيص','يُؤكد أي رسم فحص منفصل قبل تنفيذ الفحص.','حسب عرض السعر بالريال'],
  ['قطع الغيار','يُحدد سعر القطعة وفقاً للطراز والحاجة إلى الاستبدال قبل الموافقة.','حسب عرض السعر بالريال'],
  ['الاستلام والتوصيل','تعتمد الرسوم على الموقع والمنتج وترتيبات النقل، وتُؤكد قبل الاستلام.','حسب عرض السعر بالريال'],
  ['سداد فواتير الوكلاء','للوكلاء المسجلين، باستخدام رقم الوكيل ورقم الجوال المسجل.','القيمة الموضحة في الفاتورة بالريال'],
 ] : [
  ['Warranty repair','For faults covered by a valid Impex warranty, subject to warranty verification.','SAR 0 for covered repairs'],
  ['Out-of-warranty service','Service charges vary by product category. Repair scope and replacement parts are confirmed in the quotation.',`SAR ${range} service charge`],
  ['Inspection & diagnosis','Any separate inspection charge is confirmed before diagnosis begins.','Quoted in SAR'],
  ['Spare parts','Priced by part and product model; any replacement is included in the quotation for approval.','Quoted in SAR'],
  ['Pickup & delivery','Fees depend on location, product and transport arrangements and are confirmed before collection.','Quoted in SAR'],
  ['Dealer invoice payments','For registered dealers using their Dealer ID and registered mobile number.','Invoice amount in SAR'],
 ];
 return <PolicyLayout title={ar?'خدماتنا وأسعارنا':'Services & Prices'}>
  <p className={s.lead}>{business.name[lang]} {ar?'تقدم خدمات ما بعد البيع لمنتجات إمبكس في المملكة العربية السعودية، وخدمة الدفع الإلكتروني للوكلاء المسجلين.':'provides after-sales support for Impex products in Saudi Arabia and online invoice payments for registered dealers.'}</p>
  <div className={s.notice}>{ar?'جميع الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة 15% ما لم يُذكر خلاف ذلك. يُؤكد المبلغ الإجمالي قبل الدفع.':'All prices are in Saudi Riyals (SAR) and include 15% VAT unless stated otherwise. The total payable is confirmed before payment.'}</div>
  <div className={s.tableWrap}><table><caption>{ar?'الخدمات والرسوم':'Services and charges'}</caption><thead><tr>{(ar?['الخدمة','ما الذي تدفع مقابله','السعر']:['Service','What you pay for','Price']).map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row[0]}><th scope="row">{row[0]}</th><td>{row[1]}</td><td>{row[2]}</td></tr>)}</tbody></table></div>
  <h2>{ar?'رسوم الخدمة حسب المنتج':'Service charges by product'}</h2><p>{ar?'هذه رسوم الخدمة حسب الفئة؛ تُؤكد أهلية الطراز وأي رسوم إضافية في عرض السعر قبل البدء.':'These are category service charges. Model eligibility and any additional charges are confirmed in your quotation before work begins.'}</p>
  <div className={s.priceGrid}>{Object.entries(models.categories).map(([name,entry])=><div key={name}><span>{ar?categoryArabic[name]:name}</span><strong><bdi>{entry.charge} {ar?'ريال':'SAR'}</bdi></strong></div>)}</div>
  <article className={s.article}><h2>{ar?'آلية الخدمة والدفع':'How service and payment work'}</h2><ol>{(ar?['سجّل طلب الصيانة أو الاستلام، ثم قدّم تفاصيل المنتج ورقم الجوال.','يصلك عرض سعر قبل أي عمل مدفوع، ولا يبدأ العمل إلا بعد موافقتك.','يسدد الوكلاء فواتيرهم باستخدام رقم الوكيل ورقم الجوال المسجل. أدخل مبلغ الفاتورة أو عرض السعر المعتمد.','يتم تأكيد الدفع بعد تأكيد مزود الدفع. احتفظ بالرقم المرجعي للدفع والفاتورة.']:['Register a service or pickup request with your product details and mobile number.','You receive a quotation before paid work begins. Work starts only after your approval.','Dealers verify their Dealer ID and registered mobile number, then enter the approved invoice or quotation amount.','Payment is confirmed after the payment provider confirms it. Keep your payment reference and invoice.']).map(t=><li key={t}>{t}</li>)}</ol><p>{ar?'راجع ':'Please review our '}<Link href="/refund-policy">{ar?'سياسة الاسترداد':'Refund & Return Policy'}</Link>{ar?' و':' and '}<Link href="/cancellation-policy">{ar?'سياسة الإلغاء':'Cancellation Policy'}</Link>.</p></article>
  <div className={s.actions}><Link href="/register">{ar?'طلب خدمة':'Request service'} ↗</Link><Link href="/payment">{ar?'سداد فاتورة':'Pay an invoice'} ↗</Link><a href={business.whatsapp} target="_blank" rel="noopener noreferrer">{ar?'طلب عرض سعر عبر واتساب':'Request a quote on WhatsApp'} ↗</a></div><PaymentMethods/>
 </PolicyLayout>;
}
