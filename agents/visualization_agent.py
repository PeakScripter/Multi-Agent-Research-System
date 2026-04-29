"""Visualization Agent — generates Mermaid diagrams from research data."""

import logging
import json
import re
from typing import Dict, Any, List, Optional
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

        # Sanitize FIRST — fixes literal \n, strips markdown fences, etc.
        for d in diagrams:
            d["mermaid_code"] = self._sanitize_mermaid(d.get("mermaid_code", ""))

        # Check validity AFTER sanitization
        if not diagrams or any(not self._is_probably_valid(d["mermaid_code"]) for d in diagrams):
            logger.warning(f"{self.name}: initial attempt produced invalid diagrams. Retrying...")
            diagrams = self._attempt_generation(state, is_retry=True)
            # Sanitize retry output too
            for d in diagrams:
                d["mermaid_code"] = self._sanitize_mermaid(d.get("mermaid_code", ""))

        valid = [d for d in diagrams if d.get("mermaid_code") and d.get("title")]

        # If still nothing valid after retry, use fallback
        if not valid:
            logger.warning(f"{self.name}: both attempts failed. Using fallback diagrams.")
            valid = self._fallback_diagram(state.user_topic)

        logger.info(f"{self.name}: finalized {len(valid)} diagrams")
        return {"mermaid_diagrams": valid}

    def _attempt_generation(self, state: AgentState, is_retry: bool = False) -> List[Dict]:
        system_prompt = """You are an expert technical diagram designer specializing in Mermaid.js.
Generate clear, accurate Mermaid diagrams that represent technical concepts.

Rules:
- Mermaid code must be syntactically valid.
- Use 'flowchart LR', 'flowchart TD', 'sequenceDiagram', 'graph LR', 'pie', 'timeline', or 'quadrantChart'.
- NO characters like '(', ')', '[', ']', '"', '\'', '&', '<', '>', '#', '@' outside of double quotes.
- ALWAYS wrap node labels in double quotes: A["Technical Label"] or B("Step Name").
- Node IDs must be alphanumeric or use underscores: 'step_1', 'api_gateway'.
- Keep it simple: max 10-12 nodes.
- For pie charts: use the format 'pie title "Title"' followed by '"Label" : value' on each line. Values must be plain numbers, NO percent signs.
- For flowcharts: every node label with special characters MUST be in double quotes inside brackets: A["Label (info)"]
- Arrow syntax: use --> for solid arrows, -.-> for dotted arrows (exactly these two forms, nothing else). NEVER use -.--> or -.-->, only -.->.
- Each line of mermaid code MUST be on its own line (use real newlines, not literal \\n).
- NEVER use the word 'title' inside flowcharts, graphs, or sequence diagrams (it causes parse errors). Only pie charts and timelines support titles.
- For timelines: Use syntax 'timeline\\n    title My Timeline\\n    2024 : Event description'. DO NOT use quotes around the timeline title or events."""

        if is_retry:
            system_prompt += """

CRITICAL: Previous attempt had syntax errors. Follow these rules EXACTLY:
1. Every node label MUST be wrapped in double quotes: A["My Label"]
2. Node IDs must be simple alphanumeric: step1, nodeA, item_2
3. No parentheses, brackets, or special chars in node IDs
4. For pie charts, values are plain numbers (no % sign)
5. Test each line mentally for Mermaid syntax validity
6. Keep diagrams very simple — 6-8 nodes max"""

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
        """Lightweight check for common Mermaid issues that actually break rendering."""
        if not code or len(code.strip()) < 10:
            return False

        code = code.strip()

        # Must start with a valid diagram type
        valid_types = ["flowchart", "graph", "sequenceDiagram", "timeline",
                       "quadrantChart", "pie", "classDiagram", "stateDiagram",
                       "erDiagram", "gantt", "gitgraph", "mindmap"]
        if not any(code.startswith(t) for t in valid_types):
            return False

        # Must have multiple lines (single-line = broken, usually literal \n not converted)
        if '\n' not in code:
            return False

        # Check for leftover markdown fences
        if '```' in code:
            return False

        return True

    def _sanitize_mermaid(self, code: str) -> str:
        """Clean up characters that might break Mermaid."""
        # Strip markdown fences
        code = code.replace("```mermaid", "").replace("```", "").strip()
        # Convert literal \n (backslash + n as text) into actual newlines.
        code = code.replace("\\n", "\n")
        
        # Replace Unicode characters that LLMs commonly inject and break Mermaid
        unicode_replacements = {
            '\u2011': '-', '\u2010': '-', '\u2012': '-', '\u2013': '-', '\u2014': '-', '\u2015': '-',
            '\u2018': "'", '\u2019': "'", '\u201c': '"', '\u201d': '"',
            '\u2026': '...', '\xa0': ' ',
            '⟶': '-->', '→': '-->'
        }
        for uc, repl in unicode_replacements.items():
            code = code.replace(uc, repl)

        # Normalize over-long solid arrows (---> or ----> → -->). Using {3,} avoids
        # touching -.-> dotted arrows where -> is only 2 chars.
        code = re.sub(r'-{3,}>', '-->', code)
        # Fix malformed dotted arrows that LLMs generate: -.--> or -.---> → -.->
        code = re.sub(r'-\.-+->', '-.->',  code)

        lines = [line.rstrip() for line in code.split('\n') if line.strip()]

        # Diagram-specific aggressive sanitization
        if lines and lines[0].strip().startswith(("flowchart", "graph")):
            # Remove any 'title' line which breaks flowchart parser
            lines = [line for line in lines if not line.strip().startswith('title ')]
            
        if lines and lines[0].strip().startswith("pie"):
            # Mermaid pie charts do not use quotes around titles
            if len(lines) > 0 and lines[0].startswith("pie title"):
                lines[0] = lines[0].replace('"', '').replace("'", "")
        
        if lines and lines[0].strip().startswith("timeline"):
            # Mermaid timelines don't play well with quotes sometimes, strip them
            lines = [line.replace('"', '').replace("'", "") for line in lines]

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


