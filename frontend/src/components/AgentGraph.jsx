import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const NODE_META = [
  { id: "planner",     label: "🗺 Planner",      x: 100,  y: 200 },
  { id: "researcher",  label: "🔍 Researcher",   x: 300,  y: 200 },
  { id: "rag_store",   label: "🧠 RAG Store",    x: 500,  y: 200 },
  { id: "enrichment",  label: "⚡ Enrichment",   x: 700,  y: 200 },
  { id: "writer",      label: "✍️ Writer",       x: 900,  y: 200 },
  { id: "critic",      label: "🔎 Critic",       x: 1100, y: 200 },
];

// Enrichment sub-nodes
const SUB_NODES = [
  { id: "citation",       label: "📚 Citations",   x: 620, y: 50  },
  { id: "visualization",  label: "📊 Diagrams",    x: 780, y: 50  },
  { id: "trend",          label: "📈 Trends",      x: 700, y: 360 },
  { id: "debate",         label: "⚖️ Debate",     x: 700, y: 440 },
];

const EDGES_MAIN = [
  ["planner", "researcher"],
  ["researcher", "rag_store"],
  ["rag_store", "enrichment"],
  ["enrichment", "writer"],
  ["writer", "critic"],
];

const EDGES_SUB = [
  ["enrichment", "citation"],
  ["enrichment", "visualization"],
  ["enrichment", "trend"],
  ["enrichment", "debate"],
];

function nodeStyle(id, active, completed) {
  if (id === active)        return { 
    background: "#4b4dd8", 
    color: "#fff", 
    border: "2px solid #c0c1ff", 
    boxShadow: "0 0 25px #4b4dd8",
    transform: "scale(1.1)"
  };
  if (completed.includes(id)) return { 
    background: "#04b4a2", 
    color: "#fff", 
    border: "2px solid #4fdbc8",
    boxShadow: "0 0 15px rgba(79, 219, 200, 0.3)"
  };
  return { 
    background: "rgba(23, 31, 51, 0.6)", 
    color: "#918fa1", 
    border: "1px solid rgba(70, 69, 85, 0.3)",
    backdropFilter: "blur(10px)"
  };
}

function buildNodes(active, completed) {
  const all = [...NODE_META, ...SUB_NODES];
  return all.map(({ id, label, x, y }) => ({
    id,
    position: { x, y },
    data: { label },
    style: {
      ...nodeStyle(id, active, completed),
      borderRadius: 12,
      padding: "10px 16px",
      fontSize: 12,
      fontWeight: 700,
      minWidth: 140,
      textAlign: "center",
      transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
    },
  }));
}

const EDGE_STYLE = { stroke: "#464555", strokeWidth: 2, opacity: 0.4 };
const ACTIVE_EDGE = { stroke: "#c0c1ff", strokeWidth: 3, strokeDasharray: "8 4", animated: true };

function buildEdges(active, completed) {
  const allEdges = [
    ...EDGES_MAIN.map(([s, t]) => ({ id: `${s}-${t}`, source: s, target: t })),
    ...EDGES_SUB.map(([s, t]) => ({ id: `${s}-${t}`, source: s, target: t })),
  ];
  return allEdges.map((e) => {
    const isActive = e.source === active || e.target === active;
    const isDone = completed.includes(e.source) && completed.includes(e.target);
    return {
      ...e,
      markerEnd: { 
        type: MarkerType.ArrowClosed, 
        color: isActive ? "#c0c1ff" : isDone ? "#4fdbc8" : "#464555" 
      },
      style: isActive ? ACTIVE_EDGE : isDone ? { stroke: "#4fdbc8", strokeWidth: 2 } : EDGE_STYLE,
      animated: isActive,
    };
  });
}

export default function AgentGraph({ activeNode, completedNodes }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes(null, []));
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges(null, []));

  useEffect(() => {
    setNodes(buildNodes(activeNode, completedNodes));
    setEdges(buildEdges(activeNode, completedNodes));
  }, [activeNode, completedNodes]);

  return (
    <div className="w-full h-full bg-[#0b1326] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#464555" gap={25} size={1} />
      </ReactFlow>
      
      {/* Decorative Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0b1326] via-transparent to-transparent opacity-60" />
    </div>
  );
}
