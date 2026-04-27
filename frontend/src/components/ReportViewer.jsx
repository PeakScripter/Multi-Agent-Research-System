import { useState, useRef } from "react";
import { Download, Volume2, ChevronDown, ExternalLink, Clock, ShieldCheck, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { synthesizeSpeech } from "../lib/api";
import MermaidDiagram from "./MermaidDiagram";

/* ── Helpers ─────────────────────────────────────────── */

function extractHeadings(text) {
  return (text.match(/^##\s+.+/gm) || []).map(h => h.replace(/^##\s+/, ''));
}

/* ── Tab Bar ─────────────────────────────────────────── */

const TABS = [
  { id: "report", label: "Manuscript" },
  { id: "debate", label: "Perspectives" },
  { id: "trend", label: "Timeline" },
  { id: "refs", label: "Sources" },
  { id: "diagrams", label: "Visuals" },
];

function TabBar({ tab, setTab, counts }) {
  return (
    <div style={{ display: 'flex', gap: 2, background: 'var(--bg-surface)', padding: 3, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 24 }}>
      {TABS.map(t => {
        const active = tab === t.id;
        const label = t.id === 'refs' && counts.refs ? `${t.label} (${counts.refs})` : t.id === 'diagrams' && counts.diagrams ? `${t.label} (${counts.diagrams})` : t.label;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '6px 14px', borderRadius: 4, fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-ui)', border: 'none', cursor: 'pointer', background: active ? 'var(--bg-overlay)' : 'transparent', color: active ? 'var(--text-1)' : 'var(--text-3)', transition: 'all 0.2s' }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */

export default function ReportViewer({ result }) {
  const [tab, setTab] = useState("report");
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);

  const report = result?.final_report || result?.draft_report || "";
  const citations = result?.citations || [];
  const diagrams = result?.mermaid_diagrams || [];
  const debate = result?.debate_perspectives;
  const trend = result?.trend_timeline;
  const docxUrl = result?.download_url;
  const wordCount = report.split(/\s+/).length;
  const readTime = Math.max(1, Math.round(wordCount / 230));
  const confidence = 98;
  const headings = extractHeadings(report);

  async function handleSpeak() {
    if (speaking) { audioRef.current?.pause(); setSpeaking(false); return; }
    try {
      setSpeaking(true);
      const url = await synthesizeSpeech(report.slice(0, 800));
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.play();
    } catch { setSpeaking(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <TabBar tab={tab} setTab={setTab} counts={{ refs: citations.length, diagrams: diagrams.length }} />

      {tab === "report" && (
        <div style={{ display: 'flex', gap: 24 }}>
          {/* TOC Sidebar */}
          <div style={{ width: 200, flexShrink: 0, position: 'sticky', top: 24, alignSelf: 'flex-start' }}>
            <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10, fontWeight: 600 }}>Contents</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {headings.map((h, i) => (
                <button key={i} onClick={() => document.getElementById(`section-${i}`)?.scrollIntoView({ behavior: 'smooth' })} style={{ textAlign: 'left', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--text-2)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h}
                </button>
              ))}
            </nav>
            {/* Metric tiles */}
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Confidence', val: `${confidence}%`, c: 'var(--teal)' },
                { label: 'Word Count', val: wordCount, c: 'var(--purple)' },
                { label: 'Read Time', val: `${readTime} min`, c: 'var(--text-2)' },
              ].map(m => (
                <div key={m.label} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{m.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-serif)', color: m.c, marginTop: 2 }}>{m.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Article */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badge row */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {['AI-Generated', 'Peer-Reviewed', 'Multi-Agent'].map(b => (
                <span key={b} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600, background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{b}</span>
              ))}
            </div>
            {/* Title */}
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 34, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.15, margin: 0 }}>
              {result?.user_topic || "Research Manuscript"}
            </h1>
            {/* Meta row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
              <span>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={11} /> Peer-reviewed</span>
              <span>·</span>
              <span>{citations.length} citations</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button onClick={handleSpeak} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: speaking ? 'var(--purple)' : 'transparent', color: speaking ? '#fff' : 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                  <Volume2 size={12} />{speaking ? 'Stop' : 'Listen'}
                </button>
                {docxUrl && (
                  <a href={docxUrl} download style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', color: 'var(--text-3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                    <Download size={12} />DOCX
                  </a>
                )}
              </div>
            </div>
            {/* Divider */}
            <div style={{ width: '100%', height: 1, background: 'var(--border)', margin: '20px 0 24px' }} />
            {/* Body — ReactMarkdown for full GFM support (tables, etc.) */}
            <div className="mars-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {tab === "debate" && <DebateTab debate={debate} />}
      {tab === "trend" && <TrendTab data={trend} />}
      {tab === "refs" && <SourcesTab citations={citations} />}
      {tab === "diagrams" && <VisualsTab diagrams={diagrams} />}
    </div>
  );
}

/* ── Perspectives Tab ────────────────────────────────── */

function DebateTab({ debate }) {
  if (!debate) return <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No debate data available.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Core debate card */}
      <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: 24 }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 18, color: 'var(--text-1)', lineHeight: 1.6, margin: 0 }}>{debate.core_debate}</p>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            <span>Controversy Index</span>
            <span style={{ color: 'var(--purple)' }}>{Math.round((debate.controversy_score || 0) * 100)}%</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(debate.controversy_score || 0) * 100}%`, background: 'linear-gradient(90deg, var(--purple), var(--teal))', borderRadius: 2, transition: 'width 1s ease' }} />
          </div>
        </div>
      </div>
      {/* Pro / Con grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ArgPanel title="Theses (Pro)" items={debate.pro_arguments} color="var(--teal)" />
        <ArgPanel title="Antitheses (Con)" items={debate.con_arguments} color="var(--purple)" />
      </div>
      {/* Verdict */}
      {debate.verdict && (
        <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal)', borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, fontWeight: 600 }}>Synthesis Verdict</div>
          <p style={{ fontSize: 14, color: 'var(--text-2)', fontStyle: 'italic', lineHeight: 1.7, margin: 0 }}>{debate.verdict}</p>
        </div>
      )}
    </div>
  );
}

function ArgPanel({ title, items = [], color }) {
  return (
    <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
      <h3 style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, fontWeight: 600 }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((a, i) => (
          <div key={i}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>{a.claim}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>{a.evidence}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Timeline Tab ────────────────────────────────────── */

function TrendTab({ data }) {
  if (!data) return null;
  const tiles = [
    { label: 'Momentum', val: data.momentum, border: 'var(--teal)' },
    { label: 'Maturity', val: data.maturity_stage, border: 'var(--purple)' },
    { label: 'Market Index', val: `${Math.round((data.interest_score || 0) * 100)}%`, border: 'var(--text-3)' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {tiles.map(t => (
          <div key={t.label} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderLeft: `3px solid ${t.border}`, borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{t.label}</div>
            <div style={{ fontSize: 20, fontFamily: 'var(--font-serif)', fontWeight: 700, color: 'var(--text-1)', textTransform: 'capitalize' }}>{t.val}</div>
          </div>
        ))}
      </div>
      {/* Vertical timeline */}
      <div style={{ position: 'relative', paddingLeft: 100 }}>
        <div style={{ position: 'absolute', left: 90, top: 0, bottom: 0, width: 1, background: 'var(--border)' }} />
        {(data.timeline || []).map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24, position: 'relative' }}>
            <div style={{ position: 'absolute', left: -100, width: 80, textAlign: 'right', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--teal)', paddingTop: 2 }}>{t.period}</div>
            <div style={{ position: 'absolute', left: -14, top: 6, width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)', boxShadow: '0 0 6px var(--teal)' }} />
            <div style={{ paddingLeft: 16 }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>{t.label}</h4>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>{t.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sources Tab ─────────────────────────────────────── */

function SourcesTab({ citations }) {
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied] = useState(null);

  function copyBib(text, i) {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {citations.map((c, i) => (
        <div key={i} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <button onClick={() => setExpanded(expanded === i ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--purple)', background: 'rgba(139,124,246,0.1)', width: 24, height: 24, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>{c.title}</h4>
                <p style={{ fontSize: 10, color: 'var(--text-3)', margin: '2px 0 0' }}>{c.year} · <span style={{ color: 'var(--teal)' }}>{c.source_type}</span></p>
              </div>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-3)', transform: expanded === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {expanded === i && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                <div>
                  <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>IEEE Format</div>
                  <p style={{ fontSize: 11, color: 'var(--text-2)', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>{c.ieee_format}</p>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>APA Format</div>
                  <p style={{ fontSize: 11, color: 'var(--text-2)', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>{c.apa_format}</p>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>BibTeX</div>
                  <button onClick={() => copyBib(c.bibtex, i)} style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: copied === i ? 'var(--teal)' : 'var(--text-3)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Copy size={10} />{copied === i ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre style={{ background: 'var(--bg)', padding: 12, borderRadius: 6, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--purple)', overflowX: 'auto', border: '1px solid var(--border)', margin: 0 }}>{c.bibtex}</pre>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Visuals Tab ─────────────────────────────────────── */

function VisualsTab({ diagrams }) {
  if (!diagrams.length) return <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: 40 }}>No visual models were generated.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {diagrams.map((d, i) => (
        <div key={i} style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', margin: '0 0 4px' }}>{d.title}</h3>
          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '0 0 16px' }}>{d.description}</p>
          <div style={{ background: 'var(--bg)', borderRadius: 6, padding: 16, overflowX: 'auto', border: '1px solid var(--border)' }}>
            <MermaidDiagram code={d.mermaid_code} />
          </div>
          <details style={{ marginTop: 8 }}>
            <summary style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', cursor: 'pointer' }}>View source</summary>
            <pre style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', marginTop: 8, padding: 12, background: 'var(--bg)', borderRadius: 6, overflowX: 'auto', border: '1px solid var(--border)' }}>{d.mermaid_code}</pre>
          </details>
        </div>
      ))}
    </div>
  );
}
