import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlusCircle, Database, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const getPageTitle = (path) => {
    switch (path) {
      case '/': return 'Executive Financial Dashboard';
      case '/transactions': return 'Transaction Management & Records';
      case '/receipts': return 'Receipt Scanner & Tesseract OCR';
      case '/analytics': return 'Financial Analytics & Isolation Forest';
      case '/insights': return 'Dynamic Financial Insights';
      case '/models': return '10 Model Forecasting Evaluation Matrix';
      case '/forecast': return 'Pre-Trained Model Forecast Engine';
      case '/assistant': return 'RAG AI Assistant (FAISS + LLM)';
      case '/profile': return 'User Profile & Security Settings';
      default: return 'Financial AI System';
    }
  };

  return (
    <header style={{
      height: '70px',
      backgroundColor: 'rgba(15, 22, 38, 0.8)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      marginLeft: '260px'
    }}>
      <div>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{getPageTitle(location.pathname)}</h1>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Connected to PostgreSQL Database | User ID: #{user?.id}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#34d399',
          padding: '0.4rem 0.8rem',
          borderRadius: '20px',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          fontSize: '0.8rem',
          fontWeight: 600
        }}>
          <Database size={14} />
          <span>PostgreSQL Active</span>
        </div>

        <button
          onClick={() => navigate('/transactions?add=true')}
          className="glow-btn"
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          <PlusCircle size={16} />
          <span>Add Transaction</span>
        </button>

        <button
          onClick={() => navigate('/assistant')}
          style={{
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            color: '#fff',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)'
          }}
        >
          <Sparkles size={16} />
          <span>Ask AI Assistant</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
