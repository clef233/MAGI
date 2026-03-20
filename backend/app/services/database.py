from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    from app.models.database import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)