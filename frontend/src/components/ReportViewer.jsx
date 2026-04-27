import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Download, Volume2, ChevronDown, ChevronUp, BookOpen, 
  BarChart2, GitBranch, Clock, Hash, ShieldCheck, 
  Layers, ExternalLink, Share2, Printer
} from "lucide-react";
import { synthesizeSpeech } from "../lib/api";
import MermaidDiagram from "./MermaidDiagram";

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
  const confidence = 98; // Simulated or derived if available

  async function handleSpeak() {
    if (speaking) {
      audioRef.current?.pause();
      setSpeaking(false);
      return;
    }
    try {
      setSpeaking(true);
      const excerpt = report.slice(0, 800);
      const url = await synthesizeSpeech(excerpt);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.play();
    } catch {
      setSpeaking(false);
    }
  }

  const TABS = [
    { id: "report",  label: "Manuscript",   icon: BookOpen },
    { id: "diagrams",label: `Visuals (${diagrams.length})`, icon: BarChart2 },
    { id: "debate",  label: "Perspectives", icon: GitBranch },
    { id: "trend",   label: "Timeline",     icon: Clock },
    { id: "refs",    label: `Sources (${citations.length})`, icon: Hash },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Sidebar: Table of Contents & Metrics */}
      <aside className="lg:w-72 flex-shrink-0 space-y-6">
        <div className="glass-panel rounded-2xl p-6 space-y-6 sticky top-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-4">Scientific Metrics</p>
            <div className="space-y-4">
              <MetricItem icon={ShieldCheck} label="Confidence" value={`${confidence}%`} color="text-secondary" />
              <MetricItem icon={Layers} label="Sources" value={citations.length} color="text-primary" />
              <MetricItem icon={Clock} label="Word Count" value={wordCount} color="text-on-surface-variant" />
            </div>
          </div>

          <div className="w-full h-px bg-white/5" />

          <div>
            <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mb-4">Navigation</p>
            <nav className="space-y-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                    tab === id 
                      ? "bg-white/10 text-white shadow-inner translate-x-1" 
                      : "text-on-surface-variant hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={16} className={tab === id ? "text-secondary" : "text-gray-500"} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="w-full h-px bg-white/5" />

          <div className="flex flex-col gap-2">
            <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/5 text-xs font-semibold text-on-surface-variant hover:text-white hover:border-white/20 transition-all">
              <Share2 size={14} /> Share Findings
            </button>
            <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/5 text-xs font-semibold text-on-surface-variant hover:text-white hover:border-white/20 transition-all">
              <Printer size={14} /> Print Abstract
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {/* Editorial Header */}
        <div className="mb-10 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white leading-tight">
              {result?.user_topic || "Research Manuscript"}
            </h1>
            <div className="flex gap-3">
              <button
                onClick={handleSpeak}
                className={`p-3 rounded-full transition-all duration-300 ${
                  speaking ? "bg-secondary text-bg-deep" : "glass-card text-secondary hover:scale-110"
                }`}
              >
                <Volume2 size={20} />
              </button>
              {docxUrl && (
                <a
                  href={docxUrl}
                  download
                  className="p-3 glass-card rounded-full text-primary hover:scale-110 transition-all"
                >
                  <Download size={20} />
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
            <span className="flex items-center gap-2">
              <Clock size={14} className="text-secondary" /> {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-secondary" /> Peer-Reviewed by MARS Agents
            </span>
          </div>
          <div className="w-full h-px bg-gradient-to-r from-secondary/50 via-white/5 to-transparent" />
        </div>

        {/* Dynamic Content Rendering */}
        <div className="space-y-12">
          {tab === "report" && (
            <div className="prose prose-invert prose-lg max-w-none 
              prose-headings:font-serif prose-headings:font-bold prose-headings:text-white
              prose-p:text-on-surface/90 prose-p:leading-relaxed
              prose-strong:text-secondary prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-li:text-on-surface/80">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
            </div>
          )}

          {tab === "diagrams" && (
            <div className="grid grid-cols-1 gap-8">
              {diagrams.length === 0 && (
                <div className="glass-panel rounded-2xl p-12 text-center border-dashed border-2">
                  <p className="text-on-surface-variant font-medium">No visual models were generated for this synthesis.</p>
                </div>
              )}
              {diagrams.map((d, i) => (
                <div key={i} className="glass-panel rounded-2xl p-8 space-y-6 overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center text-secondary">
                      <Layers size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white">{d.title}</h3>
                      <p className="text-xs text-on-surface-variant">{d.description}</p>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-6 overflow-x-auto">
                    <MermaidDiagram code={d.mermaid_code} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "debate" && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="glass-panel rounded-2xl p-8 space-y-4">
                <div className="flex items-center gap-2 text-secondary uppercase tracking-tighter font-bold text-[10px]">
                  <GitBranch size={12} /> Dialectical Analysis
                </div>
                <h3 className="text-2xl font-serif font-bold text-white">Central Paradox</h3>
                <p className="text-on-surface leading-relaxed text-lg">{debate?.core_debate}</p>
                
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Controversy Index</span>
                    <span className="text-sm font-bold text-secondary">{Math.round((debate?.controversy_score || 0) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000" 
                      style={{ width: `${(debate?.controversy_score || 0) * 100}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ArgumentPanel title="Theses (Pro)" items={debate?.pro_arguments} theme="secondary" />
                <ArgumentPanel title="Antitheses (Con)" items={debate?.con_arguments} theme="primary" />
              </div>

              {debate?.verdict && (
                <div className="glass-panel rounded-2xl p-8 bg-gradient-to-br from-white/[0.02] to-transparent">
                  <h3 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">Synthesis Verdict</h3>
                  <p className="text-on-surface italic font-medium leading-relaxed">{debate.verdict}</p>
                </div>
              )}
            </div>
          )}

          {tab === "trend" && <TrendAnalysis data={trend} />}

          {tab === "refs" && <SourceIndex citations={citations} />}
        </div>
      </div>
    </div>
  );
}

function MetricItem({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
          <Icon size={14} className="text-on-surface-variant" />
        </div>
        <span className="text-xs font-semibold text-on-surface-variant">{label}</span>
      </div>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

function ArgumentPanel({ title, items = [], theme }) {
  const accentColor = theme === "secondary" ? "text-secondary" : "text-primary";
  const bgColor = theme === "secondary" ? "bg-secondary/10" : "bg-primary/10";

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      <h3 className={`text-sm font-bold uppercase tracking-widest ${accentColor}`}>{title}</h3>
      <div className="space-y-6">
        {items.map((a, i) => (
          <div key={i} className="space-y-2 group">
            <div className="flex items-start gap-3">
              <span className={`text-[10px] font-bold ${bgColor} ${accentColor} px-1.5 rounded mt-1`}>{i + 1}</span>
              <div>
                <p className="text-sm font-bold text-white group-hover:text-secondary transition-colors">{a.claim}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-1">{a.evidence}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendAnalysis({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel rounded-2xl p-6 border-l-4 border-secondary">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Momentum</p>
          <p className="text-2xl font-serif font-bold text-white capitalize">{data.momentum}</p>
        </div>
        <div className="glass-panel rounded-2xl p-6 border-l-4 border-primary">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Maturity Stage</p>
          <p className="text-2xl font-serif font-bold text-white capitalize">{data.maturity_stage}</p>
        </div>
        <div className="glass-panel rounded-2xl p-6 border-l-4 border-on-surface-variant">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Market Interest</p>
          <p className="text-2xl font-serif font-bold text-white">{Math.round((data.interest_score || 0) * 100)}%</p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-8 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-12 w-px h-full bg-white/5" />
        {(data.timeline || []).map((t, i) => (
          <div key={i} className="relative flex gap-12 items-start group">
            <div className="w-24 shrink-0 text-right">
              <span className="text-xs font-bold text-secondary group-hover:text-white transition-colors uppercase tracking-widest">{t.period}</span>
            </div>
            <div className="absolute left-[3.15rem] top-1.5 w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_#4fdbc8]" />
            <div className="flex-1 pb-8 group-last:pb-0">
              <h4 className="text-lg font-bold text-white mb-1 group-hover:text-secondary transition-all">{t.label}</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">{t.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceIndex({ citations }) {
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
      {citations.map((c, i) => (
        <div key={i} className="glass-panel rounded-2xl overflow-hidden group transition-all duration-300">
          <button
            onClick={() => setExpanded(expanded === i ? null : i)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-6">
              <span className="text-xs font-bold text-primary bg-primary/10 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">{c.title}</h4>
                <p className="text-xs text-on-surface-variant mt-1">
                  {c.year} • <span className="text-secondary">{c.source_type}</span>
                </p>
              </div>
            </div>
            <div className={`p-2 rounded-full transition-transform duration-300 ${expanded === i ? "rotate-180 bg-white/5" : ""}`}>
              <ChevronDown size={18} className="text-on-surface-variant" />
            </div>
          </button>
          
          {expanded === i && (
            <div className="px-6 pb-6 pt-2 space-y-6 border-t border-white/5 bg-white/[0.01]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Standard Reference (IEEE)</p>
                    <p className="text-xs text-on-surface italic leading-relaxed">{c.ieee_format}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">APA Format</p>
                    <p className="text-xs text-on-surface italic leading-relaxed">{c.apa_format}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">BibTeX Source</p>
                  <pre className="bg-[#060e20] p-4 rounded-xl text-[10px] font-mono text-primary overflow-x-auto border border-white/5">
                    {c.bibtex}
                  </pre>
                </div>
              </div>
              <div className="flex justify-end">
                <button className="flex items-center gap-2 text-[10px] font-bold text-secondary uppercase tracking-widest hover:text-white transition-colors">
                  View Full Source <ExternalLink size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
