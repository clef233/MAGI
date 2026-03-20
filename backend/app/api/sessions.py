from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.services.database import get_db
from app.models.database import DebateSession
from app.models.schemas import DebateSessionList

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=List[DebateSessionList])
async def list_sessions(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Get list of debate sessions"""
    result = await db.execute(
        select(DebateSession)
        .order_by(DebateSession.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions = list(result.scalars().all())

    return [
        DebateSessionList(
            id=s.id,
            question=s.question,
            status=s.status,
            consensus_confidence=s.consensus_confidence,
            created_at=s.created_at,
        )
        for s in sessions
    ]


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a debate session"""
    result = await db.execute(
        select(DebateSession).where(DebateSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")

    await db.delete(session)
    await db.commit()

    return {"message": "Session deleted"}