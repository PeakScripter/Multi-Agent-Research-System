import { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });

let uid = 0;

export default function MermaidDiagram({ code }) {
  const ref = useRef(null);
  const id = useRef(`mermaid-${uid++}`);

  useEffect(() => {
    if (!ref.current || !code) return;
    ref.current.innerHTML = "";
    mermaid.render(id.current, code).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg;
    }).catch((err) => {
      if (ref.current) ref.current.innerHTML = `<p class="text-red-400 text-xs">Diagram error: ${err.message}</p>`;
    });
  }, [code]);

  return <div ref={ref} className="mermaid overflow-x-auto" />;
}
