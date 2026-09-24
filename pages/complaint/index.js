import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import imageCompression from 'browser-image-compression';
import { useLanguage } from '@/lib/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

function BankDetailsCard({ t, lang }) {
  const [activeTab, setActiveTab] = useState('SNB');
  const [copiedField, setCopiedField] = useState(null);

  const bankData = {
    SNB: {
      name: t('complaint.snbBankName'),
      recipient: lang === 'ar' ? 'شركة الأجهزة الذكية التجارية' : 'SMART APPLIANCES TRADING COMPANY',
      currency: 'SAR',
      accountNumber: '62500000203709',
      iban: 'SA0210000062500000203709',
      swift: 'NCBKSAJE',
    },
    RAJHI: {
      name: t('complaint.rajhiBankName'),
      recipient: lang === 'ar' ? 'شركة الأجهزة الذكية التجارية' : 'SMART APPLIANCES TRADING COMPANY',
      currency: 'SAR',
      accountNumber: '504608010804400',
      iban: 'SA4380000504608010804400',
      swift: 'RJHISARI',
    }
  };

  const currentBank = bankData[activeTab];

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleShare = async () => {
    const text = `${currentBank.name}\n${lang === 'ar' ? 'المستفيد' : 'Recipient'}: ${currentBank.recipient}\n${lang === 'ar' ? 'رقم الحساب' : 'Account Number'}: ${currentBank.accountNumber}\n${lang === 'ar' ? 'الآيبان' : 'IBAN'}: ${currentBank.iban}\n${lang === 'ar' ? 'رمز سويفت' : 'SWIFT'}: ${currentBank.swift}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: lang === 'ar' ? 'تفاصيل الحساب البنكي' : 'Bank Account Details',
          text: text,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopy(text, 'all');
      alert(lang === 'ar' ? 'تم نسخ التفاصيل للحافظة' : 'Details copied to clipboard!');
    }
  };

  const handleDownload = () => {
    const text = `${currentBank.name}\n${lang === 'ar' ? 'المستفيد' : 'Recipient'}: ${currentBank.recipient}\n${lang === 'ar' ? 'رقم الحساب' : 'Account Number'}: ${currentBank.accountNumber}\n${lang === 'ar' ? 'الآيبان' : 'IBAN'}: ${currentBank.iban}\n${lang === 'ar' ? 'رمز سويفت' : 'SWIFT'}: ${currentBank.swift}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bank_Details_${activeTab}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const CopyIcon = ({ isCopied }) => (
    isCopied ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }}>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    )
  );

  const renderRow = (label, value, fieldId) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#e5e7eb', fontSize: '0.9rem', fontWeight: '500', textAlign: lang === 'ar' ? 'left' : 'right' }}>{value}</span>
        <div onClick={() => handleCopy(value, fieldId)} style={{ display: 'flex', alignItems: 'center', padding: '4px' }}>
          <CopyIcon isCopied={copiedField === fieldId} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      background: '#09090b',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      padding: '1.25rem',
      marginBottom: '1.5rem',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      textAlign: lang === 'ar' ? 'right' : 'left',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
          {lang === 'ar' ? 'تفاصيل الحساب' : 'Account details'}
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#d1d5db' }}>
          <span>🇸🇦</span>
          <span style={{ fontWeight: '600' }}>{lang === 'ar' ? 'رئيسي' : 'Main'}</span>
          <span>·</span>
          <span>SAR</span>
        </div>

        {/* Actions Row */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px', marginBottom: '8px' }}>
          <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
            {lang === 'ar' ? 'مشاركة' : 'Share'}
          </button>
          <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            {lang === 'ar' ? 'تحميل' : 'Download'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px' }}>
          <button 
            onClick={() => setActiveTab('SNB')}
            style={{ flex: 1, padding: '8px', border: 'none', background: activeTab === 'SNB' ? 'rgba(255,255,255,0.15)' : 'transparent', color: activeTab === 'SNB' ? '#fff' : '#9ca3af', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            {t('complaint.snbBankName')}
          </button>
          <button 
            onClick={() => setActiveTab('RAJHI')}
            style={{ flex: 1, padding: '8px', border: 'none', background: activeTab === 'RAJHI' ? 'rgba(255,255,255,0.15)' : 'transparent', color: activeTab === 'RAJHI' ? '#fff' : '#9ca3af', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            {t('complaint.rajhiBankName')}
          </button>
        </div>

        {/* Bank Details Container */}
        <div style={{ background: '#18181b', borderRadius: '16px', padding: '1rem', marginTop: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: '#d1d5db', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {currentBank.name} · {lang === 'ar' ? 'تحويل محلي' : 'Local transfer'}
          </div>
          
          {renderRow(lang === 'ar' ? 'المستفيد' : 'Recipient', currentBank.recipient, 'recipient')}
          {renderRow(lang === 'ar' ? 'العملة المقبولة' : 'Currency accepted', currentBank.currency, 'currency')}
          {renderRow(lang === 'ar' ? 'رقم الحساب' : 'Account number', currentBank.accountNumber, 'accountNumber')}
          {renderRow(lang === 'ar' ? 'الآيبان' : 'IBAN', currentBank.iban, 'iban')}
          {renderRow(lang === 'ar' ? 'رمز سويفت' : 'SWIFT Code', currentBank.swift, 'swift')}
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '16px', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
             <span style={{ fontSize: '1rem' }}>ℹ️</span>
             <span style={{ fontSize: '0.75rem', color: '#93c5fd', lineHeight: '1.4' }}>
               {lang === 'ar' 
                 ? 'يرجى تحويل رسوم الصيانة وإرفاق إيصال الدفع في الخطوة التالية. سيتم مراجعة الطلب وإصدار رقم الخدمة الخاص بك.' 
                 : 'Please transfer the service fee and upload the payment receipt in the next step. Your request will be reviewed and a Service UID will be issued.'}
             </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComplaintForm() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [iwRegOption, setIwRegOption] = useState('free'); // 'free' | 'paid'
  
  const [formData, setFormData] = useState({
    phone: '',
    productgroup: '',
    model: '',
    customername: '',
    altmobile: '',
    address: '',
    city: '',
    area: '',
    complaintdetails: '',
    dop: '',
    warrantystatus: '',
    chargeamount: 0,
    decision: '',
  });

  const [files, setFiles] = useState({
    modelserialimg: null,
    productimg: null,
    invoiceimg: null,
    paymentproofimg: null,
  });

  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [declineConfirm, setDeclineConfirm] = useState(false);
  const [finalResult, setFinalResult] = useState(null);
  
  const productGroups = ['Air Conditioner', 'Big cooler', 'Chest Freezers', 'Chillers', 'Dish washer', 'Refrigerator', 'TV', 'Washing Machine'];
  const models = {
    'Air Conditioner': ['1.5 Ton Split AC', '1.5 Ton Window AC', '2 Ton Split AC', '2 Ton Window AC'],
    'Big cooler': ['Storm100'],
    'Chest Freezers': ['IMCF150', 'IMCF200'],
    'Chillers': ['IMSC300W', 'IMSC400B'],
    'Dish washer': ['IDW13PS', 'IDW15PS'],
    'Refrigerator': ['IRF138', 'IRF200', 'IRF220', 'IRF250', 'IRF290', 'IRF335', 'IRF420', 'IRF470', 'IRF520SS', 'IRF550SBSS'],
    'TV': ['100"', '50"', '55"', '58"', '60"', '65"', '70"', '75"', '85"'],
    'Washing Machine': ['WM0500TPW', 'WM0600FW', 'WM0700TMG', 'WM0700TPW', 'WM0750FS', 'WM0800FS', 'WM0800TMG', 'WM1000FS', 'WM1000TMG', 'WM1000TPW', 'WM1200TMG', 'WM1400TWG', 'WM4202', 'WM4203', 'WM4204', 'WM4205', 'WM4214', 'WM4215', 'WM4218']
  };

  useEffect(() => {
    if (router.query.phone) {
      setFormData(prev => ({ ...prev, phone: router.query.phone }));
    }
  }, [router.query.phone]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleFileChange = async (e) => {
    const { name, files: fileList } = e.target;
    if (fileList.length > 0) {
      const file = fileList[0];
      try {
        const options = {
          maxSizeMB: 1, // Target size is 1MB to easily fit under Vercel's 4.5MB limit
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedBlob = await imageCompression(file, options);
        // Cast the compressed blob back into a File to preserve the filename for formData
        const finalFile = new File([compressedBlob], file.name, {
          type: compressedBlob.type || file.type,
        });
        setFiles(prev => ({ ...prev, [name]: finalFile }));
      } catch (error) {
        console.error('Error compressing image:', error);
        // Fallback to original file if compression fails
        setFiles(prev => ({ ...prev, [name]: file }));
      }
    }
  };

  const getDefaultCharge = (group) => {
    if (group === 'Refrigerator') return 300;
    if (['Big cooler', 'TV', 'Washing Machine'].includes(group)) return 150;
    return 250;
  };

  const checkEligibility = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/complaint/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: formData.productgroup, model: formData.model })
      });
      const data = await res.json();
      setEligibilityResult(data);
      if (data.eligible) {
        if (data.charge) {
          setFormData(prev => ({ ...prev, chargeamount: data.charge }));
        }
        setStep(3);
      } else {
        // Stay on step 2, show non-eligible message
      }
    } catch (err) {
      setError(t('common.error'));
    }
    setLoading(false);
  };

  const checkWarranty = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/complaint/warranty-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: formData.productgroup, model: formData.model, dop: formData.dop })
      });
      const data = await res.json();
      
      setFormData(prev => ({
        ...prev,
        warrantystatus: data.warrantystatus || 'OW',
        chargeamount: data.chargeamount || prev.chargeamount || getDefaultCharge(prev.productgroup)
      }));
      setStep(7);
    } catch (err) {
      // For local testing without n8n working, mock it
      console.error(err);
      setFormData(prev => ({
        ...prev,
        warrantystatus: 'OW',
        chargeamount: prev.chargeamount || getDefaultCharge(prev.productgroup)
      }));
      setStep(7);
      setError('Note: Warranty check proxy failed. Using mocked Out of Warranty response for testing.');
    }
    setLoading(false);
  };



  const submitRegistration = async (decision = '') => {
    setLoading(true);
    setError('');
    
    if (decision) {
      formData.decision = decision;
    }

    try {
      const formPayload = new FormData();
      Object.keys(formData).forEach(key => formPayload.append(key, formData[key]));
      
      if (files.modelserialimg) formPayload.append('modelserialimg', files.modelserialimg);
      if (files.productimg) formPayload.append('productimg', files.productimg);
      if (files.invoiceimg) formPayload.append('invoiceimg', files.invoiceimg);
      if (files.paymentproofimg) formPayload.append('paymentproofimg', files.paymentproofimg);

      const res = await fetch('/api/complaint/register', {
        method: 'POST',
        body: formPayload,
      });
      const data = await res.json();
      
      if (data.success) {
        setFinalResult(data);
        setStep(8);
      } else {
        setError(data.message || t('common.error'));
      }
    } catch (err) {
      console.error(err);
      setError(t('common.error'));
    }
    setLoading(false);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="glass-panel">
            <h2>{t('complaint.step1Title')}</h2>
            <p>{t('complaint.step1Desc')}</p>
            <div className="form-group">
              <label className="form-label">{t('complaint.productGroupLabel')}</label>
              <select name="productgroup" className="form-control" value={formData.productgroup} onChange={handleInputChange}>
                <option value="">{t('common.selectOption')}</option>
                {productGroups.map(pg => (
                  <option key={pg} value={pg}>
                    {t(`productCategories.${pg}`) || pg}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!formData.productgroup}>
              {t('common.next')}
            </button>
          </div>
        );
      case 2:
        return (
          <div className="glass-panel">
            <h2>{t('complaint.step2Title')}</h2>
            <div className="form-group">
              <label className="form-label">{t('complaint.modelLabel')}</label>
              <select name="model" className="form-control" value={formData.model} onChange={handleInputChange}>
                <option value="">{t('common.selectOption')}</option>
                {models[formData.productgroup]?.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            
            {eligibilityResult && !eligibilityResult.eligible && (
              <div className="form-group" style={{ color: 'var(--error-color)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', marginTop: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>
                  <strong>{t('complaint.notEligibleTitle')}:</strong> {t('complaint.notEligibleMsg')}
                </p>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {t('common.contactSupport')}
                </p>
                <a
                  href="https://wa.me/966541463161"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', background: '#25D366', color: '#ffffff', width: 'auto', border: 'none' }}
                >
                  💬 {t('common.returnToWhatsapp')}
                </a>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => { setStep(1); setEligibilityResult(null); }}>
                {t('common.back')}
              </button>
              {(!eligibilityResult || eligibilityResult.eligible) && (
                <button className="btn btn-primary" onClick={checkEligibility} disabled={!formData.model || loading}>
                  {loading ? <div className="spinner" /> : t('common.next')}
                </button>
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="glass-panel">
            <h2>{t('complaint.step3Title')}</h2>
            <div className="form-group">
              <label className="form-label">{t('complaint.phoneLabel')}</label>
              <input type="text" name="phone" className="form-control" value={formData.phone} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">{t('complaint.customerName')}</label>
              <input type="text" name="customername" className="form-control" placeholder={t('complaint.customerNamePlaceholder')} value={formData.customername} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('complaint.altMobile')}</label>
              <input type="text" name="altmobile" className="form-control" placeholder={t('complaint.altMobilePlaceholder')} value={formData.altmobile} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('complaint.address')}</label>
              <textarea name="address" className="form-control" style={{minHeight: '80px'}} placeholder={t('complaint.addressPlaceholder')} value={formData.address} onChange={handleInputChange} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">{t('complaint.city')}</label>
                <input type="text" name="city" className="form-control" placeholder={t('complaint.cityPlaceholder')} value={formData.city} onChange={handleInputChange} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">{t('complaint.area')}</label>
                <input type="text" name="area" className="form-control" placeholder={t('complaint.areaPlaceholder')} value={formData.area} onChange={handleInputChange} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>{t('common.back')}</button>
              <button className="btn btn-primary" onClick={() => setStep(4)} disabled={!formData.customername || !formData.address || !formData.city}>{t('common.next')}</button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="glass-panel">
            <h2>{t('complaint.step4Title')}</h2>
            <div className="form-group">
              <label className="form-label">{t('complaint.modelSerialPhoto')}</label>
              <label className="file-upload-wrapper">
                <input type="file" name="modelserialimg" accept="image/*" onChange={handleFileChange} />
                <div className="file-upload-icon">📸</div>
                <div className="file-upload-text">{t('complaint.modelSerialPhotoHelp')}</div>
              </label>
              {files.modelserialimg && <div className="file-preview">✅ {files.modelserialimg.name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">{t('complaint.productPhoto')}</label>
              <label className="file-upload-wrapper">
                <input type="file" name="productimg" accept="image/*" onChange={handleFileChange} />
                <div className="file-upload-icon">📺</div>
                <div className="file-upload-text">{t('complaint.productPhotoHelp')}</div>
              </label>
              {files.productimg && <div className="file-preview">✅ {files.productimg.name}</div>}
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(3)}>{t('common.back')}</button>
              <button className="btn btn-primary" onClick={() => setStep(5)} disabled={!files.modelserialimg || !files.productimg}>{t('common.next')}</button>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="glass-panel">
            <h2>{t('complaint.step5Title')}</h2>
            <div className="form-group">
              <label className="form-label">{t('complaint.dop')}</label>
              <input 
                type="date" 
                name="dop" 
                className="form-control" 
                value={formData.dop} 
                onChange={handleInputChange} 
                onClick={(e) => {
                  try {
                    if (e.target.showPicker) e.target.showPicker();
                  } catch (err) {
                    // ignore if already open
                  }
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('complaint.complaintDetails')}</label>
              <textarea name="complaintdetails" className="form-control" placeholder={t('complaint.complaintDetailsPlaceholder')} value={formData.complaintdetails} onChange={handleInputChange} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(4)}>{t('common.back')}</button>
              <button className="btn btn-primary" onClick={() => setStep(6)} disabled={!formData.dop || !formData.complaintdetails}>{t('common.next')}</button>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="glass-panel">
            <h2>{t('complaint.reviewTitle')}</h2>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <p><strong>{t('complaint.reviewProduct')}:</strong> {t(`productCategories.${formData.productgroup}`) || formData.productgroup} - {formData.model}</p>
              <p><strong>{t('complaint.reviewName')}:</strong> {formData.customername}</p>
              <p><strong>{t('complaint.reviewPhone')}:</strong> {formData.phone}</p>
              <p><strong>{t('complaint.reviewAddress')}:</strong> {formData.address}, {formData.area}, {formData.city}</p>
              <p><strong>{t('complaint.reviewDop')}:</strong> {formData.dop}</p>
            </div>
            {error && <p style={{color: 'var(--error-color)'}}>{error}</p>}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(5)}>{t('common.back')}</button>
              <button className="btn btn-primary" onClick={checkWarranty} disabled={loading}>
                {loading ? <div className="spinner" /> : t('complaint.checkWarrantyBtn')}
              </button>
            </div>
          </div>
        );
      case 7:
        if (formData.warrantystatus === 'IW') {
          return (
            <div className="glass-panel">
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2><span className="badge badge-success" style={{marginRight: lang === 'ar' ? '0' : '8px', marginLeft: lang === 'ar' ? '8px' : '0'}}>{t('complaint.inWarrantyTitle')}</span></h2>
              </div>
              <p>{t('complaint.inWarrantyMsg')}</p>

              {/* Mode Selection Tabs */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                margin: '1.5rem 0',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '0.5rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}>
                <button
                  type="button"
                  onClick={() => setIwRegOption('free')}
                  style={{
                    padding: '0.75rem 0.5rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: iwRegOption === 'free' ? 'var(--primary-color)' : 'transparent',
                    color: iwRegOption === 'free' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  🟢 {t('complaint.freeServiceOption')}
                </button>
                <button
                  type="button"
                  onClick={() => setIwRegOption('paid')}
                  style={{
                    padding: '0.75rem 0.5rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: iwRegOption === 'paid' ? 'linear-gradient(to right, #3b82f6, #8b5cf6)' : 'transparent',
                    color: iwRegOption === 'paid' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  💳 {t('complaint.paidServiceOption')}
                </button>
              </div>

              {iwRegOption === 'free' ? (
                <div>
                  <div className="form-group" style={{marginTop: '1rem'}}>
                    <label className="form-label">{t('complaint.invoicePhoto')}</label>
                    <label className="file-upload-wrapper">
                      <input type="file" name="invoiceimg" accept="image/*" onChange={handleFileChange} />
                      <div className="file-upload-icon">📄</div>
                      <div className="file-upload-text">{t('complaint.invoicePhotoHelp')}</div>
                    </label>
                    {files.invoiceimg && <div className="file-preview">✅ {files.invoiceimg.name}</div>}
                  </div>
                  {error && <p style={{color: 'var(--error-color)'}}>{error}</p>}
                  <button className="btn btn-primary" onClick={() => submitRegistration('')} disabled={!files.invoiceimg || loading}>
                    {loading ? <div className="spinner" /> : t('complaint.completeRegBtn')}
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                    <p style={{ color: '#93c5fd', fontSize: '0.875rem', margin: 0, lineHeight: '1.5' }}>
                      💡 <strong>{t('complaint.paidServiceOptionDesc')}</strong>
                    </p>
                  </div>

                  <h1 style={{ margin: '1rem 0 1.5rem 0', fontSize: '3rem', textAlign: 'center', color: '#a5b4fc', fontWeight: '700' }}>
                    {formData.chargeamount || getDefaultCharge(formData.productgroup)} {lang === 'ar' ? 'ر.س' : 'SAR'}
                  </h1>

                  <div style={{
                    marginTop: '1rem',
                    background: 'rgba(15, 23, 42, 0.75)',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.15)'
                  }}>
                    <BankDetailsCard t={t} lang={lang} />

                    <div className="form-group">
                      <label className="form-label">{t('complaint.uploadPaymentProof')}</label>
                      <label className="file-upload-wrapper">
                        <input type="file" name="paymentproofimg" accept="image/*" onChange={handleFileChange} />
                        <div className="file-upload-icon">🧾</div>
                        <div className="file-upload-text">{t('complaint.uploadPaymentProofHelp')}</div>
                      </label>
                      {files.paymentproofimg && <div className="file-preview">✅ {files.paymentproofimg.name}</div>}
                    </div>

                    {error && <p style={{color: 'var(--error-color)'}}>{error}</p>}
                    <button 
                      className="btn btn-primary" 
                      onClick={() => {
                        const finalCharge = formData.chargeamount || getDefaultCharge(formData.productgroup);
                        setFormData(prev => ({ ...prev, chargeamount: finalCharge, decision: 'accepted' }));
                        submitRegistration('accepted');
                      }} 
                      disabled={!files.paymentproofimg || loading}
                    >
                      {loading ? <div className="spinner" /> : t('complaint.submitPaidRegBtn')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        } else {
          // Out of warranty flow
          return (
            <div className="glass-panel">
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ border: '1px solid #b45309', color: '#f59e0b', background: 'rgba(180, 83, 9, 0.2)', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('complaint.outOfWarrantyTitle')}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>{t('complaint.outOfWarrantyMsg')}</p>
              <h1 style={{ margin: '2rem 0', fontSize: '3.5rem', textAlign: 'center', color: '#a5b4fc', fontWeight: '700' }}>
                {formData.chargeamount || getDefaultCharge(formData.productgroup)} {lang === 'ar' ? 'ر.س' : 'SAR'}
              </h1>
              
              {!declineConfirm && formData.decision !== 'accepted' && (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-secondary" onClick={() => setDeclineConfirm(true)}>{t('complaint.declineBtn')}</button>
                  <button className="btn btn-primary" onClick={() => setFormData(prev => ({...prev, decision: 'accepted', chargeamount: formData.chargeamount || getDefaultCharge(formData.productgroup)}))}>{t('complaint.acceptAndPay')}</button>
                </div>
              )}

              {declineConfirm && (
                <div style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                  <p>{t('complaint.cancelConfirmQuestion')}</p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button className="btn btn-secondary" onClick={() => setDeclineConfirm(false)}>{t('complaint.noGoBack')}</button>
                    <button className="btn btn-primary" style={{background: 'var(--error-color)'}} onClick={() => submitRegistration('cancelled')} disabled={loading}>
                      {loading ? <div className="spinner" /> : t('complaint.yesCancel')}
                    </button>
                  </div>
                </div>
              )}

              {formData.decision === 'accepted' && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{
                    marginTop: '1rem',
                    background: 'rgba(15, 23, 42, 0.75)',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.15)'
                  }}>
                    <BankDetailsCard t={t} lang={lang} />

                    <div className="form-group">
                      <label className="form-label">{t('complaint.uploadPaymentProof')}</label>
                      <label className="file-upload-wrapper">
                        <input type="file" name="paymentproofimg" accept="image/*" onChange={handleFileChange} />
                        <div className="file-upload-icon">🧾</div>
                        <div className="file-upload-text">{t('complaint.uploadPaymentProofHelp')}</div>
                      </label>
                      {files.paymentproofimg && <div className="file-preview">✅ {files.paymentproofimg.name}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">{t('complaint.invoicePhoto')} ({lang === 'ar' ? 'اختياري' : 'Optional'})</label>
                      <label className="file-upload-wrapper">
                        <input type="file" name="invoiceimg" accept="image/*" onChange={handleFileChange} />
                        <div className="file-upload-icon">📄</div>
                        <div className="file-upload-text">{t('complaint.invoicePhotoHelp')}</div>
                      </label>
                      {files.invoiceimg && <div className="file-preview">✅ {files.invoiceimg.name}</div>}
                    </div>

                    {error && <p style={{color: 'var(--error-color)'}}>{error}</p>}
                    <button className="btn btn-primary" onClick={() => submitRegistration('accepted')} disabled={!files.paymentproofimg || loading}>
                      {loading ? <div className="spinner" /> : t('complaint.submitPaymentProofBtn')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        }
      case 8:
        if (finalResult?.status === 'OW_CANCELLED') {
          return (
            <div className="glass-panel" style={{textAlign: 'center'}}>
              <div style={{fontSize: '4rem', marginBottom: '1rem'}}>✖️</div>
              <h2>{t('complaint.requestCancelledTitle')}</h2>
              <p>{t('complaint.requestCancelledMsg')}</p>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {t('common.contactSupport')}
              </p>
              <div style={{ marginTop: '1.5rem' }}>
                <a
                  href="https://wa.me/966541463161"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', background: '#25D366', color: '#ffffff', border: 'none' }}
                >
                  💬 {t('common.returnToWhatsapp')}
                </a>
              </div>
            </div>
          );
        }
        if (finalResult?.status === 'PENDING_PAYMENT_VERIFICATION') {
          return (
            <div className="glass-panel" style={{textAlign: 'center'}}>
              <div style={{fontSize: '4rem', marginBottom: '1rem'}}>⏳</div>
              <h2>{t('complaint.underReviewTitle')}</h2>
              <p>{t('complaint.underReviewMsg')}</p>
              <p>{t('complaint.underReviewWait')}</p>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {t('common.contactSupport')}
              </p>
              <div style={{ marginTop: '1.5rem' }}>
                <a
                  href="https://wa.me/966541463161"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', background: '#25D366', color: '#ffffff', border: 'none' }}
                >
                  💬 {t('common.returnToWhatsapp')}
                </a>
              </div>
            </div>
          );
        }
        return (
          <div className="glass-panel" style={{textAlign: 'center'}}>
            <div style={{fontSize: '4rem', marginBottom: '1rem'}}>✅</div>
            <h2>{t('complaint.regSuccessTitle')}</h2>
            <p>{t('complaint.regSuccessMsg')}</p>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '8px', margin: '1.5rem 0' }}>
              <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>{t('complaint.yourServiceUid')}</span>
              <h2 style={{color: 'var(--success-color)', margin: '0.5rem 0 0'}}>{finalResult?.uid}</h2>
            </div>
            <p>{t('complaint.confirmationWhatsapp')}</p>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {t('common.contactSupport')}
            </p>
            <div style={{ marginTop: '1.5rem' }}>
              <a
                href="https://wa.me/966541463161"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', background: '#25D366', color: '#ffffff', border: 'none' }}
              >
                💬 {t('common.returnToWhatsapp')}
              </a>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container">
      <Head>
        <title>{`Impex - ${t('complaint.headerTitle')}`}</title>
      </Head>
      
      <div className="page-top-panel">
        <h1 style={{ fontSize: '1.75rem', margin: 0 }}>{t('complaint.headerTitle')}</h1>
        <LanguageSwitcher />
      </div>
      
      {step < 8 && (
        <div className="steps-indicator">
          {[1,2,3,4,5,6,7].map(s => (
            <div key={s} className={`step ${step === s ? 'active' : ''} ${step > s ? 'completed' : ''}`}>
              {step > s ? '✓' : s}
            </div>
          ))}
        </div>
      )}

      {renderStep()}
    </div>
  );
}

