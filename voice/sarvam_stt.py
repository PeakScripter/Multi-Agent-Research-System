"""Sarvam AI speech-to-text using Saaras v3."""

import logging
import requests
from typing import Optional
from config import SARVAM_API_KEY, SARVAM_STT_URL, SARVAM_STT_MODEL

logger = logging.getLogger(__name__)


class SarvamSTT:
    """Transcribes audio using Sarvam AI's Saaras v3 model."""

    SUPPORTED_MODES = ("transcribe", "translate", "verbatim", "translit", "codemix")

    def __init__(self):
        if not SARVAM_API_KEY:
            logger.warning("SARVAM_API_KEY not set — STT will fail at runtime")
        self._headers = {"api-subscription-key": SARVAM_API_KEY}

    def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav",
        language: Optional[str] = None,
        mode: str = "transcribe",
    ) -> str:
        """
        Transcribe audio bytes using Sarvam Saaras v3.

        Args:
            audio_bytes: Raw audio file content.
            filename: Filename hint for MIME detection (e.g. 'recording.mp3').
            language: BCP-47 language code (e.g. 'hi-IN'). Leave None for auto-detect.
            mode: One of transcribe | translate | verbatim | translit | codemix.

        Returns:
            Transcribed text string.
        """
        if mode not in self.SUPPORTED_MODES:
            raise ValueError(f"mode must be one of {self.SUPPORTED_MODES}")

        files = {"file": (filename, audio_bytes, self._guess_mime(filename))}
        data: dict = {"model": SARVAM_STT_MODEL, "mode": mode}
        if language:
            data["language_code"] = language

        try:
            resp = requests.post(
                SARVAM_STT_URL,
                headers=self._headers,
                files=files,
                data=data,
                timeout=60,
            )
            resp.raise_for_status()
            result = resp.json()
            transcript = result.get("transcript", "")
            logger.info(f"Sarvam STT: transcribed {len(audio_bytes)} bytes → {len(transcript)} chars")
            return transcript
        except requests.HTTPError as e:
            logger.error(f"Sarvam STT HTTP error: {e.response.status_code} — {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Sarvam STT error: {e}")
            raise

    @staticmethod
    def _guess_mime(filename: str) -> str:
        ext = filename.rsplit(".", 1)[-1].lower()
        return {
            "wav": "audio/wav",
            "mp3": "audio/mpeg",
            "ogg": "audio/ogg",
            "opus": "audio/opus",
            "flac": "audio/flac",
            "m4a": "audio/mp4",
            "webm": "audio/webm",
        }.get(ext, "audio/wav")
