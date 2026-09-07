import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import imageCompression from 'browser-image-compression';
import { useLanguage } from '@/lib/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function ComplaintForm() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
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
        chargeamount: data.chargeamount || 0
      }));
      setStep(7);
    } catch (err) {
      // For local testing without n8n working, mock it
      console.error(err);
      setFormData(prev => ({
        ...prev,
        warrantystatus: 'OW',
        chargeamount: 150
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
              <input type="date" name="dop" className="form-control" value={formData.dop} onChange={handleInputChange} />
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
              <h2><span className="badge badge-success" style={{marginRight: lang === 'ar' ? '0' : '8px', marginLeft: lang === 'ar' ? '8px' : '0'}}>{t('complaint.inWarrantyTitle')}</span></h2>
              <p>{t('complaint.inWarrantyMsg')}</p>
              <div className="form-group" style={{marginTop: '1.5rem'}}>
                <label className="form-label">{t('complaint.invoicePhoto')}</label>
                <label className="file-upload-wrapper">
                  <input type="file" name="invoiceimg" accept="image/*" onChange={handleFileChange} />
                  <div className="file-upload-icon">📄</div>
                  <div className="file-upload-text">{t('complaint.invoicePhotoHelp')}</div>
                </label>
                {files.invoiceimg && <div className="file-preview">✅ {files.invoiceimg.name}</div>}
              </div>
              {error && <p style={{color: 'var(--error-color)'}}>{error}</p>}
              <button className="btn btn-primary" onClick={() => submitRegistration('accepted')} disabled={!files.invoiceimg || loading}>
                {loading ? <div className="spinner" /> : t('complaint.completeRegBtn')}
              </button>
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
                {formData.chargeamount} {lang === 'ar' ? 'ر.س' : 'SAR'}
              </h1>
              
              {!declineConfirm && formData.decision !== 'accepted' && (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-secondary" onClick={() => setDeclineConfirm(true)}>{t('complaint.declineBtn')}</button>
                  <button className="btn btn-primary" onClick={() => setFormData(prev => ({...prev, decision: 'accepted'}))}>{t('complaint.acceptAndPay')}</button>
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
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <h3 style={{marginBottom: '0.5rem'}}>{t('complaint.bankDetailsTitle')}</h3>
                    <p style={{fontFamily: 'monospace', lineHeight: '1.8'}}>{t('complaint.bankName')}<br/>{t('complaint.iban')}<br/>{t('complaint.accountName')}</p>
                  </div>
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
                  <button className="btn btn-primary" onClick={() => submitRegistration('accepted')} disabled={!files.paymentproofimg || loading}>
                    {loading ? <div className="spinner" /> : t('complaint.submitPaymentProofBtn')}
                  </button>
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
        <title>Impex - {t('complaint.headerTitle')}</title>
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

