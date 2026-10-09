import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Receipt,
  ScanLine,
  Cpu,
  ArrowRight,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

const Dashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [anRes, txRes, modRes] = await Promise.all([
          api.get('/analytics/summary'),
          api.get('/transactions?sort_by=date&order=desc'),
          api.get('/models/metrics')
        ]);
        setAnalytics(anRes.data);
        setTransactions(txRes.data.transactions.slice(0, 6));
        setModelMetrics(modRes.data);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading live PostgreSQL dashboard metrics...</p>
      </div>
    );
  }

  const summary = analytics?.summary || {};

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Banner KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL INCOME</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#34d399' }}>
            ₹{summary.total_income?.toLocaleString('en-IN') || 0}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Aggregated from income records</p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL EXPENSES</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={20} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f87171' }}>
            ₹{summary.total_expense?.toLocaleString('en-IN') || 0}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Total expense expenditure</p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>NET SAVINGS</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PiggyBank size={20} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: summary.net_savings >= 0 ? '#818cf8' : '#f87171' }}>
            ₹{summary.net_savings?.toLocaleString('en-IN') || 0}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Savings Rate: {summary.savings_rate}%</p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TRANSACTIONS</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={20} />
            </div>
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#22d3ee' }}>
            {summary.transaction_count || 0}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Avg Monthly: ₹{summary.avg_monthly_expense?.toLocaleString('en-IN') || 0}</p>
        </div>
      </div>

      {/* Model Best Performer Banner */}
      {modelMetrics?.best_model && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
          border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius-md)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Cpu size={24} />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>
                Best AI Forecasting Model: <span style={{ color: '#818cf8' }}>{modelMetrics.best_model}</span>
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Evaluated across 10 ML models (LSTM, GRU, Bi-LSTM, XGBoost, Prophet, ARIMA, etc.) on historical chronological data.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/forecast')}
            className="glow-btn"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <span>Run Forecast</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        
        {/* Monthly Income vs Expenses Trend Chart */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Monthly Financial Cashflow Trend</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.monthly_trend || []}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#131b2e', borderColor: '#1f293d', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#incomeGrad)" name="Income (₹)" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#expenseGrad)" name="Expense (₹)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Donut Chart */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Category Distribution</h3>
          <div style={{ width: '100%', height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.category_breakdown || []}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                >
                  {(analytics?.category_breakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#131b2e', borderColor: '#1f293d', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            {(analytics?.top_categories || []).slice(0, 4).map((c, i) => (
              <span key={c.category} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[i % COLORS.length] }}></span>
                {c.category} ({c.percentage}%)
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Dynamic Insights & Recent Transactions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Dynamic AI Insights Card */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Lightbulb color="#f59e0b" size={20} />
            <h3 style={{ fontSize: '1.1rem' }}>Dynamic Financial Insights</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(analytics?.insights || []).map((insight, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderLeft: '3px solid var(--primary)',
                padding: '0.75rem 1rem',
                borderRadius: '0 8px 8px 0',
                fontSize: '0.85rem',
                color: 'var(--text-main)',
                lineHeight: 1.4
              }}>
                {insight}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions Widget */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Recent Transactions</h3>
            <button
              onClick={() => navigate('/transactions')}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
            >
              View All
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {transactions.map((tx) => (
              <div key={tx.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.85rem',
                backgroundColor: 'rgba(15, 22, 38, 0.6)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <div>
                  <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>{tx.category}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{tx.date} • {tx.payment_mode}</p>
                </div>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: tx.transaction_type === 'Income' ? '#34d399' : '#f87171'
                }}>
                  {tx.transaction_type === 'Income' ? '+' : '-'}₹{tx.amount?.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
