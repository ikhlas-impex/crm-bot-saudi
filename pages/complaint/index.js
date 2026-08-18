import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import imageCompression from 'browser-image-compression';

export default function ComplaintForm() {
  const router = useRouter();
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
      setError('Failed to check eligibility. Please try again.');
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
        body: JSON.stringify({ category: formData.productgroup, dop: formData.dop })
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
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      console.error(err);
      setError('Network error during registration. Please check console.');
    }
    setLoading(false);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="glass-panel">
            <h2>Select Product Category</h2>
            <p>Please tell us what kind of product you have.</p>
            <div className="form-group">
              <label className="form-label">Product Group</label>
              <select name="productgroup" className="form-control" value={formData.productgroup} onChange={handleInputChange}>
                <option value="">Select...</option>
                {productGroups.map(pg => <option key={pg} value={pg}>{pg}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!formData.productgroup}>Next</button>
          </div>
        );
      case 2:
        return (
          <div className="glass-panel">
            <h2>Select Model</h2>
            <div className="form-group">
              <label className="form-label">Model</label>
              <select name="model" className="form-control" value={formData.model} onChange={handleInputChange}>
                <option value="">Select...</option>
                {models[formData.productgroup]?.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            
            {eligibilityResult && !eligibilityResult.eligible && (
              <div className="form-group" style={{ color: 'var(--error-color)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                <strong>Not Eligible:</strong> Please hand this product to your nearest service center. We cannot process this online.
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => { setStep(1); setEligibilityResult(null); }}>Back</button>
              {(!eligibilityResult || eligibilityResult.eligible) && (
                <button className="btn btn-primary" onClick={checkEligibility} disabled={!formData.model || loading}>
                  {loading ? <div className="spinner" /> : 'Next'}
                </button>
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="glass-panel">
            <h2>Customer Details</h2>
            <div className="form-group">
              <label className="form-label">Phone Number (from WhatsApp)</label>
              <input type="text" name="phone" className="form-control" value={formData.phone} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">Customer Name</label>
              <input type="text" name="customername" className="form-control" value={formData.customername} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Alternate Mobile</label>
              <input type="text" name="altmobile" className="form-control" value={formData.altmobile} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea name="address" className="form-control" style={{minHeight: '80px'}} value={formData.address} onChange={handleInputChange} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">City</label>
                <input type="text" name="city" className="form-control" value={formData.city} onChange={handleInputChange} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Area</label>
                <input type="text" name="area" className="form-control" value={formData.area} onChange={handleInputChange} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary" onClick={() => setStep(4)} disabled={!formData.customername || !formData.address || !formData.city}>Next</button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="glass-panel">
            <h2>Photo Uploads</h2>
            <div className="form-group">
              <label className="form-label">Model/Serial Number Photo</label>
              <label className="file-upload-wrapper">
                <input type="file" name="modelserialimg" accept="image/*" onChange={handleFileChange} />
                <div className="file-upload-icon">📸</div>
                <div className="file-upload-text">Tap to upload Model/Serial image</div>
              </label>
              {files.modelserialimg && <div className="file-preview">✅ {files.modelserialimg.name}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Product Photo</label>
              <label className="file-upload-wrapper">
                <input type="file" name="productimg" accept="image/*" onChange={handleFileChange} />
                <div className="file-upload-icon">📺</div>
                <div className="file-upload-text">Tap to upload Product image</div>
              </label>
              {files.productimg && <div className="file-preview">✅ {files.productimg.name}</div>}
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(3)}>Back</button>
              <button className="btn btn-primary" onClick={() => setStep(5)} disabled={!files.modelserialimg || !files.productimg}>Next</button>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="glass-panel">
            <h2>Complaint Details</h2>
            <div className="form-group">
              <label className="form-label">Date of Purchase</label>
              <input type="date" name="dop" className="form-control" value={formData.dop} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Complaint Details</label>
              <textarea name="complaintdetails" className="form-control" placeholder="Please describe the issue..." value={formData.complaintdetails} onChange={handleInputChange} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(4)}>Back</button>
              <button className="btn btn-primary" onClick={() => setStep(6)} disabled={!formData.dop || !formData.complaintdetails}>Next</button>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="glass-panel">
            <h2>Review Details</h2>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <p><strong>Product:</strong> {formData.productgroup} - {formData.model}</p>
              <p><strong>Name:</strong> {formData.customername}</p>
              <p><strong>Phone:</strong> {formData.phone}</p>
              <p><strong>Address:</strong> {formData.address}, {formData.area}, {formData.city}</p>
              <p><strong>DOP:</strong> {formData.dop}</p>
            </div>
            {error && <p style={{color: 'var(--error-color)'}}>{error}</p>}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(5)}>Back</button>
              <button className="btn btn-primary" onClick={checkWarranty} disabled={loading}>
                {loading ? <div className="spinner" /> : 'Check Warranty & Submit'}
              </button>
            </div>
          </div>
        );
      case 7:
        if (formData.warrantystatus === 'IW') {
          return (
            <div className="glass-panel">
              <h2><span className="badge badge-success" style={{marginRight: '8px'}}>In Warranty</span> Registration</h2>
              <p>Your product is eligible for In-Warranty service.</p>
              <div className="form-group" style={{marginTop: '1.5rem'}}>
                <label className="form-label">Please upload your Invoice Photo</label>
                <label className="file-upload-wrapper">
                  <input type="file" name="invoiceimg" accept="image/*" onChange={handleFileChange} />
                  <div className="file-upload-icon">📄</div>
                  <div className="file-upload-text">Tap to upload Invoice</div>
                </label>
                {files.invoiceimg && <div className="file-preview">✅ {files.invoiceimg.name}</div>}
              </div>
              {error && <p style={{color: 'var(--error-color)'}}>{error}</p>}
              <button className="btn btn-primary" onClick={() => submitRegistration('accepted')} disabled={!files.invoiceimg || loading}>
                {loading ? <div className="spinner" /> : 'Complete Registration'}
              </button>
            </div>
          );
        } else {
          // Out of warranty flow
          return (
            <div className="glass-panel">
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ border: '1px solid #b45309', color: '#f59e0b', background: 'rgba(180, 83, 9, 0.2)', padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Out of Warranty
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>Your product is out of warranty. The service charge is:</p>
              <h1 style={{ margin: '2rem 0', fontSize: '4rem', textAlign: 'center', color: '#a5b4fc', fontWeight: '700' }}>
                {formData.chargeamount} SAR
              </h1>
              
              {!declineConfirm && formData.decision !== 'accepted' && (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-secondary" onClick={() => setDeclineConfirm(true)}>Decline</button>
                  <button className="btn btn-primary" onClick={() => setFormData(prev => ({...prev, decision: 'accepted'}))}>Accept & Pay</button>
                </div>
              )}

              {declineConfirm && (
                <div style={{ marginTop: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px' }}>
                  <p>Are you sure you want to cancel the registration?</p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button className="btn btn-secondary" onClick={() => setDeclineConfirm(false)}>No, Go Back</button>
                    <button className="btn btn-primary" style={{background: 'var(--error-color)'}} onClick={() => submitRegistration('cancelled')} disabled={loading}>
                      {loading ? <div className="spinner" /> : 'Yes, Cancel'}
                    </button>
                  </div>
                </div>
              )}

              {formData.decision === 'accepted' && (
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <h3 style={{marginBottom: '0.5rem'}}>Bank Transfer Details</h3>
                    <p style={{fontFamily: 'monospace'}}>Bank: AL RAJHI BANK<br/>IBAN: SA123456789012345678<br/>Name: Impex Saudi</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Upload Payment Proof</label>
                    <label className="file-upload-wrapper">
                      <input type="file" name="paymentproofimg" accept="image/*" onChange={handleFileChange} />
                      <div className="file-upload-icon">🧾</div>
                      <div className="file-upload-text">Tap to upload Receipt</div>
                    </label>
                    {files.paymentproofimg && <div className="file-preview">✅ {files.paymentproofimg.name}</div>}
                  </div>
                  {error && <p style={{color: 'var(--error-color)'}}>{error}</p>}
                  <button className="btn btn-primary" onClick={() => submitRegistration('accepted')} disabled={!files.paymentproofimg || loading}>
                    {loading ? <div className="spinner" /> : 'Submit Payment Proof'}
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
              <h2>Request Cancelled</h2>
              <p>Your request has been logged as cancelled.</p>
              <p>You may now close this window.</p>
            </div>
          );
        }
        if (finalResult?.status === 'PENDING_PAYMENT_VERIFICATION') {
          return (
            <div className="glass-panel" style={{textAlign: 'center'}}>
              <div style={{fontSize: '4rem', marginBottom: '1rem'}}>⏳</div>
              <h2>Payment Under Review</h2>
              <p>Thank you. Your payment proof has been submitted successfully.</p>
              <p>Our team will verify the payment and send your Service UID via WhatsApp shortly.</p>
            </div>
          );
        }
        return (
          <div className="glass-panel" style={{textAlign: 'center'}}>
            <div style={{fontSize: '4rem', marginBottom: '1rem'}}>✅</div>
            <h2>Registration Successful</h2>
            <p>Your complaint has been registered successfully.</p>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '8px', margin: '1.5rem 0' }}>
              <span style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>Your Service UID</span>
              <h2 style={{color: 'var(--success-color)', margin: '0.5rem 0 0'}}>{finalResult?.uid}</h2>
            </div>
            <p>You will receive a confirmation message on WhatsApp.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container">
      <Head>
        <title>Impex - Complaint Registration</title>
      </Head>
      
      <h1 style={{fontSize: '1.75rem'}}>Impex Support</h1>
      
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
