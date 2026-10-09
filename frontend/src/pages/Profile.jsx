import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, ShieldCheck, Key, Database, CheckCircle2 } from 'lucide-react';

const Profile = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem' }}>User Profile & Security</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Authenticated user isolation settings and system information
        </p>
      </div>

      <div className="glass-card" style={{ padding: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '1.8rem',
          fontWeight: 700
        }}>
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div>
          <h3 style={{ fontSize: '1.3rem' }}>{user?.name}</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{user?.email}</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span className="badge badge-success">User ID #{user?.id}</span>
            <span className="badge badge-primary">JWT Authorized</span>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>System Security & Isolation Status</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399' }}>
            <CheckCircle2 size={18} />
            <span>PostgreSQL Row-Level User Isolation Enforced on all CRUD APIs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399' }}>
            <CheckCircle2 size={18} />
            <span>Passwords Hashed via Werkzeug Security (SHA-256 / Bcrypt)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399' }}>
            <CheckCircle2 size={18} />
            <span>RAG Context Vector Indexing Isolated per Authenticated User ID</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399' }}>
            <CheckCircle2 size={18} />
            <span>Pre-trained Model Artifacts Loaded Directly from Disk (`models/`)</span>
          </div>
        </div>
      </div>

      <button onClick={logout} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, width: 'fit-content' }}>
        Log Out of System
      </button>

    </div>
  );
};

export default Profile;
