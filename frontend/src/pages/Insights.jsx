import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Lightbulb, TrendingUp, DollarSign, AlertTriangle, Target, CheckCircle2 } from 'lucide-react';

const Insights = () => {
  const [insightsData, setInsightsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await api.get('/analytics/insights');
        setInsightsData(res.data);
      } catch (err) {
        console.error("Fetch insights error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Calculating dynamic insights from PostgreSQL...</div>;
  }

  const { insights, anomalies } = insightsData || {};

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem' }}>Personalized Financial Insights</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Automated rule-based & ML analytical observations derived from your actual database records
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {(insights || []).map((text, idx) => (
          <div key={idx} className="glass-card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Lightbulb size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.35rem', color: '#fff' }}>Insight #{idx + 1}</h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {text}
              </p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Insights;
