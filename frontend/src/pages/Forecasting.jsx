import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  TrendingUp,
  Sliders,
  Cpu,
  Calendar,
  AlertCircle,
  CheckCircle,
  Play
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const MODELS = [
  'LSTM', 'GRU', 'Bi-LSTM', 'Random Forest', 'XGBoost',
  'LightGBM', 'Linear Regression', 'ARIMA', 'Prophet', 'Moving Average'
];

const Forecasting = () => {
  const [selectedModel, setSelectedModel] = useState('LSTM');
  const [horizonMonths, setHorizonMonths] = useState(6);
  const [forecastData, setForecastData] = useState(null);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchForecast = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/forecast', {
        model_name: selectedModel,
        horizon_months: horizonMonths
      });
      setForecastData(res.data.forecast);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate forecast.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/models/metrics');
        setModelMetrics(res.data);
      } catch (err) {}
    };
    fetchMetrics();
    fetchForecast();
  }, [selectedModel]);

  // Combine historical and prediction points for continuous chart line
  const chartPoints = React.useMemo(() => {
    if (!forecastData) return [];
    const hist = (forecastData.historical || []).map(h => ({
      month: h.month || h.date,
      date: h.month || h.date,
      Historical: h.actual !== undefined ? h.actual : h.amount,
      Forecast: null
    }));

    const lastHist = hist[hist.length - 1];
    const preds = (forecastData.forecast || forecastData.predictions || []).map((p, idx) => ({
      month: p.month || p.date,
      date: p.month || p.date,
      Historical: idx === 0 && lastHist ? lastHist.Historical : null,
      Forecast: p.predicted !== undefined ? p.predicted : p.amount
    }));

    return [...hist, ...preds];
  }, [forecastData]);

  const currentModelMetric = modelMetrics?.metrics?.find(m => m.model_name.toLowerCase() === selectedModel.toLowerCase());

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem' }}>AI Expenditure Forecasting Engine</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Loads pre-trained model artifacts from disk and generates personalized multi-month predictions
        </p>
      </div>

      {/* Control Panel */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Model Selector */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            SELECT PRE-TRAINED MODEL
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="form-select"
          >
            {MODELS.map(m => (
              <option key={m} value={m}>
                {m} {modelMetrics?.best_model === m ? '★ (Best Model)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Horizon Slider */}
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              FORECAST HORIZON
            </label>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
              {horizonMonths} Months Ahead
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="12"
            value={horizonMonths}
            onChange={(e) => setHorizonMonths(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
        </div>

        {/* Run Forecast Button */}
        <div>
          <button onClick={fetchForecast} disabled={loading} className="glow-btn" style={{ padding: '0.75rem 1.5rem' }}>
            <Play size={16} />
            <span>{loading ? 'Executing Prediction...' : 'Generate Forecast'}</span>
          </button>
        </div>

      </div>

      {/* Selected Model Performance Pill */}
      {currentModelMetric && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid var(--border-glow)',
          borderRadius: '8px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Cpu color="#818cf8" size={18} />
            <span>Active Artifact: <strong>{selectedModel}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)' }}>
            <span>MAE: <strong style={{ color: '#fff' }}>₹{currentModelMetric.mae?.toLocaleString('en-IN')}</strong></span>
            <span>RMSE: <strong style={{ color: '#fff' }}>₹{currentModelMetric.rmse?.toLocaleString('en-IN')}</strong></span>
            <span>R² Score: <strong style={{ color: '#34d399' }}>{currentModelMetric.r2?.toFixed(4)}</strong></span>
          </div>
        </div>
      )}

      {/* Insufficient Data Warning or Error */}
      {forecastData?.insufficient_data ? (
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <AlertCircle size={48} color="#f59e0b" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Insufficient Transaction History</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto', fontSize: '0.9rem' }}>
            {forecastData.error}
          </p>
        </div>
      ) : (
        /* Historical vs Predicted Expenditure Chart */
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
            Historical vs Predicted Monthly Expenditure (₹)
          </h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#131b2e', borderColor: '#1f293d', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="Historical" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} name="Historical Expenses" />
                <Line type="monotone" dataKey="Forecast" stroke="#06b6d4" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 5 }} name={`Forecast (${selectedModel})`} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Forecast Numbers Table */}
      {forecastData?.predictions && forecastData.predictions.length > 0 && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Projected Expenditure Schedule</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            {forecastData.predictions.map((p) => (
              <div key={p.date} style={{
                background: 'rgba(15, 22, 38, 0.8)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{p.date}</p>
                <h4 style={{ fontSize: '1.25rem', color: '#22d3ee', marginTop: '0.3rem', fontWeight: 700 }}>
                  ₹{p.amount?.toLocaleString('en-IN')}
                </h4>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default Forecasting;
