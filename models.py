"""Data models for the multi-agent research system."""

from typing import Dict, List, Optional, Literal
from pydantic import BaseModel, Field
from enum import Enum


class AgentState(BaseModel):
    """State shared across all agents in the workflow."""

    # Input
    user_topic: str = Field(description="The research topic provided by the user")
    compare_topic: Optional[str] = Field(default=None, description="Second topic for comparison mode")
    is_comparison_mode: bool = Field(default=False)

    # Planner output
    research_plan: Optional[Dict] = Field(default=None)
    is_controversial: bool = Field(default=False, description="Whether topic is controversial (triggers debate agent)")

    # Researcher output
    synthesized_data: Optional[Dict] = Field(default=None)
    research_attempts: int = Field(default=0)
    rag_context: Optional[Dict] = Field(default=None, description="Relevant past research from Qdrant")

    # Pagination offsets
    arxiv_offset: int = Field(default=0)
    github_offset: int = Field(default=0)
    stackoverflow_offset: int = Field(default=0)
    reddit_offset: int = Field(default=0)

    # Enrichment agent outputs
    citations: Optional[List[Dict]] = Field(default=None, description="Generated citations from CitationAgent")
    mermaid_diagrams: Optional[List[Dict]] = Field(default=None, description="Mermaid diagrams from VisualizationAgent")
    debate_perspectives: Optional[Dict] = Field(default=None, description="Pro/con analysis from DebateAgent")
    trend_timeline: Optional[Dict] = Field(default=None, description="Trend analysis from TrendAgent")
    confidence_scores: Optional[Dict] = Field(default=None, description="Per-claim confidence scores")

    # Writer output
    draft_report: Optional[str] = Field(default=None)
    writing_attempts: int = Field(default=0)

    # Critic output
    critique_feedback: Optional[str] = Field(default=None)
    approval_status: Optional[str] = Field(default=None)
    human_review_requested: bool = Field(default=False)

    # Final output
    final_report: Optional[str] = Field(default=None)
    compare_report: Optional[str] = Field(default=None, description="Report for second topic in comparison mode")

    # Workflow control
    current_iteration: int = Field(default=0)
    max_iterations_reached: bool = Field(default=False)
    active_agent: Optional[str] = Field(default=None, description="Currently executing agent name")
    agent_log: List[Dict] = Field(default_factory=list, description="Timestamped agent execution log")


class ResearchPlan(BaseModel):
    main_questions: List[str]
    sub_topics: List[str]
    search_strategies: List[str]
    expected_sources: List[str]
    research_depth: int = Field(default=3)
    is_controversial: bool = Field(default=False)


class SynthesizedData(BaseModel):
    key_findings: List[str]
    supporting_evidence: List[str]
    conflicting_information: List[str]
    source_summaries: List[Dict]
    data_quality_score: float
    confidence_scores: Optional[Dict[str, float]] = Field(default=None)
    recent_trends: Optional[List[str]] = Field(default=None)


class CritiqueResult(BaseModel):
    overall_assessment: Literal["approved", "revision_needed", "research_insufficient", "needs_human_review"]
    specific_feedback: str
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
    confidence_score: Optional[float] = Field(default=None)


class CitationEntry(BaseModel):
    id: str
    title: str
    authors: List[str]
    year: Optional[int] = None
    url: Optional[str] = None
    source_type: str
    ieee_format: str
    apa_format: str
    bibtex: str


class MermaidDiagram(BaseModel):
    diagram_type: str
    title: str
    mermaid_code: str
    description: str


class WorkflowStatus(str, Enum):
    PLANNING = "planning"
    RESEARCHING = "researching"
    ENRICHING = "enriching"
    WRITING = "writing"
    CRITIQUING = "critiquing"
    REVISING = "revising"
    HUMAN_REVIEW = "human_review"
    COMPLETED = "completed"
    FAILED = "failed"
