import { useState } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { startCompare } from "../lib/api";

const SUGGESTIONS = [
  "RAG Systems vs Knowledge Graphs",
  "Transformers vs State Space Models",
  "Fine-tuning vs Prompt Engineering",
  "Docker vs Kubernetes",
];

export default function CompareMode() {
  const [topicA, setTopicA] = useState("");
  const [topicB, setTopicB] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleCompare(e) {
    e.preventDefault();
    if (!topicA.trim() || !topicB.trim()) return;
    setLoading(true); setResult(null); setError(null);
    try { const data = await startCompare(topicA.trim(), topicB.trim()); setResult(data); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function useSuggestion(s) {
    const [a, b] = s.split(' vs ');
    setTopicA(a.trim()); setTopicB(b.trim());
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Compare Two Topics</h2>
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0' }}>Research both topics in parallel and view side-by-side reports.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleCompare} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input value={topicA} onChange={(e) => setTopicA(e.target.value)} placeholder="Topic A — e.g. RAG systems"
          style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--text-1)', outline: 'none' }}
          onFocus={e => e.target.style.borderColor = 'var(--purple)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        <ArrowLeftRight size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <input value={topicB} onChange={(e) => setTopicB(e.target.value)} placeholder="Topic B — e.g. Knowledge Graphs"
          style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--text-1)', outline: 'none' }}
          onFocus={e => e.target.style.borderColor = 'var(--teal)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        <button type="submit" disabled={loading || !topicA.trim() || !topicB.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-ui)', border: 'none', cursor: loading ? 'wait' : 'pointer', background: loading ? 'var(--bg-overlay)' : 'var(--purple)', color: '#fff', opacity: (!topicA.trim() || !topicB.trim()) ? 0.4 : 1, transition: 'all 0.2s', flexShrink: 0 }}>
          {loading ? <Loader2 size={13} style={{ animation: 'blink-dot 0.6s infinite' }} /> : <ArrowLeftRight size={13} />}
          {loading ? 'Researching…' : 'Compare'}
        </button>
      </form>

      {/* Suggestion chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => useSuggestion(s)}
            style={{ padding: '4px 12px', borderRadius: 20, fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 500, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)'; }}>
            {s}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'var(--red)', fontSize: 12 }}>{error}</p>}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[0, 1].map(n => (
            <div key={n} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4].map(j => (
                <div key={j} style={{ height: j === 1 ? 20 : 14, borderRadius: 4, width: j === 1 ? '60%' : j === 4 ? '45%' : '100%',
                  background: 'linear-gradient(90deg, var(--bg-overlay) 25%, var(--bg-surface) 50%, var(--bg-overlay) 75%)',
                  backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <ReportColumn title={result.topic_a} report={result.result_a?.final_report || result.result_a?.draft_report} badge="Topic A" badgeColor="var(--purple)" />
          <ReportColumn title={result.topic_b} report={result.result_b?.final_report || result.result_b?.draft_report} badge="Topic B" badgeColor="var(--teal)" />
        </div>
      )}
    </div>
  );
}

function ReportColumn({ title, report, badge, badgeColor }) {
  return (
    <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg-raised)', zIndex: 1 }}>
        <h3 style={{ fontSize: 14, fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>{title || 'Untitled'}</h3>
        <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: `color-mix(in srgb, ${badgeColor} 15%, transparent)`, color: badgeColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{badge}</span>
      </div>
      {/* Body */}
      <div className="mars-prose" style={{ padding: 16, fontSize: 13 }}>
        {!report
          ? <p style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>No report generated.</p>
          : <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
        }
      </div>
    </div>
  );
}
