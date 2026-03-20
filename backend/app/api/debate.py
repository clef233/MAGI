from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import json
import asyncio

from app.services.database import get_db
from app.models.database import (
    Actor,
    DebateSession,
    DebateSessionActor,
    Round as DBRound,
    Message,
    SessionStatus,
)
from app.models.schemas import (
    DebateStartRequest,
    DebateStartResponse,
    DebateSessionResponse,
    DebateSessionList,
    RoundResponse,
    MessageResponse,
    ActorResponse,
    ConsensusResult,
)
from app.services.debate_engine import DebateEngine

router = APIRouter(prefix="/api/debate", tags=["debate"])


@router.post("/start", response_model=DebateStartResponse)
async def start_debate(
    data: DebateStartRequest,
    db: AsyncSession = Depends(get_db),
):
    """Start a new debate session"""
    # Validate actors exist
    for actor_id in data.actor_ids:
        result = await db.execute(select(Actor).where(Actor.id == actor_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"Actor {actor_id} not found")

    # Validate judge exists
    result = await db.execute(select(Actor).where(Actor.id == data.judge_actor_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Judge actor not found")

    # Create session
    session = DebateSession(
        question=data.question,
        judge_actor_id=data.judge_actor_id,
        max_rounds=data.config.max_rounds,
        convergence_threshold=data.config.convergence_threshold,
        auto_stop=data.config.auto_stop,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Link actors to session
    for actor_id in data.actor_ids:
        session_actor = DebateSessionActor(
            session_id=session.id,
            actor_id=actor_id,
        )
        db.add(session_actor)
    await db.commit()

    return DebateStartResponse(session_id=session.id)


@router.get("/{session_id}/stream")
async def stream_debate(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Stream debate progress via SSE"""

    async def event_generator():
        result = await db.execute(
            select(DebateSession).where(DebateSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            yield f"event: error\ndata: {json.dumps({'message': 'Session not found'})}\n\n"
            return

        engine = DebateEngine(db, session)

        async for event in engine.run_debate():
            event_type = event["event"]
            event_data = json.dumps(event["data"])
            yield f"event: {event_type}\ndata: {event_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{session_id}/stop")
async def stop_debate(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Stop a running debate"""
    result = await db.execute(
        select(DebateSession).where(DebateSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status in [SessionStatus.COMPLETED, SessionStatus.STOPPED]:
        raise HTTPException(status_code=400, detail="Session already finished")

    session.status = SessionStatus.STOPPED
    await db.commit()

    return {"message": "Debate stopped"}


@router.get("/{session_id}", response_model=DebateSessionResponse)
async def get_debate(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get full debate session details"""
    result = await db.execute(
        select(DebateSession).where(DebateSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get actors
    result = await db.execute(
        select(Actor)
        .join(DebateSessionActor)
        .where(DebateSessionActor.session_id == session.id)
    )
    actors = list(result.scalars().all())

    # Get judge
    judge = None
    if session.judge_actor_id:
        result = await db.execute(
            select(Actor).where(Actor.id == session.judge_actor_id)
        )
        judge = result.scalar_one_or_none()

    # Get rounds with messages
    result = await db.execute(
        select(DBRound)
        .where(DBRound.session_id == session.id)
        .order_by(DBRound.round_number)
    )
    db_rounds = list(result.scalars().all())

    rounds = []
    for db_round in db_rounds:
        result = await db.execute(
            select(Message).where(Message.round_id == db_round.id)
        )
        messages = list(result.scalars().all())

        actor_names = {a.id: a.name for a in actors}

        rounds.append(RoundResponse(
            round_number=db_round.round_number,
            phase=db_round.phase,
            messages=[
                MessageResponse(
                    id=msg.id,
                    actor_id=msg.actor_id,
                    actor_name=actor_names.get(msg.actor_id),
                    role=msg.role,
                    content=msg.content,
                    input_tokens=msg.input_tokens,
                    output_tokens=msg.output_tokens,
                    created_at=msg.created_at,
                )
                for msg in messages
            ],
        ))

    consensus = None
    if session.consensus_summary:
        consensus = ConsensusResult(
            summary=session.consensus_summary,
            agreements=session.consensus_agreements or [],
            disagreements=session.consensus_disagreements or [],
            confidence=session.consensus_confidence or 0.5,
            recommendation=session.consensus_recommendation or "",
        )

    return DebateSessionResponse(
        id=session.id,
        question=session.question,
        status=session.status,
        actors=[
            ActorResponse(
                id=a.id,
                name=a.name,
                display_color=a.display_color,
                icon=a.icon,
                is_meta_judge=a.is_meta_judge,
                provider=a.provider,
                model=a.model,
                created_at=a.created_at,
                updated_at=a.updated_at,
            )
            for a in actors
        ],
        judge_actor=ActorResponse(
            id=judge.id,
            name=judge.name,
            display_color=judge.display_color,
            icon=judge.icon,
            is_meta_judge=judge.is_meta_judge,
            provider=judge.provider,
            model=judge.model,
            created_at=judge.created_at,
            updated_at=judge.updated_at,
        ) if judge else None,
        max_rounds=session.max_rounds,
        rounds=rounds,
        consensus=consensus,
        total_tokens=session.total_tokens,
        total_cost=session.total_cost,
        created_at=session.created_at,
        completed_at=session.completed_at,
    )