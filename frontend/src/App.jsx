import { useState } from "react";
import { History, X } from "lucide-react";
import AgentGraph from "./components/AgentGraph";
import ResearchForm from "./components/ResearchForm";
import ProgressFeed from "./components/ProgressFeed";
import ReportViewer from "./components/ReportViewer";
import CompareMode from "./components/CompareMode";
import KnowledgeSearch from "./components/KnowledgeSearch";
import HistorySidebar from "./components/HistorySidebar";
import { startResearch } from "./lib/api";

const TABS = ["Research", "Compare", "Knowledge Base"];

export default function App() {
  const [tab, setTab] = useState("Research");
  const [running, setRunning] = useState(false);
  const [activeNode, setActiveNode] = useState(null);
  const [completedNodes, setCompletedNodes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

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
    setTab("Research"); // Switch to Research tab to view the report
    setLogs(["📋 Loaded report from history"]);
    setCompletedNodes(NODE_ORDER);
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <HistorySidebar 
        isOpen={historyOpen} 
        onClose={() => setHistoryOpen(false)} 
        onSelectReport={handleSelectFromHistory}
      />

      {/* Header */}
      <header className="glass-panel border-b border-white/5 px-8 py-5 flex items-center justify-between z-40">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl premium-gradient flex items-center justify-center text-white shadow-lg">
            <span className="text-xl font-bold">M</span>
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-white">MARS</h1>
            <p className="text-[10px] uppercase tracking-widest text-secondary font-semibold">Multi-Agent Research System</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  tab === t ? "bg-white/10 text-white shadow-inner" : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
          
          <div className="w-px h-8 bg-white/5 mx-2" />
          
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 border border-white/5 transition-all"
          >
            <History size={16} className="text-primary" />
            Archive
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-0">
        {tab === "Research" && (
          <div className="flex flex-1 min-h-0">
            {/* Left panel */}
            <aside className="w-96 flex-shrink-0 flex flex-col border-r border-white/10 bg-gray-950">
              <div className="p-4 border-b border-white/10">
                <ResearchForm onSubmit={handleSubmit} running={running} />
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <ProgressFeed logs={logs} running={running} />
              </div>
            </aside>

            {/* Main area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Agent graph — always visible while running, shrinks when report shows */}
              <div className={`transition-all ${result ? "h-56" : "flex-1"} border-b border-white/10`}>
                <AgentGraph activeNode={activeNode} completedNodes={completedNodes} />
              </div>

              {/* Report */}
              {result && (
                <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
                  <ReportViewer result={result} />
                </div>
              )}

              {!result && !running && (
                <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
                  Enter a CS/IT topic on the left to start researching
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "Compare" && (
          <div className="flex-1 p-6">
            <CompareMode />
          </div>
        )}

        {tab === "Knowledge Base" && (
          <div className="flex-1 p-6">
            <KnowledgeSearch />
          </div>
        )}
      </main>
    </div>
  );
}
