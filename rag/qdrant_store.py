"""Qdrant-backed research memory: stores and retrieves past research using vector similarity."""

import logging
import json
import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import (
        Distance, VectorParams, PointStruct, Filter,
        FieldCondition, MatchValue,
    )
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False
    logger.warning("qdrant-client not installed — RAG memory disabled")

try:
    from fastembed import TextEmbedding
    FASTEMBED_AVAILABLE = True
except ImportError:
    FASTEMBED_AVAILABLE = False
    logger.warning("fastembed not installed — RAG memory disabled")

from config import QDRANT_URL, QDRANT_API_KEY, QDRANT_LOCAL_PATH, QDRANT_COLLECTION

VECTOR_SIZE = 384  # BAAI/bge-small-en-v1.5 output size


class ResearchMemory:
    """Persists research results in Qdrant and retrieves similar past research."""

    def __init__(self):
        self._client: Optional["QdrantClient"] = None
        self._embedder: Optional["TextEmbedding"] = None
        self._ready = False

        if not (QDRANT_AVAILABLE and FASTEMBED_AVAILABLE):
            logger.warning("RAG memory unavailable — missing qdrant-client or fastembed")
            return

        try:
            if QDRANT_URL:
                self._client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None)
                logger.info(f"Connected to Qdrant at {QDRANT_URL}")
            else:
                self._client = QdrantClient(path=QDRANT_LOCAL_PATH)
                logger.info(f"Using local Qdrant at {QDRANT_LOCAL_PATH}")

            self._embedder = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
            self._ensure_collection()
            self._ready = True
            logger.info("ResearchMemory ready")
        except Exception as e:
            logger.error(f"ResearchMemory init failed: {e}")

    def _ensure_collection(self):
        existing = [c.name for c in self._client.get_collections().collections]
        if QDRANT_COLLECTION not in existing:
            self._client.create_collection(
                collection_name=QDRANT_COLLECTION,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )
            logger.info(f"Created Qdrant collection '{QDRANT_COLLECTION}'")

    def _embed(self, text: str) -> List[float]:
        embeddings = list(self._embedder.embed([text]))
        return embeddings[0].tolist()

    def _topic_id(self, topic: str) -> str:
        return hashlib.sha256(topic.lower().strip().encode()).hexdigest()[:16]

    def store(self, topic: str, synthesized_data: Dict, final_report: str):
        """Persist research results for a topic."""
        if not self._ready:
            return
        try:
            text = f"{topic}\n{final_report[:2000]}"
            vector = self._embed(text)
            point_id = abs(hash(self._topic_id(topic))) % (2 ** 63)

            payload = {
                "topic": topic,
                "key_findings": synthesized_data.get("key_findings", [])[:5],
                "data_quality_score": synthesized_data.get("data_quality_score", 0.0),
                "stored_at": datetime.utcnow().isoformat(),
                "report_excerpt": final_report[:500],
            }

            self._client.upsert(
                collection_name=QDRANT_COLLECTION,
                points=[PointStruct(id=point_id, vector=vector, payload=payload)],
            )
            logger.info(f"Stored research for topic: '{topic}'")
        except Exception as e:
            logger.error(f"Failed to store research: {e}")

    def search(self, topic: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Return the most similar past research entries."""
        if not self._ready:
            return []
        try:
            vector = self._embed(topic)
            
            # Use query_points if available (Qdrant 1.10+), else fallback to search
            if hasattr(self._client, "query_points"):
                response = self._client.query_points(
                    collection_name=QDRANT_COLLECTION,
                    query=vector,
                    limit=limit,
                    score_threshold=0.3, # Lowered threshold
                )
                results = response.points
            else:
                results = self._client.search(
                    collection_name=QDRANT_COLLECTION,
                    query_vector=vector,
                    limit=limit,
                    score_threshold=0.3,
                )
            
            return self._format_results(results)
        except Exception as e:
            logger.error(f"RAG search failed: {e}")
            return []

    def list_recent(self, limit: int = 10) -> List[Dict[str, Any]]:
        """List the most recently stored research entries."""
        if not self._ready:
            return []
        try:
            # Scroll through points, effectively listing them
            response, _ = self._client.scroll(
                collection_name=QDRANT_COLLECTION,
                limit=limit,
                with_payload=True,
                with_vectors=False,
            )
            # Sort by date if possible (scroll doesn't guarantee order)
            sorted_points = sorted(
                response, 
                key=lambda x: x.payload.get("stored_at", ""), 
                reverse=True
            )
            return self._format_results(sorted_points)
        except Exception as e:
            logger.error(f"RAG list_recent failed: {e}")
            return []

    def _format_results(self, results) -> List[Dict[str, Any]]:
        hits = []
        for r in results:
            hits.append({
                "topic": r.payload.get("topic"),
                "key_findings": r.payload.get("key_findings", []),
                "data_quality_score": r.payload.get("data_quality_score"),
                "stored_at": r.payload.get("stored_at"),
                "report_excerpt": r.payload.get("report_excerpt"),
                "similarity_score": round(r.score, 3) if hasattr(r, "score") else None,
            })
        return hits

    def get_context_for_topic(self, topic: str) -> Optional[Dict]:
        """Return formatted RAG context suitable for injecting into an agent prompt."""
        hits = self.search(topic)
        if not hits:
            return None
        return {
            "similar_research_found": len(hits),
            "entries": hits,
            "summary": f"Found {len(hits)} related past research entries with similarity ≥ 0.3",
        }


# Global singleton
research_memory = ResearchMemory()
