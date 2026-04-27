"""LangGraph workflow — orchestrates all agents including enrichment pipeline and RAG."""

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any, Literal

from langgraph.graph import StateGraph, END

from models import AgentState, WorkflowStatus
from agents.planner_agent import PlannerAgent
from agents.researcher_agent import ResearcherAgent
from agents.writer_agent import WriterAgent
from agents.critic_agent import CriticAgent
from agents.citation_agent import CitationAgent
from agents.visualization_agent import VisualizationAgent
from agents.debate_agent import DebateAgent
from agents.trend_agent import TrendAgent
from config import MAX_ITERATIONS, MAX_RESEARCH_ATTEMPTS, MAX_WRITING_ATTEMPTS

logger = logging.getLogger(__name__)


class MultiAgentResearchWorkflow:
    """
    Full pipeline:
      planner → researcher → rag_store → enrichment → writer → critic → [loop] → word
    Enrichment runs Citation, Visualization, Trend (and optionally Debate) in parallel threads.
    """

    def __init__(self):
        self.planner = PlannerAgent()
        self.researcher = ResearcherAgent()
        self.writer = WriterAgent()
        self.critic = CriticAgent()
        self.citation = CitationAgent()
        self.visualization = VisualizationAgent()
        self.debate = DebateAgent()
        self.trend = TrendAgent()

        # Lazy-import RAG to avoid hard failure if qdrant not installed
        try:
            from rag.qdrant_store import research_memory
            self._memory = research_memory
        except Exception:
            self._memory = None

        self.workflow = self._build()
        logger.info("MultiAgentResearchWorkflow initialised")

    # ── node helpers ──────────────────────────────────────────────────────────

    def _log_agent(self, state: AgentState, agent_name: str) -> Dict[str, Any]:
        """Log agent activity and return state updates."""
        state.agent_log.append({"agent": agent_name, "ts": time.time()})
        state.active_agent = agent_name
        state.current_iteration += 1
        return {
            "agent_log": state.agent_log,
            "active_agent": agent_name,
            "current_iteration": state.current_iteration
        }

    # ── nodes ─────────────────────────────────────────────────────────────────

    def _planner_node(self, state: AgentState) -> Dict[str, Any]:
        log_updates = self._log_agent(state, "planner")
        logger.info("▶ Planner")
        try:
            result = self.planner.create_research_plan(state)
            plan = result.get("research_plan", {})
            is_controversial = plan.get("is_controversial", False)
            return {**log_updates, **result, "is_controversial": is_controversial, "active_agent": "researcher"}
        except Exception as e:
            logger.error(f"Planner error: {e}")
            return {
                **log_updates,
                "research_plan": _fallback_plan(state.user_topic),
                "is_controversial": False,
                "active_agent": "researcher",
            }

    def _researcher_node(self, state: AgentState) -> Dict[str, Any]:
        log_updates = self._log_agent(state, "researcher")
        logger.info("▶ Researcher")
        
        # Inject RAG context before fetching new data
        if self._memory:
            rag_ctx = self._memory.get_context_for_topic(state.user_topic)
            if rag_ctx:
                state.rag_context = rag_ctx

        if state.synthesized_data and state.research_attempts >= 1:
            feedback = self.critic.get_feedback_for_research(state)
            result = self.researcher.expand_research(state, feedback)
        else:
            result = self.researcher.gather_and_synthesize(state)

        return {**log_updates, **result, "active_agent": "enrichment"}

    def _rag_store_node(self, state: AgentState) -> Dict[str, Any]:
        """Persist research results to Qdrant so future queries benefit."""
        log_updates = self._log_agent(state, "rag_store")
        logger.info("▶ RAG Store")
        if self._memory and state.synthesized_data:
            self._memory.store(
                topic=state.user_topic,
                synthesized_data=state.synthesized_data,
                final_report=state.draft_report or "",
            )
        return {**log_updates, "active_agent": "enrichment"}

    def _enrichment_node(self, state: AgentState) -> Dict[str, Any]:
        """Run Citation, Visualization, Trend (and Debate if controversial) in parallel."""
        log_updates = self._log_agent(state, "enrichment")
        logger.info("▶ Enrichment (parallel)")

        tasks = {
            "citation": lambda: self.citation.generate_citations(state),
            "visualization": lambda: self.visualization.generate_diagrams(state),
            "trend": lambda: self.trend.analyze_trends(state),
        }
        if state.is_controversial:
            tasks["debate"] = lambda: self.debate.generate_perspectives(state)

        results: Dict[str, Any] = {}
        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = {pool.submit(fn): name for name, fn in tasks.items()}
            for future in as_completed(futures):
                name = futures[future]
                try:
                    results.update(future.result())
                    logger.info(f"  ✓ {name}")
                except Exception as e:
                    logger.error(f"  ✗ {name}: {e}")

        return {**log_updates, **results, "active_agent": "writer"}

    def _writer_node(self, state: AgentState) -> Dict[str, Any]:
        log_updates = self._log_agent(state, "writer")
        logger.info("▶ Writer")

        if state.draft_report and state.writing_attempts >= 1:
            feedback = self.critic.get_feedback_for_revision(state)
            result = self.writer.revise_report(state, feedback)
        else:
            result = self.writer.write_report(state)

        return {**log_updates, **result, "active_agent": "critic"}

    def _critic_node(self, state: AgentState) -> Dict[str, Any]:
        log_updates = self._log_agent(state, "critic")
        logger.info("▶ Critic")
        try:
            result = self.critic.critique_report(state)
        except Exception as e:
            logger.error(f"Critic error: {e}")
            result = {
                "critique_feedback": "Auto-approved due to evaluation error.",
                "approval_status": "approved",
            }
        return {**log_updates, **result, "active_agent": result.get("approval_status", "approved")}

    def _human_review_node(self, state: AgentState) -> Dict[str, Any]:
        """Placeholder — API layer intercepts this and waits for user input."""
        self._log_agent(state, "human_review")
        logger.info("▶ Human Review requested")
        return {"human_review_requested": True, "active_agent": "human_review"}

    # ── routing ───────────────────────────────────────────────────────────────

    def _critic_decision(self, state: AgentState) -> Literal[
        "approved", "revision_needed", "research_insufficient", "needs_human_review"
    ]:

        if state.current_iteration >= MAX_ITERATIONS:
            logger.warning(f"Max iterations ({MAX_ITERATIONS}) reached — forcing approval")
            state.max_iterations_reached = True
            return "approved"
        if state.research_attempts >= MAX_RESEARCH_ATTEMPTS:
            logger.warning("Max research attempts — forcing approval")
            return "approved"
        if state.writing_attempts >= MAX_WRITING_ATTEMPTS:
            logger.warning("Max writing attempts — forcing approval")
            return "approved"

        try:
            decision = self.critic.should_continue_workflow(state)
            if decision == "revision_needed" and state.writing_attempts >= 2:
                return "approved"
            if decision == "research_insufficient" and state.research_attempts >= 2:
                return "approved"
            return decision
        except Exception as e:
            logger.error(f"Critic decision error: {e}")
            return "approved"

    # ── graph assembly ────────────────────────────────────────────────────────

    def _build(self) -> StateGraph:
        g = StateGraph(AgentState)

        g.add_node("planner", self._planner_node)
        g.add_node("researcher", self._researcher_node)
        g.add_node("rag_store", self._rag_store_node)
        g.add_node("enrichment", self._enrichment_node)
        g.add_node("writer", self._writer_node)
        g.add_node("critic", self._critic_node)
        g.add_node("human_review", self._human_review_node)

        g.set_entry_point("planner")
        g.add_edge("planner", "researcher")
        g.add_edge("researcher", "rag_store")
        g.add_edge("rag_store", "enrichment")
        g.add_edge("enrichment", "writer")
        g.add_edge("writer", "critic")

        g.add_conditional_edges(
            "critic",
            self._critic_decision,
            {
                "approved": END,
                "revision_needed": "writer",
                "research_insufficient": "researcher",
                "needs_human_review": "human_review",
            },
        )
        g.add_edge("human_review", END)

        return g.compile(checkpointer=None)

    # ── public API ────────────────────────────────────────────────────────────

    def run(self, topic: str, compare_topic: str = None) -> Dict[str, Any]:
        logger.info(f"Starting research: '{topic}'")
        initial = AgentState(
            user_topic=topic,
            compare_topic=compare_topic,
            is_comparison_mode=bool(compare_topic),
        )
        try:
            final = self.workflow.invoke(initial)
            final["final_report"] = final.get("draft_report", "No report generated")
            logger.info("Workflow completed")
            return final
        except Exception as e:
            logger.error(f"Workflow error: {e}")
            return {
                "user_topic": topic,
                "final_report": f"Error generating report: {e}",
                "error": str(e),
                "workflow_status": WorkflowStatus.FAILED.value,
            }

    def run_with_callback(self, topic: str, callback=None, compare_topic: str = None) -> Dict[str, Any]:
        if callback:
            callback("Starting research workflow...")

        initial = AgentState(
            user_topic=topic,
            compare_topic=compare_topic,
            is_comparison_mode=bool(compare_topic),
        )
        _LABELS = {
            "planner": "Planning research approach...",
            "researcher": "Gathering data from ArXiv, GitHub, Semantic Scholar...",
            "rag_store": "Saving to research memory...",
            "enrichment": "Running Citation, Visualization & Trend agents in parallel...",
            "writer": "Writing comprehensive report...",
            "critic": "Evaluating report quality...",
            "human_review": "Awaiting human review...",
        }
        try:
            final_state = initial.dict()
            for step in self.workflow.stream(initial):
                final_state.update(step)
                if callback:
                    for node in step:
                        callback(_LABELS.get(node, f"Running {node}..."))

            final_state["final_report"] = final_state.get("draft_report", "No report generated")
            if callback:
                callback("Research workflow completed!")
            return final_state
        except Exception as e:
            logger.error(f"Workflow stream error: {e}")
            if callback:
                callback(f"Error: {e}")
            return {
                "user_topic": topic,
                "final_report": f"Error: {e}",
                "error": str(e),
                "workflow_status": WorkflowStatus.FAILED.value,
            }


# ── fallbacks ──────────────────────────────────────────────────────────────────

def _fallback_plan(topic: str) -> dict:
    return {
        "main_questions": [f"What is {topic}?", f"What are the key aspects of {topic}?"],
        "sub_topics": ["Overview", "Key aspects", "Challenges", "Future trends"],
        "search_strategies": ["Literature review", "Industry reports"],
        "expected_sources": ["Academic papers", "Industry reports"],
        "research_depth": 3,
        "is_controversial": False,
    }


def _fallback_synthesis(topic: str) -> dict:
    return {
        "key_findings": [f"Research on {topic} shows active development"],
        "supporting_evidence": [f"Multiple sources indicate growing interest in {topic}"],
        "conflicting_information": [],
        "source_summaries": [{"source_type": "General", "key_insights": f"Overview of {topic}", "reliability": "medium"}],
        "data_quality_score": 0.6,
    }


def _fallback_report(topic: str) -> str:
    return f"# Research Report: {topic}\n\nThis report was generated as a fallback.\n\n## Overview\n\n{topic} is an active area of research with significant ongoing developments.\n"
