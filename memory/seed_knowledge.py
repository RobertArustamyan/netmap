"""
Bootstrap the Graphiti knowledge graph with initial project facts.

Run once (or re-run idempotently) to load foundational context:
    python -m memory.seed_knowledge
"""

import asyncio
from datetime import datetime, timezone
from graphiti_core.nodes import EpisodeType
from memory.graphiti_client import get_ready_client

# ── Seed episodes ──────────────────────────────────────────────────────────────
# Each entry becomes one episode in the graph.
# Format: (group_id, episode_name, content)
SEED_EPISODES: list[tuple[str, str, str]] = [
    (
        "project",
        "project_overview",
        "This is a web service project. "
        "The goal is to build a full-stack web application with a Python backend and a React frontend. "
        "The team uses a multi-agent architecture where specialised agents handle architecture, "
        "frontend, backend, UI/UX, testing, bug-fixing, devops, and documentation tasks.",
    ),
    (
        "project",
        "tech_stack",
        "Backend: Python (FastAPI preferred). "
        "Database: Neo4j for the knowledge graph (via Graphiti); relational DB TBD. "
        "Frontend: React with TypeScript. "
        "LLM: OpenAI gpt-4o-mini via Graphiti. "
        "Infrastructure: Docker + docker-compose; CI/CD via GitHub Actions.",
    ),
    (
        "project",
        "memory_layer",
        "Project memory is managed by Graphiti (graphiti-core 0.28.x) backed by Neo4j. "
        "The shared client lives in memory/graphiti_client.py. "
        "Agents write and read episodic facts through this client to maintain shared context "
        "across sessions.",
    ),
    (
        "project",
        "agent_roster",
        "Active agents: architect, frontend, backend, ui_ux, tester, bug_fixer, devops, "
        "documentation, planner, code_reviewer, security. "
        "Routing rules are defined in CLAUDE.md.",
    ),
    (
        "project",
        "environment",
        "Credentials are stored in .env: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, OPENAI_API_KEY. "
        "Never commit .env to version control.",
    ),
]


async def seed() -> None:
    print("Connecting to Graphiti / Neo4j …")
    client = await get_ready_client()

    now = datetime.now(timezone.utc)

    for group_id, name, content in SEED_EPISODES:
        print(f"  Seeding episode: {name}")
        await client.add_episode(
            name=name,
            episode_body=content,
            source=EpisodeType.text,
            source_description="project seed knowledge",
            reference_time=now,
            group_id=group_id,
        )

    await client.close()
    print("Done. Knowledge graph seeded successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
