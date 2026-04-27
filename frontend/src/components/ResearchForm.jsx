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
    if (recording) { mediaRec?.stop(); setRecording(false); return; }
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
      rec.start(); setMediaRec(rec); setRecording(true);
    } catch { alert("Microphone access denied."); }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Sparkles size={12} style={{ color: 'var(--purple)' }} />
        <h2 style={{ fontSize: 9, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Research Directive</h2>
      </div>

      <div style={{ position: 'relative' }}>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Initiate a deep-dive research mission..."
          rows={3}
          disabled={running}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 40px 12px 14px',
            background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8,
            fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--text-1)',
            resize: 'none', outline: 'none', transition: 'border-color 0.2s',
            opacity: running ? 0.5 : 1,
          }}
          onFocus={e => e.target.style.borderColor = 'var(--purple)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button type="button" onClick={toggleRecord} title={recording ? "Stop recording" : "Record with Sarvam AI"}
          style={{
            position: 'absolute', right: 10, top: 10, padding: 6, borderRadius: 6, border: 'none', cursor: 'pointer',
            background: recording ? 'rgba(224,92,124,0.2)' : 'transparent',
            color: recording ? 'var(--red)' : 'var(--text-3)',
            transition: 'all 0.2s',
          }}>
          {recording ? <MicOff size={14} /> : <Mic size={14} />}
        </button>
      </div>

      <button type="submit" disabled={running || !topic.trim()}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 8, border: 'none', cursor: running ? 'not-allowed' : 'pointer',
          fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-ui)',
          background: running ? 'var(--bg-overlay)' : 'var(--purple)',
          color: running ? 'var(--text-3)' : '#fff',
          opacity: (!topic.trim() && !running) ? 0.4 : 1,
          transition: 'all 0.2s',
        }}>
        {running ? (
          <>
            <Loader2 size={14} style={{ animation: 'blink-dot 0.6s infinite' }} />
            <span>Synthesizing Intelligence…</span>
          </>
        ) : (
          <>
            <Search size={14} />
            Engage Neural Agents
          </>
        )}
      </button>

      {recording && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', animation: 'blink-dot 0.6s infinite' }} />
          <p style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--red)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>Aural Uplink Active</p>
        </div>
      )}
    </form>
  );
}
