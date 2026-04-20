from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import v1_router
from app.core.config import settings
from app.core.security import fetch_jwks


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: pre-warm the JWKS cache so the first request doesn't pay the cost
    await fetch_jwks()
    yield
    # Shutdown: dispose the engine pool
    from app.db.session import engine
    await engine.dispose()


app = FastAPI(
    title="NetMap API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
