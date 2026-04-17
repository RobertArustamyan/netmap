"""
Shared Graphiti client for the project memory layer.
Loads all credentials from .env and exposes a ready-to-use Graphiti instance.
"""

import os
from dotenv import load_dotenv
from graphiti_core import Graphiti
from graphiti_core.llm_client.openai_client import OpenAIClient
from graphiti_core.llm_client.config import LLMConfig
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig

load_dotenv()

# ── Credentials ────────────────────────────────────────────────────────────────
NEO4J_URI      = os.environ["NEO4J_URI"]
NEO4J_USER     = os.environ["NEO4J_USER"]
NEO4J_PASSWORD = os.environ["NEO4J_PASSWORD"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

# ── LLM & Embedder config ──────────────────────────────────────────────────────
_llm_client = OpenAIClient(
    config=LLMConfig(
        api_key=OPENAI_API_KEY,
        model="gpt-4o-mini",
    )
)

_embedder = OpenAIEmbedder(
    config=OpenAIEmbedderConfig(
        api_key=OPENAI_API_KEY,
        embedding_model="text-embedding-3-small",
    )
)


def get_client() -> Graphiti:
    """Return an initialised Graphiti client (call build_indices_and_constraints separately)."""
    return Graphiti(
        uri=NEO4J_URI,
        user=NEO4J_USER,
        password=NEO4J_PASSWORD,
        llm_client=_llm_client,
        embedder=_embedder,
    )


async def get_ready_client() -> Graphiti:
    """Return a Graphiti client with indices/constraints already built."""
    client = get_client()
    await client.build_indices_and_constraints()
    return client
