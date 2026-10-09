import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import ReceiptScanner from './pages/ReceiptScanner';
import Analytics from './pages/Analytics';
import Insights from './pages/Insights';
import ModelComparison from './pages/ModelComparison';
import Forecasting from './pages/Forecasting';
import AIAssistant from './pages/AIAssistant';
import Profile from './pages/Profile';

const ProtectedLayout = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-dark)', color: 'var(--text-muted)' }}>
        <p>Loading FinAI Application...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-dark)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ marginLeft: '260px', flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Protected Main Application Routes */}
          <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/transactions" element={<ProtectedLayout><Transactions /></ProtectedLayout>} />
          <Route path="/receipts" element={<ProtectedLayout><ReceiptScanner /></ProtectedLayout>} />
          <Route path="/analytics" element={<ProtectedLayout><Analytics /></ProtectedLayout>} />
          <Route path="/insights" element={<ProtectedLayout><Insights /></ProtectedLayout>} />
          <Route path="/models" element={<ProtectedLayout><ModelComparison /></ProtectedLayout>} />
          <Route path="/forecast" element={<ProtectedLayout><Forecasting /></ProtectedLayout>} />
          <Route path="/assistant" element={<ProtectedLayout><AIAssistant /></ProtectedLayout>} />
          <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
