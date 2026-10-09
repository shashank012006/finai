import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  DollarSign,
  Calendar,
  Tag,
  Building
} from 'lucide-react';

const ReceiptScanner = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [ocrResponse, setOcrResponse] = useState(null);
  const [error, setError] = useState('');
  
  // Editable parsed fields
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Food');
  const [paymentMode, setPaymentMode] = useState('Card');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setOcrResponse(null);
      setError('');
      setSavedSuccess(false);
    }
  };

  const handleUploadAndScan = async () => {
    if (!selectedFile) return;

    setScanning(true);
    setError('');
    setOcrResponse(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await api.post('/receipts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = res.data.receipt;
      setOcrResponse(data);
      
      setMerchant(data.merchant_name || 'Retail Store');
      setAmount(data.extracted_amount || 0);
      setDate(data.extracted_date || new Date().toISOString().split('T')[0]);
      setCategory(data.extracted_category || 'Food');
      setPaymentMode(data.payment_mode || 'Card');
      setNotes(`Scanned receipt: ${data.merchant_name}`);

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to scan receipt image.');
    } finally {
      setScanning(false);
    }
  };

  const handleConfirmAndSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/receipts/confirm', {
        receipt_id: ocrResponse?.id,
        merchant_name: merchant,
        amount: parseFloat(amount),
        date: date,
        category: category,
        payment_mode: paymentMode,
        notes: notes
      });

      setSavedSuccess(true);
      setTimeout(() => {
        navigate('/transactions');
      }, 1500);

    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem' }}>Receipt Scanner & Tesseract OCR</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Automated receipt parsing powered by Pillow preprocessing & Tesseract OCR engine
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: previewUrl ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
        
        {/* Upload & Image Preview Box */}
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
          {!previewUrl ? (
            <div style={{
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '3rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              cursor: 'pointer'
            }}>
              <UploadCloud size={48} color="var(--primary)" />
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Upload Receipt Image</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Supports PNG, JPG, JPEG, WEBP receipt photos</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="receipt-upload-input"
              />
              <label htmlFor="receipt-upload-input" className="glow-btn" style={{ cursor: 'pointer' }}>
                Select Receipt File
              </label>
            </div>
          ) : (
            <div>
              <div style={{ maxHeight: '350px', overflow: 'hidden', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
                <img src={previewUrl} alt="Receipt preview" style={{ width: '100%', objectFit: 'contain', maxHeight: '350px' }} />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <label htmlFor="receipt-upload-input" style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '0.6rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Change Image
                </label>
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} id="receipt-upload-input" />
                
                <button
                  onClick={handleUploadAndScan}
                  disabled={scanning}
                  className="glow-btn"
                >
                  {scanning ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Running Tesseract OCR...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Scan & Extract Details</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              marginTop: '1.25rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              textAlign: 'left'
            }}>
              <AlertTriangle size={16} style={{ display: 'inline', marginRight: '0.4rem' }} />
              {error}
            </div>
          )}
        </div>

        {/* OCR Result Review & Edit Form */}
        {ocrResponse && (
          <div className="glass-card animate-fade-in" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <CheckCircle2 color="#34d399" size={22} />
              <h3 style={{ fontSize: '1.2rem' }}>Review Extracted Receipt Details</h3>
            </div>

            <form onSubmit={handleConfirmAndSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  MERCHANT / STORE NAME
                </label>
                <input
                  type="text"
                  required
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    EXTRACTED AMOUNT (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    TRANSACTION DATE
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    CATEGORY
                  </label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-select">
                    <option value="Food">Food</option>
                    <option value="Rent">Rent</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                    PAYMENT MODE
                  </label>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="form-select">
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  NOTES / DESCRIPTION
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Raw OCR Text Drawer */}
              <details style={{ marginTop: '0.5rem', background: 'rgba(15, 22, 38, 0.8)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  View Raw Tesseract OCR Output
                </summary>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem', maxHeight: '120px', overflowY: 'auto' }}>
                  {ocrResponse.raw_text || 'No text extracted'}
                </pre>
              </details>

              <button
                type="submit"
                disabled={saving || savedSuccess}
                className="glow-btn"
                style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
              >
                {savedSuccess ? 'Saved to PostgreSQL!' : saving ? 'Confirming...' : 'Confirm & Save Transaction'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReceiptScanner;
