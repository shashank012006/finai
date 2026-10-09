import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Cpu, Award, Info, CheckCircle2, TrendingUp } from 'lucide-react';

const ModelComparison = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/models/metrics');
        setData(res.data);
      } catch (err) {
        console.error("Fetch model metrics error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading pre-trained 10 model metrics...</div>;
  }

  const { metrics, best_model, trained_at } = data || {};

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem' }}>10 Model Evaluation & Comparison Matrix</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Real empirical metrics (MAE, RMSE, R²) evaluated on chronological time-series split
        </p>
      </div>

      {/* Best Model Banner */}
      {best_model && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={28} />
          </div>
          <div>
            <span className="badge badge-success" style={{ marginBottom: '0.3rem' }}>Best Performing Model</span>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
              {best_model} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>achieved lowest Mean Absolute Error (MAE)</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Training Completed: {trained_at ? new Date(trained_at).toLocaleString() : 'Recent'} | Model Artifacts Persisted in <code>models/</code>
            </p>
          </div>
        </div>
      )}

      {/* Notice Banner */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '1rem',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Info size={18} color="#6366f1" />
        <span>
          Note: Model evaluation uses chronological split (no random shuffle) to prevent time-series data leakage. Metrics reflect actual test performance on historical expenditure data.
        </span>
      </div>

      {/* Metrics Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(15, 22, 38, 0.9)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '1rem' }}>RANK</th>
              <th style={{ padding: '1rem' }}>MODEL NAME</th>
              <th style={{ padding: '1rem' }}>MAE (LOWER IS BETTER)</th>
              <th style={{ padding: '1rem' }}>RMSE (LOWER IS BETTER)</th>
              <th style={{ padding: '1rem' }}>R² SCORE (HIGHER IS BETTER)</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {(metrics || []).map((m, idx) => (
              <tr key={m.model_name} style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                backgroundColor: m.is_best ? 'rgba(16, 185, 129, 0.05)' : 'transparent'
              }}>
                <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-dim)' }}>#{idx + 1}</td>
                <td style={{ padding: '1rem', fontWeight: 600, color: m.is_best ? '#34d399' : '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Cpu size={16} color={m.is_best ? '#34d399' : 'var(--text-muted)'} />
                    <span>{m.model_name}</span>
                  </div>
                </td>
                <td style={{ padding: '1rem', fontWeight: 700 }}>₹{m.mae?.toLocaleString('en-IN')}</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>₹{m.rmse?.toLocaleString('en-IN')}</td>
                <td style={{ padding: '1rem', color: m.r2 >= 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>
                  {m.r2?.toFixed(4)}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  {m.is_best ? (
                    <span className="badge badge-success">BEST MODEL</span>
                  ) : (
                    <span className="badge badge-primary">TRAINED & SAVED</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default ModelComparison;
