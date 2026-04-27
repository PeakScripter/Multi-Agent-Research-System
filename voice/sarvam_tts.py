"""Sarvam AI text-to-speech for audio summaries."""

import logging
import base64
import requests
from typing import Optional
from config import SARVAM_API_KEY, SARVAM_TTS_URL

logger = logging.getLogger(__name__)

DEFAULT_SPEAKER = "meera"
DEFAULT_LANGUAGE = "en-IN"


class SarvamTTS:
    """Synthesizes speech from text using Sarvam AI."""

    def __init__(self):
        if not SARVAM_API_KEY:
            logger.warning("SARVAM_API_KEY not set — TTS will fail at runtime")
        self._headers = {
            "api-subscription-key": SARVAM_API_KEY,
            "Content-Type": "application/json",
        }

    def synthesize(
        self,
        text: str,
        language: str = DEFAULT_LANGUAGE,
        speaker: str = DEFAULT_SPEAKER,
        speed: float = 1.0,
    ) -> bytes:
        """
        Convert text to speech.

        Args:
            text: Text to synthesize (max ~500 chars per request recommended).
            language: BCP-47 target language code.
            speaker: Speaker voice name.
            speed: Playback speed multiplier.

        Returns:
            Raw WAV audio bytes.
        """
        # Sarvam TTS accepts inputs as a list of strings
        payload = {
            "inputs": [text[:1000]],
            "target_language_code": language,
            "speaker": speaker,
            "pace": speed,
            "model": "bulbul:v1",
        }
        try:
            resp = requests.post(
                SARVAM_TTS_URL,
                headers=self._headers,
                json=payload,
                timeout=30,
            )
            resp.raise_for_status()
            result = resp.json()
            # Sarvam returns base64-encoded audio in `audios` list
            audio_b64 = result.get("audios", [""])[0]
            audio_bytes = base64.b64decode(audio_b64)
            logger.info(f"Sarvam TTS: synthesized {len(text)} chars → {len(audio_bytes)} bytes")
            return audio_bytes
        except requests.HTTPError as e:
            logger.error(f"Sarvam TTS HTTP error: {e.response.status_code} — {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Sarvam TTS error: {e}")
            raise
