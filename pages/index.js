import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import s from "@/styles/Home.module.css";

const COMPLAINT_URL = process.env.NEXT_PUBLIC_COMPLAINT_URL || "/register";
const WHATSAPP_URL = "https://wa.me/966541463161";
function Icon({ name = "chat", ...props }) {
  const paths = {
    chat: <><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="3"/></>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6"/>,
    tool: <path d="m14 6 4 4 3-3a6 6 0 0 1-8 8l-6 6-4-4 6-6a6 6 0 0 1 8-8l-3 3Z"/>,
    card: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
const copy = {
 en: {
  support: "CUSTOMER CARE · SAUDI ARABIA", services: "Our services", how: "How it works", contact: "Let’s talk", badge: "A little help. A lot of care.", title: "Great products.", accent: "Even better support.", intro: "Your Impex experience doesn’t end at the purchase. From service requests to payments, we’re just a message away.", start: "Chat on WhatsApp", explore: "Explore support", note: "No new app. Just open WhatsApp and say hello.", companion: "YOUR IMPEX SUPPORT COMPANION", welcome: "Hello, how can we help?", message: "Welcome to Impex Saudi Arabia. Choose what you need — we’ll guide you from here.", preview: "SUPPORT PREVIEW", choices: ["Service & pickup", "Dealer payments", "New here?"], responses: ["Need a repair or a pickup? Register your request using your mobile number to get started.", "Have your registered Dealer ID ready to look up your details and continue to payment.", "Say hello on WhatsApp to register with Impex and receive your Dealer ID."], actions: ["Register a complaint", "Continue to payment", "Register on WhatsApp"], section: "GOOD CARE, MADE SIMPLE", heading: "A place for every “can you help?”", detail: "Choose your next step. We’ll take it from there.", cards: ["Service & pickup", "Dealer payments", "Talk to Impex"], descriptions: ["Something not quite right? Register a complaint or arrange a service pickup.", "A simple way for registered dealers to look up and complete a payment.", "New to Impex or need a little guidance? Start with a WhatsApp conversation."], links: ["Create a request", "Make a payment", "Start a conversation"], stepsTitle: "From hello to handled.", steps: ["Choose your service", "Share your details", "We’ll guide you next"], stepsText: ["Tell us what you need help with.", "Keep your mobile number or Dealer ID ready.", "Follow the steps in the form or on WhatsApp."], footer: "Made for your peace of mind.", country: "Impex Saudi Arabia", direct: "WhatsApp support", safe: "Your details, handled with care", language: "English & Arabic", familiar: "Support on an app you know",
 },
 ar: {
  support: "خدمة العملاء · المملكة العربية السعودية", services: "خدماتنا", how: "كيف نساعدك", contact: "تواصل معنا", badge: "مساعدة بسيطة. عناية كبيرة.", title: "منتجات رائعة.", accent: "ودعم يستحق ثقتك.", intro: "تجربتك مع إمبكس لا تنتهي عند الشراء. من طلبات الصيانة إلى المدفوعات، نحن على بُعد رسالة منك.", start: "تواصل عبر واتساب", explore: "استكشف خدماتنا", note: "بدون تطبيق جديد. افتح واتساب وقل مرحباً.", companion: "رفيقك لدعم إمبكس", welcome: "مرحباً، كيف نساعدك؟", message: "أهلاً بك في إمبكس السعودية. اختر ما تحتاج إليه وسنرشدك للخطوة التالية.", preview: "معاينة الدعم", choices: ["الصيانة والاستلام", "مدفوعات الوكلاء", "عميل جديد؟"], responses: ["تحتاج إلى صيانة أو استلام؟ سجّل طلبك باستخدام رقم جوالك للبدء.", "جهّز معرّف الوكيل المسجّل للاطلاع على بياناتك ومتابعة الدفع.", "تواصل معنا عبر واتساب للتسجيل لدى إمبكس والحصول على معرّف الوكيل."], actions: ["تسجيل شكوى", "المتابعة للدفع", "التسجيل عبر واتساب"], section: "رعاية جيدة، بكل بساطة", heading: "لكل سؤال، مكان للمساعدة.", detail: "اختر خطوتك التالية ودعنا نساعدك.", cards: ["الصيانة والاستلام", "مدفوعات الوكلاء", "تواصل مع إمبكس"], descriptions: ["هل تواجه مشكلة؟ سجّل شكوى أو اطلب استلام المنتج للصيانة.", "طريقة بسيطة للوكلاء المسجّلين للاطلاع على بياناتهم وإتمام الدفع.", "جديد لدى إمبكس أو تحتاج إلى مساعدة؟ ابدأ محادثة عبر واتساب."], links: ["إنشاء طلب", "إتمام الدفع", "بدء محادثة"], stepsTitle: "من الترحيب إلى المساعدة.", steps: ["اختر الخدمة", "شارك بياناتك", "نتابع معك الخطوات"], stepsText: ["أخبرنا بما تحتاج إليه.", "جهّز رقم جوالك أو معرّف الوكيل.", "اتبع الخطوات في النموذج أو عبر واتساب."], footer: "لراحة بالك.", country: "إمبكس السعودية", direct: "الدعم عبر واتساب", safe: "نتعامل مع بياناتك بعناية", language: "العربية والإنجليزية", familiar: "دعم عبر تطبيق تعرفه",
 }
};
export default function Home() {
 const { lang, switchLanguage } = useLanguage();
 const [selected, setSelected] = useState(0);
 const c = copy[lang] || copy.en;
 const destinations = [COMPLAINT_URL, "/payment", WHATSAPP_URL];
 const external = { target: "_blank", rel: "noopener noreferrer" };
 return <div className={s.page} dir={lang === "ar" ? "rtl" : "ltr"}>
  <Head><title>Impex Saudi Arabia | Customer Support</title><meta name="description" content="Connect with Impex Saudi Arabia on WhatsApp, request service or pickup, and complete dealer payments."/><meta name="viewport" content="width=device-width, initial-scale=1"/></Head>
  <a className={s.skip} href="#main">{lang === "ar" ? "انتقل إلى المحتوى" : "Skip to content"}</a>
  <header className={s.header}>
   <Link href="/" className={s.brand} aria-label="Impex home"><span className={s.logo}><Image src="/IMPEX%20LOGO.png" alt="Impex" width={4590} height={2000} sizes="170px" preload /></span><small>{c.support}</small></Link>
   <nav className={s.nav} aria-label={c.services}><a href="#services">{c.services}</a><a href="#how-it-works">{c.how}</a></nav>
   <div className={s.headerActions}><button className={s.language} onClick={() => switchLanguage(lang === "ar" ? "en" : "ar")} aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}><Icon name="globe"/>{lang === "ar" ? "English" : "العربية"}</button><a className={s.contact} href={WHATSAPP_URL} {...external}>{c.contact}<Icon name="arrow"/></a></div>
  </header>
  <main id="main">
   <section className={s.hero}>
    <div className={s.heroGlow} aria-hidden="true"/>
    <div className={s.orbit} aria-hidden="true"><div className={s.orbitInner}/><span className={s.orbitDot}/><div className={s.emblem}><Icon width="48" height="48"/></div><span className={s.spark}>+</span></div>
    <div className={s.eyebrow}><span/>{c.badge}</div>
    <h1>{c.title}<br/><span>{c.accent}</span></h1>
    <p className={s.intro}>{c.intro}</p>
    <div className={s.heroActions}><a className={s.primary} href={WHATSAPP_URL} {...external}><Icon/>{c.start}<Icon name="arrow"/></a><a className={s.secondary} href="#services">{c.explore}<span>↗</span></a></div>
    <p className={s.note}>{c.note}</p>
    <div className={s.console}>
     <div className={s.consoleHeader}><span><span className={s.greenDot}/>{c.companion}</span><span className={s.preview}>{c.preview}</span></div>
     <div className={s.consoleBody}><div className={s.botAvatar}><Icon/></div><div><h2>{c.welcome}<span aria-hidden="true"> ✦</span></h2><p>{c.message}</p></div></div>
     <div className={s.choices} role="group" aria-label={c.services}>{c.choices.map((choice, i) => <button key={choice} aria-pressed={selected === i} onClick={() => setSelected(i)} className={selected === i ? s.selected : ""}><Icon name={["tool", "card", "chat"][i]}/>{choice}<span>↗</span></button>)}</div>
     <div className={s.answer} aria-live="polite"><p>{c.responses[selected]}</p><a href={destinations[selected]} {...(selected === 2 ? external : {})}>{c.actions[selected]}<Icon name="arrow"/></a></div>
    </div>
    <div className={s.trust}><span><Icon name="shield"/>{c.safe}</span><span><Icon name="globe"/>{c.language}</span><span><Icon/>{c.familiar}</span></div>
   </section>
   <section className={s.services} id="services"><div className={s.sectionIntro}><div><span className={s.kicker}>{c.section}</span><h2>{c.heading}</h2></div><p>{c.detail}</p></div><div className={s.cards}>{c.cards.map((title, i) => <a key={title} href={destinations[i]} className={s.serviceCard} {...(i === 2 ? external : {})}><div className={s.cardTop}><div className={s.serviceIcon}><Icon name={["tool", "card", "chat"][i]} width="25" height="25"/></div><span>0{i + 1}</span></div><h3>{title}</h3><p>{c.descriptions[i]}</p><div className={s.cardLink}>{c.links[i]}<Icon name="arrow"/></div></a>)}</div></section>
   <section className={s.how} id="how-it-works"><h2>{c.stepsTitle}</h2><div className={s.steps}>{c.steps.map((step, i) => <div key={step}><span>0{i + 1}</span><h3>{step}</h3><p>{c.stepsText[i]}</p></div>)}</div></section>
  </main>
  <footer className={s.footer}><div><span className={`${s.logo} ${s.footerLogo}`}><Image src="/IMPEX%20LOGO.png" alt="Impex" width={4590} height={2000} sizes="110px" /></span><span>{c.footer}</span></div><span>{c.country}</span><a href={WHATSAPP_URL} {...external}>{c.direct}<Icon name="arrow"/></a></footer>
 </div>;
}
