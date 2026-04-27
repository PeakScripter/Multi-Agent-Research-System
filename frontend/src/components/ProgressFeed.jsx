import { useEffect, useRef } from "react";
import { Loader2, Terminal } from "lucide-react";

export default function ProgressFeed({ logs, running }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!logs.length && !running) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-secondary" />
          <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Neural Link Status</h3>
        </div>
        {running && <div className="w-2 h-2 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_#4fdbc8]" />}
      </div>
      
      <div className="glass-card rounded-2xl p-4 font-mono text-[11px] min-h-[120px] max-h-[300px] overflow-y-auto scrollbar-hide">
        <div className="space-y-2">
          {logs.map((msg, i) => (
            <div key={i} className="flex items-start gap-3 text-on-surface/80 animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-primary/50 select-none shrink-0 font-bold">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="leading-relaxed">
                {msg.startsWith("✅") ? <span className="text-secondary">{msg}</span> : 
                 msg.startsWith("❌") ? <span className="text-red-400">{msg}</span> : 
                 msg}
              </span>
            </div>
          ))}
          {running && (
            <div className="flex items-center gap-3 text-secondary py-1">
              <Loader2 size={12} className="animate-spin shrink-0" />
              <span className="animate-pulse tracking-wide font-bold">Synchronizing...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
