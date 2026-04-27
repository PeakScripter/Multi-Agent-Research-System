"""Configuration settings for the multi-agent research system."""

import os
import json
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

# ── LLM: Groq ─────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is required")

# ── Speech: Sarvam ────────────────────────────────────────────────────────────
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"
SARVAM_STT_MODEL = "saaras:v3"

# ── Vector DB: Qdrant ─────────────────────────────────────────────────────────
QDRANT_URL = os.getenv("QDRANT_URL", "")          # empty = local mode
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
QDRANT_LOCAL_PATH = os.getenv("QDRANT_LOCAL_PATH", "./qdrant_data")
QDRANT_COLLECTION = "research_memory"

# ── Multi-model Groq config ────────────────────────────────────────────────────
MODELS_CONFIG_FILE = os.getenv("MODELS_CONFIG_FILE", "models_config.json")


def load_models_config():
    defaults = [
        {"name": "openai/gpt-oss-120b", "api_key": "GROQ_API_KEY", "temperature": 0.7, "max_tokens": 8192, "priority": 1},
        {"name": "llama-3.3-70b-versatile", "api_key": "GROQ_API_KEY", "temperature": 0.7, "max_tokens": 8192, "priority": 2},
        {"name": "meta-llama/llama-4-scout-17b-16e-instruct", "api_key": "GROQ_API_KEY", "temperature": 0.7, "max_tokens": 8192, "priority": 3},
    ]
    try:
        if os.path.exists(MODELS_CONFIG_FILE):
            with open(MODELS_CONFIG_FILE, "r") as f:
                models = json.load(f)
        else:
            models = defaults
        for m in models:
            if m.get("api_key") == "GROQ_API_KEY":
                m["api_key"] = GROQ_API_KEY
        return models
    except Exception as e:
        logger.warning(f"Error loading models config: {e}. Using defaults.")
        for m in defaults:
            m["api_key"] = GROQ_API_KEY
        return defaults


GROQ_MODELS = sorted(load_models_config(), key=lambda x: x["priority"])

# ── Retry / back-off ──────────────────────────────────────────────────────────
MAX_MODEL_RETRIES = 3
RATE_LIMIT_RETRY_DELAY = 60
MODEL_SWITCH_DELAY = 3

# ── Domain config ─────────────────────────────────────────────────────────────
CS_IT_DOMAIN_ONLY = True
CS_IT_KEYWORDS = [
    "artificial intelligence", "machine learning", "deep learning", "neural network",
    "computer vision", "natural language processing", "nlp", "data science",
    "software engineering", "programming", "algorithm", "data structure",
    "database", "cybersecurity", "cryptography", "blockchain", "distributed system",
    "cloud computing", "web development", "mobile development", "devops",
    "computer science", "information technology", "computing", "technology",
    "software", "hardware", "networking", "operating system", "computer graphics",
    "human computer interaction", "hci", "robotics", "automation", "ai",
    "ml", "dl", "cv", "api", "framework", "library", "tool", "platform",
    "architecture", "design pattern", "optimization", "performance",
    "scalability", "reliability", "security", "privacy", "data mining",
    "big data", "analytics", "visualization", "user interface", "ux", "ui",
    "llm", "transformer", "diffusion", "generative", "embedding", "vector",
]

# ── Data source limits ────────────────────────────────────────────────────────
ARXIV_MAX_RESULTS = 20
GITHUB_MAX_REPOS = 10
STACKOVERFLOW_MAX_QUESTIONS = 10
REDDIT_MAX_POSTS = 10
NEWS_MAX_ARTICLES = 10
SEMANTIC_SCHOLAR_MAX = 10
YOUTUBE_MAX_VIDEOS = 5
PATENTS_MAX = 5

# ── Agent / workflow limits ───────────────────────────────────────────────────
MAX_ITERATIONS = 5
MAX_RESEARCH_ATTEMPTS = 2
MAX_WRITING_ATTEMPTS = 2
DEFAULT_SEARCH_DEPTH = 3
DEFAULT_TIMEOUT = 30

# ── Output dirs ───────────────────────────────────────────────────────────────
OUTPUT_DIR = "outputs"
REPORTS_DIR = f"{OUTPUT_DIR}/reports"
LOGS_DIR = f"{OUTPUT_DIR}/logs"

try:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)
    os.makedirs(LOGS_DIR, exist_ok=True)
except Exception:
    pass
