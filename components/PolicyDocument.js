import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';
import { business } from '@/lib/business';
import policies from '@/content/policies.json';
import PolicyLayout from './PolicyLayout';
import s from '@/styles/Policies.module.css';
function inline(text) {
 return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\((?:\/|https:\/\/)[^)]+\))/g).map((part,i) => {
  if(part.startsWith('**')) return <strong key={i}>{part.slice(2,-2)}</strong>;
  const link=part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  return link ? <Link key={i} href={link[2]}>{link[1]}</Link> : part;
 });
}
export default function PolicyDocument({ slug }) {
 const { lang } = useLanguage();
 let content = policies[slug][lang];
 const values = { '[COMPANY LEGAL NAME EN]':business.name.en, '[COMPANY LEGAL NAME AR]':business.name.ar, '[CR NUMBER]':business.cr, '[ADDRESS EN]':business.address.en, '[ADDRESS AR]':business.address.ar, '[EMAIL]':business.email, '[PHONE]':business.phone, '[EFFECTIVE DATE]':business.effectiveDate[lang] };
 for(const [key,value] of Object.entries(values)) content=content.replaceAll(key,value);
 const [heading,...lines] = content.split('\n');
 const blocks=lines.join('\n').replace(/^(\*\*\d+\.[^\n]+\*\*)$/gm, '\n$1\n').trim().split(/\n\s*\n/);
 return <PolicyLayout title={heading.replace(/^# /,'')}><p>{business.name[lang]} · {lang === 'ar' ? 'السجل التجاري' : 'CR'}: {business.cr} · {lang === 'ar' ? 'الرقم الضريبي' : 'VAT'}: {business.vat}</p><article className={s.article}>{blocks.map((block,i) => {
  if(/^\*\*[^*]+\*\*$/.test(block)) return <h2 key={i}>{block.slice(2,-2)}</h2>;
  if(block.startsWith('*') && !block.startsWith('**')) return <p className={s.date} key={i}>{block.replace(/^\*|\*$/g,'')}</p>;
  const lines=block.split('\n');
  const firstBullet=lines.findIndex(line=>line.startsWith('- '));
  if(firstBullet>=0) return <div key={i}>{firstBullet>0 && <p>{inline(lines.slice(0,firstBullet).join(' '))}</p>}<ul>{lines.slice(firstBullet).map((line,j)=><li key={j}>{inline(line.replace(/^- /,''))}</li>)}</ul></div>;
  return <p key={i}>{inline(block)}</p>;
 })}</article></PolicyLayout>;
}