def regenerate_diagram(title: str, description: str = "") -> Optional[str]:
    """Generate a brand-new Mermaid diagram from a title + description.
    Called when client-side rendering fails — simpler and more reliable than
    trying to repair broken syntax."""

    system_prompt = """You are a Mermaid.js diagram generator. Given a diagram title and description, produce a single, valid Mermaid diagram.

Strict rules:
- Choose ONE diagram type: flowchart TD, flowchart LR, pie, or sequenceDiagram.
- flowchart: node IDs are plain alphanumeric/underscores (A, node_1). Labels in double-quoted brackets: A["Label"].
  Arrow types: --> (solid) or -.-> (dotted). NO other arrow forms.
  NEVER use the word 'title' inside a flowchart.
- pie: format exactly as:
    pie title My Title
        "Label 1" : 30
        "Label 2" : 70
  Values are plain integers. No % signs.
- Max 8 nodes / slices. Keep it concise.
- Return ONLY the raw Mermaid code. No markdown fences, no explanation."""

    user_prompt = f"""Generate a Mermaid diagram for:
Title: {title}
Description: {description or title}

Return ONLY the Mermaid code:"""

    try:
        response = groq_client.generate_response(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.3,
        )
        agent = VisualizationAgent()
        code = agent._sanitize_mermaid(response)

        valid_types = ["flowchart", "graph", "sequenceDiagram", "timeline",
                       "quadrantChart", "pie", "classDiagram", "stateDiagram",
                       "erDiagram", "gantt"]
        if any(code.startswith(t) for t in valid_types):
            return code

        logger.warning(f"regenerate_diagram: LLM output not valid Mermaid (starts with: {code[:30]!r})")
        return None
    except Exception as e:
        logger.error(f"regenerate_diagram failed: {e}")
        return None
        return None


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
