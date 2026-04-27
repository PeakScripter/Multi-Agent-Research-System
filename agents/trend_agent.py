"""Trend Agent — builds a timeline showing how a topic has evolved over time."""

import logging
import json
import re
from typing import Dict, Any
from groq_client import groq_client
from models import AgentState

logger = logging.getLogger(__name__)


class TrendAgent:
    def __init__(self):
        self.name = "Trend Agent"
        logger.info(f"Initialized {self.name}")

    def analyze_trends(self, state: AgentState) -> Dict[str, Any]:
        """Produce a structured trend timeline and momentum analysis."""
        logger.info(f"{self.name}: analyzing trends for '{state.user_topic}'")

        if not state.synthesized_data:
            return {"trend_timeline": None}

        system_prompt = """You are a technology trend analyst specializing in tracking the evolution of CS/IT concepts over time.
Using research data, you identify key milestones, turning points, and predict near-future direction.

Focus on:
- Key milestones and breakthroughs
- Adoption curve (research → industry → mainstream)
- GitHub/paper publication volume trends
- Momentum signals (growing/plateauing/declining)"""

        papers = state.synthesized_data.get("data_sources", {})
        recent_trends = state.synthesized_data.get("recent_trends", [])

        user_prompt = f"""
Topic: "{state.user_topic}"

Recent trends from research:
{json.dumps(recent_trends, indent=2)}

Source metadata:
{json.dumps(papers, indent=2)}

Key findings:
{json.dumps(state.synthesized_data.get("key_findings", [])[:5], indent=2)}

Generate a comprehensive trend analysis. Return JSON:
{{
  "momentum": "accelerating|stable|decelerating",
  "maturity_stage": "emerging|growing|mainstream|mature|declining",
  "interest_score": 0.0-1.0,
  "timeline": [
    {{
      "period": "2018-2020",
      "label": "Foundation",
      "description": "What happened in this period",
      "key_events": ["Event 1", "Event 2"],
      "significance": "high|medium|low"
    }},
    ...
  ],
  "inflection_points": [
    {{"year": 2022, "event": "Key breakthrough or adoption event", "impact": "Description"}}
  ],
  "current_hotspots": ["Active research area 1", "Active research area 2"],
  "6_month_prediction": "Where this technology/topic is headed in 6 months",
  "research_gap": "Most significant open problem or underexplored area"
}}

Include timeline entries from ~2018 to present, with one entry for near-future (next 12 months).
"""
        try:
            response = groq_client.generate_structured_response(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                expected_format="JSON trend timeline object",
                temperature=0.4,
            )
            response = _extract_json_object(response)
            trend_data = json.loads(response)
            logger.info(f"{self.name}: momentum={trend_data.get('momentum')} maturity={trend_data.get('maturity_stage')}")
            return {"trend_timeline": trend_data}
        except Exception as e:
            logger.error(f"{self.name} failed: {e}")
            return {"trend_timeline": None}


def _extract_json_object(text: str) -> str:
    if "```json" in text:
        m = re.search(r"```json\s*(.*?)```", text, re.DOTALL)
        if m:
            return m.group(1).strip()
    if "```" in text:
        m = re.search(r"```\s*(.*?)```", text, re.DOTALL)
        if m:
            return m.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        return text[start:end+1]
    return text.strip()
