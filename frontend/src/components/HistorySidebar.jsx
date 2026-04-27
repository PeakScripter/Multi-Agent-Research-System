import React, { useState, useEffect } from 'react';
import { Clock, Trash2, FileText, ChevronRight } from 'lucide-react';

const HistorySidebar = ({ onSelectReport, isOpen, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/history');
      const data = await resp.json();
      setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this report from history?')) return;
    
    try {
      await fetch(`/history/${id}`, { method: 'DELETE' });
      setHistory(history.filter(item => item.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const loadItem = async (id) => {
    try {
      const resp = await fetch(`/history/${id}`);
      const data = await resp.json();
      onSelectReport(data.result);
      onClose();
    } catch (err) {
      console.error('Failed to load history item:', err);
    }
  };

  return (
    <div className={`fixed inset-y-0 left-0 w-80 bg-slate-900 border-r border-slate-700 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out z-50 flex flex-col shadow-2xl`}>
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
        <h2 className="text-xl font-bold flex items-center gap-2 text-blue-400">
          <Clock className="w-5 h-5" />
          Research History
        </h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 text-slate-500 italic">
            No research history yet.
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              onClick={() => loadItem(item.id)}
              className="group p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start gap-2 relative z-10">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-200 truncate group-hover:text-blue-300 transition-colors">
                    {item.topic}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteItem(e, item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="p-4 bg-slate-800/30 border-t border-slate-700 text-[10px] text-slate-500 text-center uppercase tracking-widest font-semibold">
        Groq GPT-OSS 120B Persistence
      </div>
    </div>
  );
};

export default HistorySidebar;
