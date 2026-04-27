"""Data sources package for CS/IT research system."""

from .cs_research_fetcher import CSResearchFetcher
from .real_time_sources import RealTimeDataSources
from .semantic_scholar import SemanticScholarFetcher
from .youtube_transcripts import YouTubeTranscriptFetcher
from .patents import PatentFetcher

__all__ = [
    "CSResearchFetcher",
    "RealTimeDataSources",
    "SemanticScholarFetcher",
    "YouTubeTranscriptFetcher",
    "PatentFetcher",
]
