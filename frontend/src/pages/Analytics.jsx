import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { AlertTriangle, BarChart3, ShieldAlert } from 'lucide-react';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/summary');
        setData(res.data);
      } catch (err) {
        console.error("Analytics load error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Calculating analytics & Isolation Forest anomalies...</div>;
  }

  const { summary, monthly_trend, category_breakdown, payment_mode_breakdown, anomalies } = data || {};

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem' }}>Financial Analytics & Anomaly Detection</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          PostgreSQL data analytics paired with scikit-learn Isolation Forest machine learning anomaly flags
        </p>
      </div>

      {/* Grid Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Category Breakdown Bar Chart */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Category Expense Distribution (₹)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={category_breakdown || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="category" type="category" stroke="#6b7280" fontSize={12} width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#131b2e', borderColor: '#1f293d', borderRadius: '8px' }} />
                <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} name="Total Spent (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Mode Pie Chart */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Payment Mode Share</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={payment_mode_breakdown || []}
                  dataKey="total"
                  nameKey="payment_mode"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {(payment_mode_breakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#131b2e', borderColor: '#1f293d', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Isolation Forest Anomaly Detection Section */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <ShieldAlert color="#ef4444" size={22} />
          <div>
            <h3 style={{ fontSize: '1.1rem' }}>Isolation Forest Anomaly Detection</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Unusual spending spikes and transaction outliers flagged by ML model
            </p>
          </div>
        </div>

        {anomalies && anomalies.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(15, 22, 38, 0.8)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem' }}>TX ID</th>
                <th style={{ padding: '0.75rem' }}>DATE</th>
                <th style={{ padding: '0.75rem' }}>CATEGORY</th>
                <th style={{ padding: '0.75rem' }}>AMOUNT</th>
                <th style={{ padding: '0.75rem' }}>ANOMALY SCORE</th>
                <th style={{ padding: '0.75rem' }}>ML DETECTED REASON</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((an) => (
                <tr key={an.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '0.75rem', color: 'var(--text-dim)' }}>#{an.id}</td>
                  <td style={{ padding: '0.75rem' }}>{an.date}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>{an.category}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: '#f87171' }}>
                    ₹{an.amount?.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className="badge badge-danger">{an.anomaly_score}</span>
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{an.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ fontSize: '0.88rem', color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '8px' }}>
            ✓ No anomalous transactions detected in current historical pattern.
          </p>
        )}
      </div>

    </div>
  );
};

export default Analytics;
