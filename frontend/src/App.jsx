import { useState, useEffect } from "react";
import { History, X, Search, GitBranch, Database, Archive, Sun, Moon } from "lucide-react";
import AgentGraph from "./components/AgentGraph";
import ResearchForm from "./components/ResearchForm";
import ProgressFeed from "./components/ProgressFeed";
import ReportViewer from "./components/ReportViewer";
import CompareMode from "./components/CompareMode";
import KnowledgeSearch from "./components/KnowledgeSearch";
import HistorySidebar from "./components/HistorySidebar";
import { startResearch } from "./lib/api";

const TABS = [
  { id: "Research",       icon: Search },
  { id: "Compare",        icon: GitBranch },
  { id: "Knowledge Base", icon: Database },
];

export default function App() {
  const [tab, setTab] = useState("Research");
  const [running, setRunning] = useState(false);
  const [activeNode, setActiveNode] = useState(null);
  const [completedNodes, setCompletedNodes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('mars-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mars-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }

  const NODE_ORDER = ["planner", "researcher", "rag_store", "enrichment", "writer", "critic"];

  function handleProgress(event) {
    setLogs((prev) => [...prev, event.message]);
    if (event.node) {
      setActiveNode(event.node);
      setCompletedNodes((prev) => {
        const idx = NODE_ORDER.indexOf(event.node);
        const done = NODE_ORDER.slice(0, idx);
        return [...new Set([...prev, ...done])];
      });
    }
  }

  function handleResult(res) {
    setResult(res);
    setRunning(false);
    setActiveNode(null);
    setCompletedNodes(NODE_ORDER);
    setLogs((prev) => [...prev, "✅ Research complete!"]);
  }

  function handleError(err) {
    setError(err);
    setRunning(false);
    setActiveNode(null);
    setLogs((prev) => [...prev, `❌ Error: ${err}`]);
  }

  async function handleSubmit(topic) {
    setRunning(true);
    setResult(null);
    setError(null);
    setLogs([]);
    setActiveNode("planner");
    setCompletedNodes([]);
    try {
      await startResearch(topic, {
        onProgress: handleProgress,
        onResult: handleResult,
        onError: handleError,
      });
    } catch (e) {
      handleError(e.message);
    }
  }

  function handleSelectFromHistory(historyResult) {
    setResult(historyResult);
    setTab("Research");
    setLogs(["📋 Loaded report from history"]);
    setCompletedNodes(NODE_ORDER);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <HistorySidebar
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectReport={handleSelectFromHistory}
      />

      {/* ── Header ─────────────────────────────────────── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        zIndex: 40,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 28, height: 28,
            borderRadius: 6,
            background: 'var(--purple)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              lineHeight: 1,
            }}>M</span>
          </div>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-1)',
              lineHeight: 1.1,
              letterSpacing: '0.02em',
              margin: 0,
            }}>MARS</h1>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8.5,
              fontWeight: 500,
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              margin: 0,
            }}>Multi-Agent Research System</p>
          </div>
        </div>

        {/* Nav + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Pill nav */}
          <nav style={{
            display: 'flex',
            gap: 2,
            background: 'var(--bg)',
            padding: 3,
            borderRadius: 10,
            border: '1px solid var(--border)',
          }}>
            {TABS.map(({ id, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: 'var(--font-ui)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: active ? 'var(--bg-overlay)' : 'transparent',
                    color: active ? 'var(--text-1)' : 'var(--text-3)',
                  }}
                >
                  <Icon size={13} style={{ color: active ? 'var(--purple)' : 'var(--text-3)' }} />
                  {id}
                </button>
              );
            })}
          </nav>

          {/* Archive button */}
          <button
            onClick={() => setHistoryOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-2)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--border-hover)';
              e.currentTarget.style.color = 'var(--text-1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-2)';
            }}
          >
            <Archive size={13} />
            Archive
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-2)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--purple)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>

          {/* Avatar */}
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-3)',
            fontWeight: 600,
            transition: 'all 0.3s ease',
          }}>Y</div>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {tab === "Research" && (
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* Left panel */}
            <aside style={{
              width: 320,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid var(--border)',
              background: 'var(--bg-surface)',
            }}>
              <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                <ResearchForm onSubmit={handleSubmit} running={running} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                <ProgressFeed logs={logs} running={running} />
              </div>
            </aside>

            {/* Main area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {/* Agent graph */}
              <div style={{
                transition: 'height 0.4s ease',
                height: result ? 220 : '100%',
                flex: result ? 'none' : 1,
                borderBottom: '1px solid var(--border)',
              }}>
                <AgentGraph activeNode={activeNode} completedNodes={completedNodes} />
              </div>

              {/* Report */}
              {result && (
                <div style={{ flex: 1, overflowY: 'auto', padding: 24 }} className="animate-fade-in">
                  <ReportViewer result={result} />
                </div>
              )}

              {!result && !running && (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-3)',
                  fontSize: 13,
                  fontFamily: 'var(--font-ui)',
                }}>
                  Enter a CS/IT topic on the left to start researching
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "Compare" && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <CompareMode />
          </div>
        )}

        {tab === "Knowledge Base" && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <KnowledgeSearch />
          </div>
        )}
      </main>
    </div>
  );
}
