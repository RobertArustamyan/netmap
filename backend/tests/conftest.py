"""
Top-level conftest: set dummy environment variables BEFORE any app code is
imported so that pydantic-settings (config.py) can parse them without errors.
The lifespan startup's fetch_jwks() is patched to a no-op so tests never hit
the network.
"""
import os
import uuid
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# ---------------------------------------------------------------------------
# 1.  Inject dummy env vars so Settings() doesn't blow up on missing values.
# ---------------------------------------------------------------------------
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://x:x@localhost/x")

# ---------------------------------------------------------------------------
# 2.  Now import app code (safe because env vars are already in os.environ).
# ---------------------------------------------------------------------------
from app.core.dependencies import get_current_user  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402
from app.models.user import User  # noqa: E402

DATABASE_URL = "sqlite+aiosqlite:///:memory:"


# ---------------------------------------------------------------------------
# 3.  UUID compatibility shim for SQLite
#
# The production models use sqlalchemy.dialects.postgresql.UUID(as_uuid=True).
# SQLite has no native UUID type; we register a TypeDecorator so SQLAlchemy
# stores UUIDs as 36-char strings and converts them back on reads.
# ---------------------------------------------------------------------------

from sqlalchemy import TypeDecorator, String as _SAString  # noqa: E402
from sqlalchemy.dialects.postgresql import UUID as _PgUUID  # noqa: E402


class _UUIDAsString(TypeDecorator):
    """Store uuid.UUID as a VARCHAR(36) string so SQLite can handle it."""

    impl = _SAString(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return uuid.UUID(value)


def _patch_uuid_for_sqlite(target_metadata):
    """
    Walk every column in every mapped table and replace
    postgresql.UUID(as_uuid=True) with _UUIDAsString so that
    create_all() and all DML work on SQLite.
    """
    for table in target_metadata.sorted_tables:
        for col in table.columns:
            if isinstance(col.type, _PgUUID):
                col.type = _UUIDAsString()


# ---------------------------------------------------------------------------
# 4.  Helpers
# ---------------------------------------------------------------------------

def make_fake_user(
    user_id: str | None = None,
    email: str = "test@example.com",
    is_superadmin: bool = False,
) -> User:
    return User(
        id=uuid.UUID(user_id) if user_id else uuid.uuid4(),
        email=email,
        is_superadmin=is_superadmin,
    )


def _register_sqlite_functions(dbapi_conn, connection_record):
    """Register SQLite UDFs that mimic PostgreSQL functions used in server_defaults."""
    import datetime

    def now():
        return datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d %H:%M:%S.%f")

    dbapi_conn.create_function("NOW", 0, now)


# ---------------------------------------------------------------------------
# 5.  Per-test isolated SQLite database
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="function")
async def db_session():
    from sqlalchemy import event

    # Patch UUID columns once; idempotent because _UUIDAsString is not _PgUUID
    _patch_uuid_for_sqlite(Base.metadata)

    engine = create_async_engine(DATABASE_URL, echo=False)

    # Register NOW() so server_default=text("NOW()") works on SQLite
    event.listen(engine.sync_engine, "connect", _register_sqlite_functions)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    async with SessionLocal() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# ---------------------------------------------------------------------------
# 5.  HTTP client that overrides DB and auth, and patches lifespan fetch_jwks
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession):
    fake_user = make_fake_user()

    async def override_get_db():
        yield db_session

    async def override_get_current_user():
        return fake_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    # Patch fetch_jwks so lifespan startup never makes a real HTTP call
    with patch("app.main.fetch_jwks", new_callable=AsyncMock) as _mock:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as c:
            yield c, fake_user, db_session

    app.dependency_overrides.clear()
