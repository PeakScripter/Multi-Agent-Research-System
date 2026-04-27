import { useState } from "react";
import { Search, Mic, MicOff, Loader2, Sparkles } from "lucide-react";
import { transcribeVoice } from "../lib/api";

export default function ResearchForm({ onSubmit, running }) {
  const [topic, setTopic] = useState("");
  const [recording, setRecording] = useState(false);
  const [mediaRec, setMediaRec] = useState(null);

  function handleSubmit(e) {
    e.preventDefault();
    if (topic.trim() && !running) onSubmit(topic.trim());
  }

  async function toggleRecord() {
    if (recording) {
      mediaRec?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        await transcribeVoice(blob, {
          onProgress: (ev) => setTopic(ev.message || topic),
          onResult: (res) => {
            if (res?.transcript) setTopic(res.transcript);
            if (res?.final_report) onSubmit(topic);
          },
        });
      };
      rec.start();
      setMediaRec(rec);
      setRecording(true);
    } catch {
      alert("Microphone access denied.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={14} className="text-secondary" />
        <h2 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Research Directive</h2>
      </div>
      
      <div className="relative group">
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Initiate a deep-dive research mission..."
          rows={3}
          disabled={running}
          className="stealth-input w-full rounded-2xl px-5 py-4 pr-12 text-sm text-white placeholder-on-surface-variant/30 resize-none transition-all duration-500 group-hover:bg-[#060e20]/80 disabled:opacity-50 font-medium"
        />
        <button
          type="button"
          onClick={toggleRecord}
          title={recording ? "Stop recording" : "Record with Sarvam AI"}
          className={`absolute right-4 top-4 p-2 rounded-xl transition-all duration-300 ${
            recording
              ? "text-white bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse"
              : "text-on-surface-variant hover:text-secondary hover:bg-secondary/10"
          }`}
        >
          {recording ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      </div>

      <button
        type="submit"
        disabled={running || !topic.trim()}
        className={`w-full flex items-center justify-center gap-3 px-6 py-3.5 text-sm font-bold rounded-2xl transition-all duration-500 shadow-xl ${
          running 
            ? "bg-white/5 text-on-surface-variant border border-white/5 cursor-not-allowed" 
            : "premium-gradient text-white hover:scale-[1.02] active:scale-95 hover:shadow-secondary/20"
        }`}
      >
        {running ? (
          <>
            <Loader2 size={16} className="animate-spin text-secondary" />
            <span className="animate-pulse">Synthesizing Intelligence...</span>
          </>
        ) : (
          <>
            <Search size={16} />
            Engage Neural Agents
          </>
        )}
      </button>

      {recording && (
        <div className="flex items-center justify-center gap-2 py-1">
          <div className="w-1 h-1 rounded-full bg-red-500 animate-ping" />
          <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
            Aural Uplink Active
          </p>
        </div>
      )}
    </form>
  );
}
