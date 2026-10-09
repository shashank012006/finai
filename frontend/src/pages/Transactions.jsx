import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Calendar,
  ArrowUpDown
} from 'lucide-react';

const CATEGORIES = [
  'Food', 'Rent', 'Utilities', 'Education', 'Entertainment',
  'Shopping', 'Healthcare', 'Transportation', 'Salary', 'Freelance', 'Investment', 'Others'
];

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Others'];

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Controls
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [order, setOrder] = useState('desc');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    transaction_type: 'Expense',
    category: 'Food',
    amount: '',
    payment_mode: 'UPI',
    location: '',
    notes: ''
  });

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === 'true') {
      openAddModal();
    }
  }, [location]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = `/transactions?sort_by=${sortBy}&order=${order}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (categoryFilter !== 'All') url += `&category=${encodeURIComponent(categoryFilter)}`;
      if (typeFilter !== 'All') url += `&type=${encodeURIComponent(typeFilter)}`;

      const res = await api.get(url);
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error("Fetch transactions error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [search, categoryFilter, typeFilter, sortBy, order]);

  const openAddModal = () => {
    setEditId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      transaction_type: 'Expense',
      category: 'Food',
      amount: '',
      payment_mode: 'UPI',
      location: '',
      notes: ''
    });
    setShowModal(true);
  };

  const openEditModal = (tx) => {
    setEditId(tx.id);
    setFormData({
      date: tx.date,
      transaction_type: tx.transaction_type,
      category: tx.category,
      amount: tx.amount,
      payment_mode: tx.payment_mode || 'Cash',
      location: tx.location || '',
      notes: tx.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/transactions/${editId}`, formData);
      } else {
        await api.post('/transactions', formData);
      }
      setShowModal(false);
      fetchTransactions();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save transaction.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this transaction record from PostgreSQL?")) {
      try {
        await api.delete(`/transactions/${id}`);
        fetchTransactions();
      } catch (err) {
        alert(err.response?.data?.error || 'Delete failed.');
      }
    }
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem' }}>Transaction Management</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage user transaction ledger in PostgreSQL database</p>
        </div>

        <button onClick={openAddModal} className="glow-btn">
          <Plus size={18} />
          <span>New Transaction</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search notes, category, merchant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>

        {/* Category Filter */}
        <div style={{ minWidth: '160px' }}>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="form-select">
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Type Filter */}
        <div style={{ minWidth: '140px' }}>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="form-select">
            <option value="All">All Types</option>
            <option value="Expense">Expense Only</option>
            <option value="Income">Income Only</option>
          </select>
        </div>

        {/* Sort Order */}
        <button
          onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            padding: '0.65rem 1rem',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem'
          }}
        >
          <ArrowUpDown size={14} />
          <span>Sort {order.toUpperCase()}</span>
        </button>
      </div>

      {/* Transactions Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(15, 22, 38, 0.9)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '1rem' }}>DATE</th>
              <th style={{ padding: '1rem' }}>TYPE</th>
              <th style={{ padding: '1rem' }}>CATEGORY</th>
              <th style={{ padding: '1rem' }}>PAYMENT MODE</th>
              <th style={{ padding: '1rem' }}>LOCATION / MERCHANT</th>
              <th style={{ padding: '1rem' }}>AMOUNT</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading transactions...</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions matching criteria.</td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>{tx.date}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${tx.transaction_type === 'Income' ? 'badge-success' : 'badge-danger'}`}>
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{tx.category}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{tx.payment_mode}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{tx.location || '-'}</td>
                  <td style={{ padding: '1rem', fontWeight: 700, color: tx.transaction_type === 'Income' ? '#34d399' : '#f87171' }}>
                    {tx.transaction_type === 'Income' ? '+' : '-'}₹{tx.amount?.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => openEditModal(tx)}
                      style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', marginRight: '0.75rem' }}
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>{editId ? 'Edit Transaction' : 'Add New Transaction'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>DATE</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>TYPE</label>
                  <select
                    value={formData.transaction_type}
                    onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                    className="form-select"
                  >
                    <option value="Expense">Expense</option>
                    <option value="Income">Income</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>CATEGORY</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="form-select"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>AMOUNT (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>PAYMENT MODE</label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                    className="form-select"
                  >
                    {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>LOCATION / MERCHANT</label>
                  <input
                    type="text"
                    placeholder="Supermarket, Amazon..."
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>NOTES</label>
                <input
                  type="text"
                  placeholder="Optional details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button type="submit" className="glow-btn">
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Transactions;
