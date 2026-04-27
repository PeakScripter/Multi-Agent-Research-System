"""Debate Agent — surfaces balanced pro/con perspectives for controversial tech topics."""

import logging
import json
import re
from typing import Dict, Any
from groq_client import groq_client
from models import AgentState

logger = logging.getLogger(__name__)


class DebateAgent:
    def __init__(self):
        self.name = "Debate Agent"
        logger.info(f"Initialized {self.name}")

    def generate_perspectives(self, state: AgentState) -> Dict[str, Any]:
        """Generate balanced pro/con perspectives for controversial topics."""
        logger.info(f"{self.name}: generating perspectives for '{state.user_topic}'")

        if not state.synthesized_data:
            return {"debate_perspectives": None}

        system_prompt = """You are a balanced technology analyst who presents multiple perspectives on controversial CS/IT topics.
Your role is to steelman BOTH sides of any debate — presenting the strongest possible arguments for and against a position.

Rules:
- Be intellectually honest and technically accurate
- Cite real evidence and real-world examples
- Avoid strawman arguments
- Cover technical, practical, and societal dimensions
- Each perspective should be 2-4 substantial bullet points
- Identify the key unresolved questions experts disagree on"""

        user_prompt = f"""
Controversial CS/IT Topic: "{state.user_topic}"

Conflicting information found in research:
{json.dumps(state.synthesized_data.get("conflicting_information", []), indent=2)}

Key findings:
{json.dumps(state.synthesized_data.get("key_findings", [])[:5], indent=2)}

Generate a balanced debate analysis. Return JSON:
{{
  "controversy_score": 0.0-1.0,
  "core_debate": "One sentence summarizing the central controversy",
  "pro_arguments": [
    {{"claim": "Strong argument in favor", "evidence": "Supporting evidence/example", "strength": "high|medium|low"}},
    ...
  ],
  "con_arguments": [
    {{"claim": "Strong argument against", "evidence": "Supporting evidence/example", "strength": "high|medium|low"}},
    ...
  ],
  "expert_consensus": "What most experts agree on (if anything)",
  "unresolved_questions": ["Question 1 still being debated", "Question 2"],
  "verdict": "Nuanced 2-3 sentence synthesis of the debate"
}}
"""
        try:
            response = groq_client.generate_structured_response(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                expected_format="JSON object with debate perspectives",
                temperature=0.5,
            )
            response = _extract_json_object(response)
            perspectives = json.loads(response)
            logger.info(f"{self.name}: controversy_score={perspectives.get('controversy_score', 'N/A')}")
            return {"debate_perspectives": perspectives}
        except Exception as e:
            logger.error(f"{self.name} failed: {e}")
            return {"debate_perspectives": None}


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
