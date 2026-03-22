from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import asyncio

from app.services.database import get_db
from app.services.utils import sanitize_string_list
from app.models.database import (
    Actor,
    DebateSession,
    DebateSessionActor,
    Round as DBRound,
    Message,
    SessionStatus,
    QuestionIntent,
    SemanticComparison,
)
from app.models.schemas import (
    DebateStartRequest,
    DebateStartResponse,
    DebateSessionResponse,
    RoundResponse,
    MessageResponse,
    ActorResponse,
    ConsensusResult,
    SemanticAnalysisResult,
    QuestionIntentResponse,
    SemanticComparisonResponse,
    ComparisonAxis,
    ActorPosition,
)
from app.services.debate_engine import DebateEngine
from app.services.task_manager import task_manager

router = APIRouter(prefix="/api/debate", tags=["debate"])


@router.post("/start", response_model=DebateStartResponse)
async def start_debate(
    data: DebateStartRequest,
    db: AsyncSession = Depends(get_db),
):
    """Start a new debate session and begin execution in background"""
    # Validate actors exist (batch query for efficiency)
    result = await db.execute(
        select(Actor).where(Actor.id.in_(data.actor_ids))
    )
    actors = list(result.scalars().all())
    if len(actors) != len(data.actor_ids):
        found_ids = {a.id for a in actors}
        missing = [aid for aid in data.actor_ids if aid not in found_ids]
        raise HTTPException(status_code=404, detail=f"Actors not found: {missing}")

    # Validate judge exists
    result = await db.execute(select(Actor).where(Actor.id == data.judge_actor_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Judge actor not found")

    # Create session and link actors in a single transaction
    session = DebateSession(
        question=data.question,
        judge_actor_id=data.judge_actor_id,
        max_rounds=data.config.max_rounds,
        convergence_threshold=data.config.convergence_threshold,
        auto_stop=data.config.auto_stop,
    )
    db.add(session)
    await db.flush()  # Get session.id without committing

    # Link actors to session
    for actor_id in data.actor_ids:
        session_actor = DebateSessionActor(
            session_id=session.id,
            actor_id=actor_id,
        )
        db.add(session_actor)

    await db.commit()
    await db.refresh(session)

    # Start the debate task in background
    async def run_debate_task(queue: asyncio.Queue):
        # Get a fresh db session for the background task
        from app.services.database import async_session_factory
        async with async_session_factory() as bg_db:
            result = await bg_db.execute(
                select(DebateSession).where(DebateSession.id == session.id)
            )
            bg_session = result.scalar_one_or_none()
            if bg_session:
                engine = DebateEngine(
                    db=bg_db,
                    session=bg_session,
                    event_queue=queue,
                    is_cancelled=lambda sid=session.id: task_manager.get_cancelled_flag(sid),
                )
                await engine.run_debate()

    # Register task and get event queue
    success, _ = await task_manager.start_task(session.id, run_debate_task)

    if not success:
        raise HTTPException(status_code=409, detail="Session is already running")

    return DebateStartResponse(session_id=session.id)


@router.get("/{session_id}/stream")
async def stream_debate(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Stream debate progress via SSE - subscribe only, does not execute"""

    async def event_generator():
        print(f"[DEBUG] stream_debate START, session_id={session_id}")

        # Check session exists
        result = await db.execute(
            select(DebateSession).where(DebateSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            print(f"[DEBUG] Session not found: {session_id}")
            yield f"event: debate_error\ndata: {json.dumps({'message': 'Session not found'})}\n\n"
            return

        # Check if session is already completed
        if session.status == SessionStatus.COMPLETED:
            yield f"event: debate_error\ndata: {json.dumps({'message': 'Session already completed'})}\n\n"
            return

        # Get the event queue from task manager
        event_queue = task_manager.get_event_queue(session_id)

        if not event_queue:
            # Task not running - check status
            if session.status == SessionStatus.STOPPED:
                yield f"event: debate_error\ndata: {json.dumps({'message': 'Session was stopped'})}\n\n"
            else:
                yield f"event: debate_error\ndata: {json.dumps({'message': 'Session is not running. Use POST /start to begin.'})}\n\n"
            return

        # Subscribe to events
        try:
            while True:
                try:
                    # Wait for event with timeout to allow checking if task is done
                    event = await asyncio.wait_for(event_queue.get(), timeout=1.0)
                    event_type = event["event"]
                    event_data = json.dumps(event["data"])
                    print(f"[DEBUG] SSE event: {event_type}")
                    yield f"event: {event_type}\ndata: {event_data}\n\n"

                    # Stop on terminal events
                    if event_type in ("complete", "cancelled", "debate_error"):
                        break
                except asyncio.TimeoutError:
                    # Check if task is still running
                    if not task_manager.is_running(session_id):
                        break
                    continue
        except Exception as e:
            print(f"[ERROR] stream_debate error: {e}")
            yield f"event: debate_error\ndata: {json.dumps({'message': str(e)})}\n\n"

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

    # Cancel the running task
    await task_manager.cancel_task(session_id)

    # Update database status
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
    # Build actor lookup including judge
    actor_names = {a.id: a.name for a in actors}
    if judge:
        actor_names[judge.id] = judge.name

    for db_round in db_rounds:
        result = await db.execute(
            select(Message).where(Message.round_id == db_round.id)
        )
        messages = list(result.scalars().all())

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
    if session.consensus_summary or session.consensus_recommendation:
        consensus = ConsensusResult(
            summary=session.consensus_summary or "",
            agreements=sanitize_string_list(session.consensus_agreements),
            disagreements=sanitize_string_list(session.consensus_disagreements),
            confidence=session.consensus_confidence,  # Can be None
            recommendation=session.consensus_recommendation or "",
            key_uncertainties=sanitize_string_list(session.consensus_key_uncertainties),
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


@router.get("/{session_id}/semantic", response_model=SemanticAnalysisResult)
async def get_semantic_analysis(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get semantic analysis results for a debate session"""
    # Check session exists
    result = await db.execute(
        select(DebateSession).where(DebateSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get question intent
    result = await db.execute(
        select(QuestionIntent).where(QuestionIntent.session_id == session_id)
    )
    question_intent = result.scalar_one_or_none()

    intent_response = None
    if question_intent:
        intent_response = QuestionIntentResponse(
            id=question_intent.id,
            session_id=question_intent.session_id,
            question_type=question_intent.question_type,
            user_goal=question_intent.user_goal,
            time_horizons=question_intent.time_horizons or [],
            comparison_axes=[
                ComparisonAxis(axis_id=a.get("axis_id", ""), label=a.get("label", ""))
                for a in (question_intent.comparison_axes or [])
            ],
            created_at=question_intent.created_at,
        )

    # Get semantic comparisons (latest round)
    result = await db.execute(
        select(SemanticComparison)
        .where(SemanticComparison.session_id == session_id)
        .order_by(SemanticComparison.round_number.desc())
    )
    db_comparisons = list(result.scalars().all())

    comparison_responses = []
    for c in db_comparisons:
        actor_positions = [
            ActorPosition(
                actor_id=p.get("actor_id", ""),
                actor_name=p.get("actor_name"),
                stance_label=p.get("stance_label"),
                summary=p.get("summary"),
                quotes=p.get("quotes", []),
            )
            for p in (c.actor_positions or [])
        ]

        comparison_responses.append(SemanticComparisonResponse(
            id=c.id,
            session_id=c.session_id,
            round_number=c.round_number,
            phase=c.phase,
            topic_id=c.topic_id,
            label=c.label,
            salience=c.salience,
            disagreement_score=c.disagreement_score,
            status=c.status,
            difference_types=c.difference_types or [],
            agreement_summary=c.agreement_summary,
            disagreement_summary=c.disagreement_summary,
            actor_positions=actor_positions,
            created_at=c.created_at,
        ))

    return SemanticAnalysisResult(
        question_intent=intent_response,
        comparisons=comparison_responses,
    )