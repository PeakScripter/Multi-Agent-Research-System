import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

let uid = 0;

function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark';
}

export default function MermaidDiagram({ code }) {
  const ref = useRef(null);
  const idBase = useRef(`mermaid-${uid++}`);
  const [renderKey, setRenderKey] = useState(0);

  // Watch for theme changes via MutationObserver on <html data-theme>
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setRenderKey(k => k + 1);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ref.current || !code) return;

    const theme = getTheme();
    mermaid.initialize({
      startOnLoad: false,
      theme,
      securityLevel: "loose",
      themeVariables: theme === 'dark' ? {
        primaryColor: '#1a1d2e',
        primaryTextColor: '#e4e6f4',
        primaryBorderColor: '#8b7cf6',
        lineColor: '#484b63',
        secondaryColor: '#151826',
        tertiaryColor: '#101320',
        fontFamily: 'Space Grotesk, system-ui, sans-serif',
      } : {
        primaryColor: '#f0f0f5',
        primaryTextColor: '#1a1a2e',
        primaryBorderColor: '#6c5ce7',
        lineColor: '#9494ad',
        secondaryColor: '#e8e8f0',
        tertiaryColor: '#ffffff',
        fontFamily: 'Space Grotesk, system-ui, sans-serif',
      },
    });

    ref.current.innerHTML = "";
    // Mermaid requires unique IDs per render
    const renderId = `${idBase.current}-r${renderKey}`;
    mermaid.render(renderId, code).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg;
    }).catch((err) => {
      if (ref.current) ref.current.innerHTML = `<p style="color:var(--red);font-size:12px;">Diagram error: ${err.message}</p>`;
    });
  }, [code, renderKey]);

  return <div ref={ref} className="mermaid overflow-x-auto" />;
}
