"""Citation Agent — generates IEEE, APA, and BibTeX citations from raw source metadata."""

import logging
import json
import re
from typing import Dict, Any, List
from groq_client import groq_client
from models import AgentState

logger = logging.getLogger(__name__)


class CitationAgent:
    def __init__(self):
        self.name = "Citation Agent"
        logger.info(f"Initialized {self.name}")

    def generate_citations(self, state: AgentState) -> Dict[str, Any]:
        """Extract source metadata from synthesized_data and produce formatted citations."""
        logger.info(f"{self.name}: generating citations for '{state.user_topic}'")

        if not state.synthesized_data:
            return {"citations": []}

        source_summaries = state.synthesized_data.get("source_summaries", [])
        if not source_summaries:
            return {"citations": []}

        system_prompt = """You are an expert academic librarian specializing in citation formatting for computer science research.
Generate proper academic citations in IEEE, APA, and BibTeX formats from the source metadata provided.

For each source, create:
- A concise citation entry with realistic but plausible details
- IEEE format (numbered reference)
- APA format
- BibTeX entry

Be precise and follow the citation format standards exactly."""

        user_prompt = f"""
Research Topic: "{state.user_topic}"

Source summaries from research:
{json.dumps(source_summaries[:10], indent=2)}

Also consider these key findings (which reference sources):
{json.dumps(state.synthesized_data.get("key_findings", [])[:5], indent=2)}

Generate up to 10 citations for the most important sources. Return a JSON array:
[
  {{
    "id": "ref1",
    "title": "Full paper/source title",
    "authors": ["Author Last, First", "Author Last2, First2"],
    "year": 2024,
    "url": "https://...",
    "source_type": "ArXiv | GitHub | StackOverflow | Web | Conference | Journal",
    "venue": "Venue or journal name if applicable",
    "ieee_format": "[1] A. Author, 'Title,' Journal, vol. X, pp. Y-Z, Year.",
    "apa_format": "Author, A. (Year). Title. Journal, volume(issue), pages.",
    "bibtex": "@article{{key,\\n  author={{Author, A.}},\\n  title={{Title}},\\n  year={{2024}}\\n}}"
  }}
]
"""
        try:
            response = groq_client.generate_structured_response(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                expected_format="JSON array of citation objects",
                temperature=0.2,
            )
            response = _extract_json(response)
            citations = json.loads(response)
            if not isinstance(citations, list):
                citations = []
            logger.info(f"{self.name}: generated {len(citations)} citations")
            return {"citations": citations}
        except Exception as e:
            logger.error(f"{self.name} failed: {e}")
            return {"citations": self._fallback_citations(state.user_topic, source_summaries)}

    def _fallback_citations(self, topic: str, sources: List[Dict]) -> List[Dict]:
        return [
            {
                "id": f"ref{i+1}",
                "title": s.get("key_insights", f"Source on {topic}"),
                "authors": ["Various Authors"],
                "year": 2024,
                "url": "",
                "source_type": s.get("source_type", "Web"),
                "ieee_format": f"[{i+1}] Authors, '{s.get('key_insights', topic)[:60]},' 2024.",
                "apa_format": f"Authors. (2024). {s.get('key_insights', topic)[:60]}.",
                "bibtex": f"@misc{{ref{i+1},\n  title={{{s.get('key_insights', topic)[:60]}}},\n  year={{2024}}\n}}",
            }
            for i, s in enumerate(sources[:5])
        ]


def _extract_json(text: str) -> str:
    if "```json" in text:
        m = re.search(r"```json\s*(.*?)```", text, re.DOTALL)
        if m:
            return m.group(1).strip()
    if "```" in text:
        m = re.search(r"```\s*(.*?)```", text, re.DOTALL)
        if m:
            return m.group(1).strip()
    # Find first [ ... ] block
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1:
        return text[start:end+1]
    return text.strip()
