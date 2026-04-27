import { useMemo } from "react";

const AGENTS = [
  { id: 'planner',    label: 'Planner',    sub: 'Strategic blueprint', symbol: '◈' },
  { id: 'researcher', label: 'Researcher', sub: 'Deep web synthesis',  symbol: '⊕' },
  { id: 'rag_store',  label: 'RAG Store',  sub: 'Vector memory',       symbol: '⬡' },
  { id: 'enrichment', label: 'Enrichment', sub: 'Data augmentation',   symbol: '⊗' },
  { id: 'writer',     label: 'Writer',     sub: 'Report synthesis',    symbol: '✦' },
  { id: 'critic',     label: 'Critic',     sub: 'Quality assurance',   symbol: '◎' },
];

const SUB_AGENTS = [
  { label: 'Citations',     symbol: '§' },
  { label: 'Diagrams',      symbol: '⌗' },
  { label: 'Trends',        symbol: '↗' },
  { label: 'Perspectives',  symbol: '⇌' },
];

function getNodeState(id, activeNode, completedNodes) {
  if (id === activeNode) return 'active';
  if (completedNodes.includes(id)) return 'done';
  return 'idle';
}

function ConnectorLine({ state }) {
  return (
    <div style={{
      position: 'relative',
      width: 56,
      height: 1,
      alignSelf: 'center',
      background: state === 'done'
        ? 'rgba(46,196,176,0.4)'
        : 'var(--border)',
      overflow: 'hidden',
    }}>
      {state === 'active' && (
        <div style={{
          position: 'absolute',
          top: -1,
          left: 0,
          width: 60,
          height: 3,
          background: 'linear-gradient(90deg, transparent, var(--purple), transparent)',
          animation: 'scan-flow 1.4s infinite',
        }} />
      )}
    </div>
  );
}

function AgentNode({ agent, state }) {
  const nodeStyles = {
    idle: {
      background: 'var(--bg-raised)',
      border: '1px solid var(--border)',
      symbolColor: 'var(--text-3)',
    },
    active: {
      background: 'rgba(139,124,246,0.1)',
      border: '1.5px solid var(--purple)',
      symbolColor: 'var(--purple)',
    },
    done: {
      background: 'rgba(46,196,176,0.1)',
      border: '1.5px solid var(--teal)',
      symbolColor: 'var(--teal)',
    },
  };

  const s = nodeStyles[state];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Circle */}
      <div style={{ position: 'relative' }}>
        {/* Expanding ring for active */}
        {state === 'active' && (
          <div style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            border: '1.5px solid var(--purple)',
            animation: 'ring-expand 1.8s infinite',
            pointerEvents: 'none',
          }} />
        )}
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: s.background,
          border: s.border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: state === 'done' ? 16 : 18,
          color: s.symbolColor,
          transition: 'all 0.35s ease',
          ...(state === 'active' ? { animation: 'agent-pulse 1.8s infinite' } : {}),
        }}>
          {state === 'done' ? '✓' : agent.symbol}
        </div>
      </div>

      {/* Label */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'var(--font-ui)',
          color: state === 'active' ? 'var(--text-1)' : state === 'done' ? 'var(--teal)' : 'var(--text-2)',
          transition: 'color 0.3s',
        }}>{agent.label}</div>
        <div style={{
          fontSize: 9,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-3)',
          marginTop: 2,
        }}>{agent.sub}</div>
      </div>
    </div>
  );
}

export default function AgentGraph({ activeNode, completedNodes = [] }) {
  const enrichmentState = getNodeState('enrichment', activeNode, completedNodes);
  const subActive = enrichmentState === 'active' || enrichmentState === 'done';

  // Determine connector state between each pair
  const connectorStates = useMemo(() => {
    return AGENTS.slice(0, -1).map((agent, i) => {
      const nextAgent = AGENTS[i + 1];
      const curState = getNodeState(agent.id, activeNode, completedNodes);
      const nextState = getNodeState(nextAgent.id, activeNode, completedNodes);

      if (curState === 'done' && (nextState === 'done' || nextState === 'active')) return 'done';
      if (nextState === 'active') return 'active';
      return 'idle';
    });
  }, [activeNode, completedNodes]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      gap: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background dots */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle, var(--text-3) 0.5px, transparent 0.5px)',
        backgroundSize: '24px 24px',
        opacity: 0.15,
        pointerEvents: 'none',
      }} />

      {/* Pipeline */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        position: 'relative',
        zIndex: 1,
      }}>
        {AGENTS.map((agent, i) => (
          <div key={agent.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <AgentNode agent={agent} state={getNodeState(agent.id, activeNode, completedNodes)} />
            {i < AGENTS.length - 1 && (
              <div style={{ paddingTop: 24 }}>
                <ConnectorLine state={connectorStates[i]} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sub-agents row */}
      <div style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'center',
        transition: 'opacity 0.4s ease',
        opacity: subActive ? 1 : 0.35,
      }}>
        {SUB_AGENTS.map((sa) => (
          <div key={sa.label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 20,
            background: 'var(--bg-raised)',
            border: `1px solid ${subActive ? 'rgba(46,196,176,0.3)' : 'var(--border)'}`,
            fontSize: 10,
            fontFamily: 'var(--font-ui)',
            fontWeight: 500,
            color: subActive ? 'var(--teal)' : 'var(--text-3)',
            transition: 'all 0.4s ease',
          }}>
            <span style={{ fontSize: 12 }}>{sa.symbol}</span>
            {sa.label}
          </div>
        ))}
      </div>
    </div>
  );
}
