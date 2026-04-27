import { useState, useEffect } from "react";
import { Search, Loader2, Database, Clock } from "lucide-react";
import { searchRAG, getRecentRAG } from "../lib/api";

export default function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState(null);
  const [error, setError] = useState(null);
  const [isRecent, setIsRecent] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(null);

  useEffect(() => { fetchRecent(); }, []);

  async function fetchRecent() {
    setLoading(true); setIsRecent(true);
    try { const data = await getRecentRAG(10); setHits(data.hits); }
    catch { setError("Failed to load recent research"); }
    finally { setLoading(false); }
  }

  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!query.trim()) { fetchRecent(); return; }
    setLoading(true); setError(null); setIsRecent(false);
    try { const data = await searchRAG(query.trim(), 8); setHits(data.hits); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Database size={16} style={{ color: 'var(--purple)' }} />
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Research Knowledge Base</h2>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>Search past research stored in Qdrant vector memory.</p>
      </div>

      {/* Search input with icon */}
      <form onSubmit={handleSearch} style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search past research topics…"
          style={{
            width: '100%', boxSizing: 'border-box',
            paddingLeft: 38, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
            background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8,
            fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--text-1)', outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--purple)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        {loading && <Loader2 size={14} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--purple)', animation: 'blink-dot 0.6s infinite' }} />}
      </form>

      {error && <p style={{ color: 'var(--red)', fontSize: 12 }}>{error}</p>}

      {hits !== null && hits.length === 0 && (
        <p style={{ color: 'var(--text-3)', fontSize: 12 }}>No similar past research found. Run some research first.</p>
      )}

      {hits && hits.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            {isRecent ? <><Clock size={10} /> Recent Research</> : <><Search size={10} /> {hits.length} result{hits.length !== 1 ? 's' : ''} found</>}
          </p>
          {hits.map((h, i) => {
            const pct = Math.round(h.similarity_score * 100);
            const scoreColor = pct > 90 ? 'var(--teal)' : 'var(--purple)';
            const isExpanded = expandedIdx === i;
            return (
              <div key={i} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', transition: 'border-color 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  {/* Title */}
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, color: 'var(--text-1)', margin: 0, flex: 1 }}>{h.topic}</h3>
                  {/* Score */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: scoreColor }}>{pct}%</span>
                    <div style={{ width: 48, height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: scoreColor, borderRadius: 2 }} />
                    </div>
                  </div>
                </div>
                {h.stored_at && <p style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', margin: '6px 0 0' }}>{h.stored_at.split("T")[0]}</p>}
                {h.report_excerpt && (
                  <p onClick={() => setExpandedIdx(isExpanded ? null : i)} style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: isExpanded ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: isExpanded ? 'visible' : 'hidden', cursor: 'pointer' }}>{h.report_excerpt}</p>
                )}
                {h.key_findings?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
                    {h.key_findings.slice(0, 3).map((f, j) => (
                      <div key={j} style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--text-2)' }}>
                        <span style={{ color: 'var(--teal)', flexShrink: 0 }}>·</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
