"""Google Patents / SerpAPI patent search data source."""

import logging
import requests
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

SERPAPI_URL = "https://serpapi.com/search"
PATENTS_GOOGLE_URL = "https://patents.google.com/xhr/query"


class PatentFetcher:
    """
    Fetches patent data for a topic.

    Uses SerpAPI (if key provided) or falls back to a direct
    Google Patents query endpoint.
    """

    def __init__(self, serpapi_key: Optional[str] = None, max_results: int = 5):
        self.serpapi_key = serpapi_key
        self.max_results = max_results
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": "MARS-Research-System/1.0"})

    def _search_via_serpapi(self, query: str) -> List[Dict]:
        try:
            resp = self._session.get(
                SERPAPI_URL,
                params={
                    "api_key": self.serpapi_key,
                    "engine": "google_patents",
                    "q": query,
                    "num": self.max_results,
                },
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            results = []
            for p in data.get("organic_results", [])[:self.max_results]:
                results.append({
                    "title": p.get("title", ""),
                    "patent_id": p.get("patent_id", ""),
                    "assignee": p.get("assignee", ""),
                    "inventor": p.get("inventor", ""),
                    "filing_date": p.get("filing_date", ""),
                    "grant_date": p.get("grant_date", ""),
                    "abstract": p.get("snippet", "")[:300],
                    "url": p.get("pdf", ""),
                    "source": "google_patents",
                })
            return results
        except Exception as e:
            logger.error(f"SerpAPI patents search failed: {e}")
            return []

    def _search_direct(self, query: str) -> List[Dict]:
        """Minimal fallback using Google Patents public JSON endpoint."""
        try:
            resp = self._session.get(
                PATENTS_GOOGLE_URL,
                params={"url": f"q={requests.utils.quote(query)}&num={self.max_results}"},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            hits = data.get("results", {}).get("cluster", [])
            results = []
            for cluster in hits[:self.max_results]:
                for doc in cluster.get("result", [])[:1]:
                    patent = doc.get("patent", {})
                    results.append({
                        "title": patent.get("title", ""),
                        "patent_id": patent.get("publication_number", ""),
                        "assignee": patent.get("assignee", ""),
                        "abstract": patent.get("abstract", "")[:300],
                        "filing_date": patent.get("filing_date", ""),
                        "url": f"https://patents.google.com/patent/{patent.get('publication_number', '')}",
                        "source": "google_patents",
                    })
            return results
        except Exception as e:
            logger.error(f"Direct patents search failed: {e}")
            return []

    def fetch_for_topic(self, topic: str) -> Dict[str, Any]:
        if self.serpapi_key:
            patents = self._search_via_serpapi(topic)
        else:
            patents = self._search_direct(topic)

        logger.info(f"Patents: {len(patents)} results for '{topic}'")
        return {
            "source": "patents",
            "patents": patents,
            "count": len(patents),
        }
