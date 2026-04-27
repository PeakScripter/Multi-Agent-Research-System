import React, { useState, useEffect } from 'react';
import { Clock, Trash2, FileText, ChevronRight } from 'lucide-react';

const HistorySidebar = ({ onSelectReport, isOpen, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (isOpen) fetchHistory(); }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    try { const resp = await fetch('/history'); const data = await resp.json(); setHistory(data); }
    catch (err) { console.error('Failed to fetch history:', err); }
    finally { setLoading(false); }
  };

  const deleteItem = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this report from history?')) return;
    try { await fetch(`/history/${id}`, { method: 'DELETE' }); setHistory(history.filter(item => item.id !== id)); }
    catch (err) { console.error('Delete failed:', err); }
  };

  const loadItem = async (id) => {
    try { const resp = await fetch(`/history/${id}`); const data = await resp.json(); onSelectReport(data.result); onClose(); }
    catch (err) { console.error('Failed to load history item:', err); }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }} />}

      {/* Panel */}
      <div style={{
        position: 'fixed', inset: '0 auto 0 0', width: 300,
        background: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease', zIndex: 50,
        display: 'flex', flexDirection: 'column',
        boxShadow: isOpen ? '8px 0 32px rgba(0,0,0,0.4)' : 'none',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={14} style={{ color: 'var(--purple)' }} />
            <h2 style={{ fontSize: 14, fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>Research History</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
            <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
              <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--purple)', borderRadius: '50%', animation: 'blink-dot 0.6s infinite' }} />
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>No research history yet.</div>
          ) : (
            history.map((item) => (
              <div key={item.id} onClick={() => loadItem(item.id)}
                style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--bg-raised)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.topic}</h3>
                  <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FileText size={9} />{new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <button onClick={(e) => deleteItem(e, item.id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, borderRadius: 4, transition: 'color 0.2s', opacity: 0.5 }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.opacity = 1; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.opacity = 0.5; }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 8, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Persistence Layer
        </div>
      </div>
    </>
  );
};

export default HistorySidebar;
