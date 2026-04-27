"""Groq LLM client with multi-model fallback (drop-in replacement for gemini_client)."""

import logging
import time
from typing import Dict, Any, Optional, List
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from config import GROQ_MODELS, MAX_MODEL_RETRIES, RATE_LIMIT_RETRY_DELAY, MODEL_SWITCH_DELAY

logger = logging.getLogger(__name__)


class ModelStatus:
    def __init__(self, model_config: Dict[str, Any]):
        self.name = model_config["name"]
        self.api_key = model_config["api_key"]
        self.temperature = model_config.get("temperature", 0.7)
        self.max_tokens = model_config.get("max_tokens", 8192)
        self.priority = model_config.get("priority", 1)
        self.is_available = True
        self.rate_limited_until = None
        self.error_count = 0
        self.last_used = None
        self._llm = None

    def is_rate_limited(self) -> bool:
        if self.rate_limited_until is None:
            return False
        return time.time() < self.rate_limited_until

    def set_rate_limited(self, duration: int = RATE_LIMIT_RETRY_DELAY):
        self.rate_limited_until = time.time() + duration
        logger.warning(f"Model {self.name} rate-limited for {duration}s")

    def increment_error(self):
        self.error_count += 1
        if self.error_count >= MAX_MODEL_RETRIES:
            self.is_available = False
            logger.error(f"Model {self.name} disabled after {self.error_count} errors")

    def reset_error_count(self):
        self.error_count = 0
        self.is_available = True

    def get_llm(self) -> ChatGroq:
        if self._llm is None:
            self._llm = ChatGroq(
                model=self.name,
                groq_api_key=self.api_key,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )
        return self._llm


class GroqClient:
    """Multi-model Groq client with automatic fallback. Same interface as MultiModelGeminiClient."""

    def __init__(self):
        self.models: Dict[str, ModelStatus] = {}
        for cfg in GROQ_MODELS:
            ms = ModelStatus(cfg)
            self.models[cfg["name"]] = ms
            logger.info(f"Registered Groq model: {cfg['name']} (priority {cfg['priority']})")
        logger.info(f"GroqClient ready with {len(self.models)} models")

    def _get_available_model(self) -> Optional[ModelStatus]:
        candidates = [m for m in self.models.values() if m.is_available and not m.is_rate_limited()]
        if not candidates:
            return None
        candidates.sort(key=lambda m: m.priority)
        return candidates[0]

    def _handle_error(self, model: ModelStatus, error: Exception) -> bool:
        """Returns True if error was a rate-limit (model switched)."""
        msg = str(error).lower()
        if any(k in msg for k in ["rate limit", "quota", "429", "too many requests", "resource exhausted"]):
            model.set_rate_limited()
            return True
        model.increment_error()
        if all(not m.is_available for m in self.models.values()):
            logger.warning("All models exhausted — resetting error counts")
            for m in self.models.values():
                m.reset_error_count()
        return False

    def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: Optional[float] = None,
    ) -> str:
        messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
        last_error = None

        for _ in range(len(self.models) + 1):
            model = self._get_available_model()
            if not model:
                break
            try:
                logger.info(f"Using Groq model: {model.name}")
                llm = model.get_llm()
                if temperature is not None:
                    llm.temperature = temperature
                response = llm.invoke(messages)
                model.last_used = time.time()
                model.reset_error_count()
                logger.info(f"Response from {model.name} ({len(response.content)} chars)")
                return response.content
            except Exception as e:
                last_error = e
                rate_limited = self._handle_error(model, e)
                logger.warning(f"Error with {model.name}: {e} — {'rate-limited' if rate_limited else 'error'}")
                time.sleep(MODEL_SWITCH_DELAY)

        raise Exception(f"All Groq models failed. Last error: {last_error}")

    def generate_structured_response(
        self,
        system_prompt: str,
        user_prompt: str,
        expected_format: str,
        temperature: Optional[float] = None,
    ) -> str:
        augmented_system = (
            f"{system_prompt}\n\nExpected Output Format:\n{expected_format}\n"
            "Please ensure your response follows this format exactly."
        )
        return self.generate_response(augmented_system, user_prompt, temperature)

    def batch_generate(
        self,
        prompts: List[tuple],
        temperature: Optional[float] = None,
    ) -> List[str]:
        return [self.generate_response(sp, up, temperature) for sp, up in prompts]

    def get_model_status(self) -> Dict[str, Dict[str, Any]]:
        return {
            name: {
                "available": m.is_available,
                "rate_limited": m.is_rate_limited(),
                "error_count": m.error_count,
                "last_used": m.last_used,
                "priority": m.priority,
            }
            for name, m in self.models.items()
        }

    def reset_all_models(self):
        for m in self.models.values():
            m.reset_error_count()
            m.rate_limited_until = None
        logger.info("All Groq models reset")


# Global singleton — agents import this
groq_client = GroqClient()

# Alias so any code that still imports `gemini_client` works seamlessly
gemini_client = groq_client
