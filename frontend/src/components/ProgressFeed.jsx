import { useEffect, useRef } from "react";

export default function ProgressFeed({ logs, running }) {
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  if (!logs.length && !running) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>▸</span>
          <h3 style={{ fontSize: 9, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Neural Link Status</h3>
        </div>
        {running && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', boxShadow: '0 0 8px var(--teal)', animation: 'blink-dot 1.2s infinite' }} />}
      </div>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, padding: 12, fontFamily: 'var(--font-mono)', fontSize: 11, minHeight: 100, maxHeight: 220, overflowY: 'auto' }}>
        {logs.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, animation: 'log-in 0.2s ease both', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-3)', minWidth: 22, userSelect: 'none', fontWeight: 500 }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ color: msg.startsWith('✅') ? 'var(--teal)' : msg.startsWith('❌') ? 'var(--red)' : 'var(--text-2)', lineHeight: 1.5 }}>{msg}</span>
          </div>
        ))}
        {running && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--purple)', marginTop: 4 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--purple)', animation: 'blink-dot 0.8s infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em' }}>Synchronizing…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
