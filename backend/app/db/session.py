from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(
    settings.database_url,
    # pool_pre_ping causes a SELECT 1 before every checkout. With Supabase's
    # transaction-mode pooler the pooler closes idle connections, so pre_ping
    # constantly finds stale connections and pays a full reconnect cost (~seconds).
    pool_pre_ping=False,
    pool_size=5,
    max_overflow=10,
    # Recycle connections after 4.5 min so the pooler's ~5 min idle timeout
    # never fires and kills connections we think are alive.
    pool_recycle=270,
    connect_args={"command_timeout": 10},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
