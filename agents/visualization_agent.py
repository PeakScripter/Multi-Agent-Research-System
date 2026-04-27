"""Visualization Agent — generates Mermaid diagrams from research data."""

import logging
import json
import re
from typing import Dict, Any, List
from groq_client import groq_client
from models import AgentState

logger = logging.getLogger(__name__)

class VisualizationAgent:
    def __init__(self):
        self.name = "Visualization Agent"
        logger.info(f"Initialized {self.name}")

    def generate_diagrams(self, state: AgentState) -> Dict[str, Any]:
        """Generate Mermaid diagrams that visually explain the research findings."""
        logger.info(f"{self.name}: generating diagrams for '{state.user_topic}'")

        if not state.synthesized_data:
            return {"mermaid_diagrams": []}

        diagrams = self._attempt_generation(state)
        
        # If any diagrams look invalid or it failed, try once more with stricter rules
        if not diagrams or any(not self._is_probably_valid(d["mermaid_code"]) for d in diagrams):
            logger.warning(f"{self.name}: initial attempt produced invalid diagrams. Retrying...")
            diagrams = self._attempt_generation(state, is_retry=True)

        # Final sanitization
        for d in diagrams:
            d["mermaid_code"] = self._sanitize_mermaid(d["mermaid_code"])

        valid = [d for d in diagrams if d.get("mermaid_code") and d.get("title")]
        logger.info(f"{self.name}: finalized {len(valid)} diagrams")
        return {"mermaid_diagrams": valid}

    def _attempt_generation(self, state: AgentState, is_retry: bool = False) -> List[Dict]:
        system_prompt = """You are an expert technical diagram designer specializing in Mermaid.js.
Generate clear, accurate Mermaid diagrams that represent technical concepts.

Rules:
- Mermaid code must be syntactically valid.
- Use 'flowchart LR', 'flowchart TD', 'sequenceDiagram', 'graph LR', 'pie', 'timeline', or 'quadrantChart'.
- NO characters like '(', ')', '[', ']', '\"', '\'', '&', '<', '>', '#', '@' outside of double quotes.
- ALWAYS wrap node labels in double quotes: A["Technical Label"] or B("Step Name").
- Node IDs must be alphanumeric or use underscores: 'step_1', 'api_gateway'.
- Keep it simple: max 10-12 nodes."""

        if is_retry:
            system_prompt += "\n\nCRITICAL: Previous attempt had syntax errors. Ensure every label is double-quoted and avoid special characters in node IDs."

        user_prompt = f"""
Research Topic: "{state.user_topic}"
Key Findings: {json.dumps(state.synthesized_data.get("key_findings", [])[:6])}

Generate 3 Mermaid diagrams. Return a JSON array:
[
  {{
    "diagram_type": "flowchart|sequenceDiagram|graph|timeline|pie",
    "title": "...",
    "description": "...",
    "mermaid_code": "..."
  }}
]
"""
        try:
            response = groq_client.generate_structured_response(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                expected_format="JSON array of Mermaid diagram objects",
                temperature=0.3 if is_retry else 0.5,
            )
            response = _extract_json_array(response)
            data = json.loads(response)
            return data if isinstance(data, list) else []
        except Exception as e:
            logger.error(f"Generation attempt failed: {e}")
            return []

    def _is_probably_valid(self, code: str) -> bool:
        """Heuristic check for common Mermaid errors."""
        if not code or len(code.strip()) < 10: return False
        # Check if flowchart/graph has labels without quotes? Hard to do perfectly.
        # But we can check if it starts with a valid type.
        types = ["flowchart", "graph", "sequenceDiagram", "timeline", "quadrantChart", "pie", "classDiagram"]
        return any(code.strip().startswith(t) for t in types)

    def _sanitize_mermaid(self, code: str) -> str:
        """Clean up characters that might break Mermaid even if inside quotes (sometimes)."""
        # Mermaid has issues with parentheses even in quotes sometimes if not escaped
        # But usually quotes are enough. Let's just ensure no weird backticks or multiple newlines.
        code = code.replace("```mermaid", "").replace("```", "").strip()
        # Remove trailing/leading newlines
        lines = [line.strip() for line in code.split('\n') if line.strip()]
        return '\n'.join(lines)

    def _fallback_diagram(self, topic: str) -> List[Dict]:
        safe = "".join(c if c.isalnum() else "_" for c in topic)[:20]
        return [
            {
                "diagram_type": "flowchart",
                "title": f"{topic} Overview",
                "description": "Overview of the research topic",
                "mermaid_code": f"flowchart TD\n    A[\"{topic}\"] --> B[\"Research\"]\n    B --> C[\"Findings\"]",
            }
        ]


def _extract_json_array(text: str) -> str:
    if "```json" in text:
        m = re.search(r"```json\s*(.*?)```", text, re.DOTALL)
        if m: return m.group(1).strip()
    if "```" in text:
        m = re.search(r"```\s*(.*?)```", text, re.DOTALL)
        if m: return m.group(1).strip()
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1:
        return text[start:end+1]
    return text.strip()
