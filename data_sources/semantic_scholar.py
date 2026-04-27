"""Semantic Scholar API data source — richer academic metadata than ArXiv alone."""

import logging
import requests
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

BASE_URL = "https://api.semanticscholar.org/graph/v1"
FIELDS = "title,authors,year,abstract,citationCount,influentialCitationCount,externalIds,url,venue"


class SemanticScholarFetcher:
    def __init__(self, max_results: int = 10):
        self.max_results = max_results
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": "MARS-Research-System/1.0"})

    def search_papers(self, query: str, offset: int = 0) -> List[Dict[str, Any]]:
        """Search papers and return enriched metadata including citation counts."""
        try:
            resp = self._session.get(
                f"{BASE_URL}/paper/search",
                params={
                    "query": query,
                    "limit": self.max_results,
                    "offset": offset,
                    "fields": FIELDS,
                },
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            papers = []
            for p in data.get("data", []):
                authors = [a.get("name", "") for a in p.get("authors", [])]
                papers.append({
                    "title": p.get("title", ""),
                    "authors": authors,
                    "year": p.get("year"),
                    "abstract": (p.get("abstract") or "")[:300],
                    "citation_count": p.get("citationCount", 0),
                    "influential_citations": p.get("influentialCitationCount", 0),
                    "venue": p.get("venue", ""),
                    "url": p.get("url", ""),
                    "arxiv_id": (p.get("externalIds") or {}).get("ArXiv", ""),
                    "doi": (p.get("externalIds") or {}).get("DOI", ""),
                    "source": "semantic_scholar",
                })
            logger.info(f"Semantic Scholar: {len(papers)} papers for '{query}'")
            return papers
        except Exception as e:
            logger.error(f"Semantic Scholar search failed: {e}")
            return []

    def get_paper_details(self, paper_id: str) -> Dict[str, Any]:
        """Get detailed info for a single paper by Semantic Scholar paper ID."""
        try:
            resp = self._session.get(
                f"{BASE_URL}/paper/{paper_id}",
                params={"fields": FIELDS + ",references,citations"},
                timeout=15,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error(f"Semantic Scholar paper detail failed: {e}")
            return {}

    def fetch_for_topic(self, topic: str) -> Dict[str, Any]:
        papers = self.search_papers(topic)
        return {
            "source": "semantic_scholar",
            "papers": papers,
            "count": len(papers),
            "top_cited": sorted(papers, key=lambda p: p.get("citation_count", 0), reverse=True)[:3],
        }
