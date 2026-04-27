"""YouTube transcript fetcher — surfaces tech talk content from conferences/tutorials."""

import logging
import re
import requests
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEO_URL = "https://www.googleapis.com/youtube/v3/videos"


class YouTubeTranscriptFetcher:
    """
    Fetches YouTube video metadata and transcripts for a topic.

    Transcript extraction uses the youtube-transcript-api package when available.
    If the API key is not provided, metadata-only mode is used (no transcripts).
    """

    def __init__(self, api_key: Optional[str] = None, max_videos: int = 5):
        self.api_key = api_key
        self.max_videos = max_videos
        self._session = requests.Session()

    def _search_videos(self, query: str) -> List[Dict]:
        if not self.api_key:
            logger.info("No YouTube API key — skipping video search")
            return []
        try:
            resp = self._session.get(
                YOUTUBE_SEARCH_URL,
                params={
                    "key": self.api_key,
                    "q": query + " conference tutorial",
                    "part": "snippet",
                    "type": "video",
                    "maxResults": self.max_videos,
                    "relevanceLanguage": "en",
                    "videoDuration": "medium",
                },
                timeout=10,
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])
            return [
                {
                    "video_id": i["id"]["videoId"],
                    "title": i["snippet"]["title"],
                    "channel": i["snippet"]["channelTitle"],
                    "published_at": i["snippet"]["publishedAt"],
                    "description": i["snippet"]["description"][:200],
                }
                for i in items
            ]
        except Exception as e:
            logger.error(f"YouTube search failed: {e}")
            return []

    def _get_transcript(self, video_id: str) -> str:
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            entries = YouTubeTranscriptApi.get_transcript(video_id)
            text = " ".join(e["text"] for e in entries)
            return text[:3000]
        except Exception:
            return ""

    def fetch_for_topic(self, topic: str) -> Dict[str, Any]:
        videos = self._search_videos(topic)
        enriched = []
        for v in videos:
            transcript = self._get_transcript(v["video_id"])
            enriched.append({**v, "transcript_excerpt": transcript[:500] if transcript else ""})

        logger.info(f"YouTube: {len(enriched)} videos for '{topic}'")
        return {
            "source": "youtube",
            "videos": enriched,
            "count": len(enriched),
        }
