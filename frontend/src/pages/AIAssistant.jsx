import React, { useState } from 'react';
import api from '../services/api';
import { Bot, Send, User, Sparkles, Database, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SUGGESTED_QUESTIONS = [
  "What did I spend on food last month?",
  "Which category do I spend the most on?",
  "What was my highest expense transaction?",
  "What is my current savings rate?",
  "What is my predicted expenditure for next month?",
  "How has my spending changed?",
  "Why did my expenses increase?"
];

const AIAssistant = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: `Hello ${user?.name || 'there'}! I am your RAG Financial Assistant. Ask me anything about your authenticated transaction history, category breakdowns, savings rate, or model forecast predictions.`,
      context: []
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [expandedContextIndex, setExpandedContextIndex] = useState(null);

  const handleSend = async (qText) => {
    const textToSend = qText || query;
    if (!textToSend.trim()) return;

    // Add User Message
    const userMsg = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!qText) setQuery('');

    setLoading(true);

    try {
      const res = await api.post('/rag/query', { query: textToSend });
      const botMsg = {
        sender: 'bot',
        text: res.data.answer,
        context: res.data.retrieved_context || []
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: 'Sorry, I encountered an error retrieving your financial context.',
        context: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem' }}>RAG Financial Assistant</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Retrieval-Augmented Generation using Sentence Transformers & FAISS vector search
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
          <ShieldCheck size={14} />
          <span>User #{user?.id} Context Isolated</span>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Messages Stream */}
        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                maxWidth: '80%',
                flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
              }}>
                {/* Avatar */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: msg.sender === 'user' ? 'var(--primary)' : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {msg.sender === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>

                {/* Message Bubble */}
                <div style={{
                  backgroundColor: msg.sender === 'user' ? 'var(--primary)' : 'rgba(15, 22, 38, 0.9)',
                  color: '#fff',
                  padding: '0.85rem 1.1rem',
                  borderRadius: msg.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.text}
                </div>
              </div>

              {/* FAISS Context Accordion Drawer */}
              {msg.context && msg.context.length > 0 && (
                <div style={{ marginTop: '0.5rem', maxWidth: '80%', marginLeft: '3rem' }}>
                  <button
                    onClick={() => setExpandedContextIndex(expandedContextIndex === idx ? null : idx)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-dim)',
                      fontSize: '0.75rem',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Database size={12} />
                    <span>FAISS Retrieved Context ({msg.context.length} chunks)</span>
                    {expandedContextIndex === idx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {expandedContextIndex === idx && (
                    <div style={{
                      marginTop: '0.4rem',
                      background: 'rgba(11, 15, 25, 0.9)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)'
                    }}>
                      {msg.context.map((chunk, cIdx) => (
                        <div key={cIdx} style={{ marginBottom: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', pb: '0.5rem' }}>
                          <strong style={{ color: '#818cf8' }}>Chunk #{cIdx + 1}:</strong> {chunk}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Bot size={18} className="animate-spin" color="#06b6d4" />
              <span>Querying FAISS vector index & generating response...</span>
            </div>
          )}
        </div>

        {/* Suggested Quick Question Chips */}
        <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                padding: '0.35rem 0.75rem',
                borderRadius: '16px',
                fontSize: '0.78rem',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Ask a financial question about your transactions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="form-input"
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={loading || !query.trim()} className="glow-btn">
            <Send size={16} />
            <span>Send</span>
          </button>
        </form>

      </div>
    </div>
  );
};

export default AIAssistant;
