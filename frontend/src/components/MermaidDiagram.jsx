import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { regenerateDiagram } from "../lib/api";

// Globally unique counter — each mermaid.render() call needs a fresh ID to
// prevent collisions from React StrictMode's double-invocation and from
// multiple MermaidDiagram instances rendering concurrently.
let renderCounter = 0;

// Only call mermaid.initialize() once per theme change. Calling it while
// another render() is in flight resets Mermaid's parser and causes diagrams
// to fail silently with Mermaid's built-in error SVG.
let initializedTheme = null;

function getTheme() {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "default"
    : "dark";
}

function ensureInitialized(theme) {
  if (initializedTheme === theme) return;
  initializedTheme = theme;
  mermaid.initialize({
    startOnLoad: false,
    theme,
    securityLevel: "loose",
    themeVariables:
      theme === "dark"
        ? {
            primaryColor: "#1a1d2e",
            primaryTextColor: "#e4e6f4",
            primaryBorderColor: "#8b7cf6",
            lineColor: "#484b63",
            secondaryColor: "#151826",
            tertiaryColor: "#101320",
            fontFamily: "Space Grotesk, system-ui, sans-serif",
          }
        : {
            primaryColor: "#f0f0f5",
            primaryTextColor: "#1a1a2e",
            primaryBorderColor: "#6c5ce7",
            lineColor: "#9494ad",
            secondaryColor: "#e8e8f0",
            tertiaryColor: "#ffffff",
            fontFamily: "Space Grotesk, system-ui, sans-serif",
          },
  });
}

// Render `code` into the given container. Returns the svg string or throws.
async function renderCode(code) {
  const id = `mermaid-r${renderCounter++}`;
  try {
    const { svg } = await mermaid.render(id, code);
    return svg;
  } finally {
    // Always clean up the hidden temp element Mermaid creates in <body>.
    document.getElementById(id)?.remove();
  }
}

// "Rebuilding…" spinner shown while the LLM regenerates the diagram.
function Spinner() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        gap: 12,
        minHeight: 120,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: "3px solid var(--border)",
          borderTopColor: "var(--purple)",
          borderRadius: "50%",
          animation: "mermaid-spin 0.8s linear infinite",
        }}
      />
      <div
        style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--text-3)",
          letterSpacing: "0.04em",
        }}
      >
        Rebuilding graph…
      </div>
      <style>{`@keyframes mermaid-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function MermaidDiagram({ code, title = "", description = "" }) {
  const containerRef = useRef(null);
  const mountedRef = useRef(true);
  const [renderKey, setRenderKey] = useState(0); // bumped on theme change
  const [status, setStatus] = useState("idle"); // "idle"|"rendering"|"regenerating"|"failed"
  const [svgHtml, setSvgHtml] = useState("");

  // Track mount state for async safety.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Re-render when theme toggles.
  useEffect(() => {
    const observer = new MutationObserver(() => setRenderKey((k) => k + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  // Main render effect — fires when code, theme, or status resets to "idle".
  useEffect(() => {
    if (!code) return;
    ensureInitialized(getTheme());
    setStatus("rendering");

    let cancelled = false;

    (async () => {
      // ── Attempt 1: render the original code ──────────────────────────────
      try {
        const svg = await renderCode(code);
        if (cancelled || !mountedRef.current) return;
        setSvgHtml(svg);
        setStatus("done");
        return;
      } catch (err) {
        if (cancelled || !mountedRef.current) return;
        console.warn("MermaidDiagram: initial render failed, regenerating…", err.message);
      }

      // ── Attempt 2: ask the LLM to regenerate from title + description ────
      setStatus("regenerating");
      try {
        const fresh = await regenerateDiagram(title || "Diagram", description);
        if (cancelled || !mountedRef.current) return;

        if (fresh) {
          const svg = await renderCode(fresh);
          if (cancelled || !mountedRef.current) return;
          setSvgHtml(svg);
          setStatus("done");
          return;
        }
      } catch (err) {
        if (cancelled || !mountedRef.current) return;
        console.warn("MermaidDiagram: regeneration also failed", err.message);
      }

      if (!cancelled && mountedRef.current) setStatus("failed");
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, renderKey]);

  if (status === "rendering" || status === "regenerating") return <Spinner />;

  if (status === "failed") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 16px",
          gap: 8,
          background: "var(--bg)",
          borderRadius: 6,
          border: "1px dashed var(--border)",
          minHeight: 80,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--text-3)",
          }}
        >
          Diagram could not be rendered
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid overflow-x-auto"
      dangerouslySetInnerHTML={svgHtml ? { __html: svgHtml } : undefined}
    />
  );
}
