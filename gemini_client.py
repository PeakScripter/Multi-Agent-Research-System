"""Redirect shim — all LLM calls now go through groq_client."""
from groq_client import groq_client

# Drop-in alias so any old `from gemini_client import gemini_client` keeps working
gemini_client = groq_client
