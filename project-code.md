# Project: MAGI

Generated: 2026-03-22 12:29:25
Root: D:\Projects\MAGI
Files: 63

---

## Directory Structure

```

.claude/
backend/
  app/
    api/
    core/
    models/
    services/
frontend/
  src/
    app/
    components/
    lib/
    stores/
    types/
  settings.local.json
.gitignore
    __init__.py
      __init__.py
      actors.py
      debate.py
      presets.py
      sessions.py
      settings.py
      __init__.py
      config.py
    main.py
      __init__.py
      database.py
      schemas.py
      __init__.py
      convergence_service.py
      database.py
      debate_engine.py
      llm_adapter.py
      prompt_serializer.py
      prompt_service.py
      semantic_service.py
      task_manager.py
  pyproject.toml
  next-env.d.ts
  next.config.js
  package.json
  postcss.config.js
      globals.css
      layout.tsx
      page.tsx
      ActorCard.tsx
      ActorManager.tsx
      Arena.tsx
      ConsensusView.tsx
      DebateView.tsx
      DiffSidebar.tsx
      index.ts
      MarkdownBlock.tsx
      MiniMagiMonitor.tsx
      ProgressBar.tsx
      QuestionBox.tsx
      ReviewChatView.tsx
      SemanticSidebar.tsx
      SessionDetailView.tsx
      SessionHistory.tsx
      SettingsView.tsx
      Splash.tsx
      apiClient.ts
      reviewDiff.ts
      sessionHydrator.ts
      utils.ts
      actorStore.ts
      debateStore.ts
      index.ts
      index.ts
  tailwind.config.ts
  tsconfig.json
merge_code.py
start.bat
START.HTML
stop.bat
```


---

## Files


### .claude\settings.local.json

```json
{
  "permissions": {
    "allow": [
      "Bash(pip install:*)",
      "Bash(npm install:*)",
      "Bash(timeout 10 python -c \"from app.main import app; print\\(''Backend imports OK''\\)\")",
      "Bash(python -c \"import sys; print\\(sys.executable\\)\")",
      "Bash(C:/Python313/python.exe -m pip install -e .)",
      "Bash(curl -s http://localhost:8000/api/health)"
    ]
  }
}

```


### .gitignore

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
venv/
ENV/
env/
.venv/

# Database
*.db
*.sqlite3

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Next.js
.next/
out/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Testing
coverage/
.nyc_output/

# Misc
*.bak
*.tmp
*.temp
```


### backend\app\__init__.py

```python
"""MAGI Multi-Agent Debate System Backend"""
__version__ = "0.1.0"
```


### backend\app\api\__init__.py

```python
from .actors import router as actors_router
from .debate import router as debate_router
from .sessions import router as sessions_router
from .presets import router as presets_router

__all__ = ["actors_router", "debate_router", "sessions_router", "presets_router"]
```


### backend\app\api\actors.py

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.services.database import get_db
from app.models.database import Actor as DBActor
from app.models.schemas import (
    ActorCreate,
    ActorUpdate,
    ActorResponse,
    ActorDetail,
)

router = APIRouter(prefix="/api/actors", tags=["actors"])


@router.get("", response_model=List[ActorResponse])
async def list_actors(db: AsyncSession = Depends(get_db)):
    """Get all active actors"""
    result = await db.execute(
        select(DBActor).where(DBActor.is_active == True).order_by(DBActor.created_at.desc())
    )
    actors = result.scalars().all()
    return [
        ActorResponse(
            id=actor.id,
            name=actor.name,
            display_color=actor.display_color,
            icon=actor.icon,
            is_meta_judge=actor.is_meta_judge,
            provider=actor.provider,
            model=actor.model,
            created_at=actor.created_at,
            updated_at=actor.updated_at,
        )
        for actor in actors
    ]


@router.get("/{actor_id}", response_model=ActorDetail)
async def get_actor(actor_id: str, db: AsyncSession = Depends(get_db)):
    """Get single actor details"""
    result = await db.execute(select(DBActor).where(DBActor.id == actor_id))
    actor = result.scalar_one_or_none()
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    return ActorDetail(
        id=actor.id,
        name=actor.name,
        display_color=actor.display_color,
        icon=actor.icon,
        is_meta_judge=actor.is_meta_judge,
        provider=actor.provider,
        model=actor.model,
        api_format=actor.api_format,
        base_url=actor.base_url,
        max_tokens=actor.max_tokens,
        temperature=actor.temperature,
        extra_params=actor.extra_params or {},
        system_prompt=actor.system_prompt,
        review_prompt=actor.review_prompt,
        revision_prompt=actor.revision_prompt,
        personality=actor.personality,
        custom_instructions=actor.custom_instructions,
        created_at=actor.created_at,
        updated_at=actor.updated_at,
    )


@router.post("", response_model=ActorResponse)
async def create_actor(data: ActorCreate, db: AsyncSession = Depends(get_db)):
    """Create new actor"""
    actor = DBActor(
        name=data.name,
        display_color=data.display_color,
        icon=data.icon,
        is_meta_judge=data.is_meta_judge,
        provider=data.api_config.provider,
        api_format=data.api_config.api_format,
        base_url=data.api_config.base_url,
        api_key=data.api_config.api_key,
        model=data.api_config.model,
        max_tokens=data.api_config.max_tokens,
        temperature=data.api_config.temperature,
        extra_params=data.api_config.extra_params,
        system_prompt=data.prompt_config.system_prompt,
        review_prompt=data.prompt_config.review_prompt,
        revision_prompt=data.prompt_config.revision_prompt,
        personality=data.prompt_config.personality,
        custom_instructions=data.prompt_config.custom_instructions,
    )
    db.add(actor)
    await db.commit()
    await db.refresh(actor)

    return ActorResponse(
        id=actor.id,
        name=actor.name,
        display_color=actor.display_color,
        icon=actor.icon,
        is_meta_judge=actor.is_meta_judge,
        provider=actor.provider,
        model=actor.model,
        created_at=actor.created_at,
        updated_at=actor.updated_at,
    )


@router.put("/{actor_id}", response_model=ActorResponse)
async def update_actor(
    actor_id: str,
    data: ActorUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update actor"""
    result = await db.execute(select(DBActor).where(DBActor.id == actor_id))
    actor = result.scalar_one_or_none()
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    update_data = data.model_dump(exclude_unset=True)

    if "name" in update_data:
        actor.name = update_data["name"]
    if "display_color" in update_data:
        actor.display_color = update_data["display_color"]
    if "icon" in update_data:
        actor.icon = update_data["icon"]
    if "is_meta_judge" in update_data:
        actor.is_meta_judge = update_data["is_meta_judge"]

    if "api_config" in update_data and update_data["api_config"]:
        api_config = update_data["api_config"]
        if api_config.get("provider") is not None:
            actor.provider = api_config["provider"]
        if api_config.get("api_format") is not None:
            actor.api_format = api_config["api_format"]
        if api_config.get("base_url") is not None:
            actor.base_url = api_config["base_url"]
        # ✅ 只有显式提供 api_key 时才更新，None 表示保留现有
        if api_config.get("api_key") is not None:
            actor.api_key = api_config["api_key"]
        if api_config.get("model") is not None:
            actor.model = api_config["model"]
        if api_config.get("max_tokens") is not None:
            actor.max_tokens = api_config["max_tokens"]
        if api_config.get("temperature") is not None:
            actor.temperature = api_config["temperature"]
        if api_config.get("extra_params") is not None:
            actor.extra_params = api_config["extra_params"]

    if "prompt_config" in update_data and update_data["prompt_config"]:
        prompt_config = update_data["prompt_config"]
        actor.system_prompt = prompt_config.get("system_prompt", actor.system_prompt)
        actor.review_prompt = prompt_config.get("review_prompt", actor.review_prompt)
        actor.revision_prompt = prompt_config.get("revision_prompt", actor.revision_prompt)
        actor.personality = prompt_config.get("personality", actor.personality)
        actor.custom_instructions = prompt_config.get("custom_instructions", actor.custom_instructions)

    await db.commit()
    await db.refresh(actor)

    return ActorResponse(
        id=actor.id,
        name=actor.name,
        display_color=actor.display_color,
        icon=actor.icon,
        is_meta_judge=actor.is_meta_judge,
        provider=actor.provider,
        model=actor.model,
        created_at=actor.created_at,
        updated_at=actor.updated_at,
    )


@router.delete("/{actor_id}")
async def delete_actor(actor_id: str, db: AsyncSession = Depends(get_db)):
    """Delete actor (soft delete)"""
    result = await db.execute(select(DBActor).where(DBActor.id == actor_id))
    actor = result.scalar_one_or_none()
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    # Check if actor is used in any session
    from app.models.database import DebateSessionActor, DebateSession

    # Check as participant
    result = await db.execute(
        select(DebateSessionActor).where(DebateSessionActor.actor_id == actor_id).limit(1)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Cannot delete actor: already used in debate sessions. Use soft delete instead."
        )

    # Check as judge
    result = await db.execute(
        select(DebateSession).where(DebateSession.judge_actor_id == actor_id).limit(1)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Cannot delete actor: already used as judge in debate sessions."
        )

    # Soft delete
    actor.is_active = False
    await db.commit()
    return {"message": "Actor deleted successfully"}


@router.post("/{actor_id}/test")
async def test_actor(actor_id: str, db: AsyncSession = Depends(get_db)):
    """Test actor connectivity"""
    result = await db.execute(select(DBActor).where(DBActor.id == actor_id))
    actor = result.scalar_one_or_none()
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    from app.services.llm_adapter import create_adapter

    try:
        adapter = create_adapter(
            provider=actor.provider.value,
            api_key=actor.api_key,
            base_url=actor.base_url,
            model=actor.model,
        )

        # Simple test message
        response_text = ""
        async for token in adapter.stream_completion(
            messages=[{"role": "user", "content": "Say 'OK' if you can hear me."}],
            max_tokens=50,
        ):
            response_text += token

        return {"status": "success", "response": response_text[:100]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")
```


### backend\app\api\debate.py

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
    if session.consensus_summary:
        consensus = ConsensusResult(
            summary=session.consensus_summary,
            agreements=session.consensus_agreements or [],
            disagreements=session.consensus_disagreements or [],
            confidence=session.consensus_confidence,  # Can be None
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
```


### backend\app\api\presets.py

```python
from fastapi import APIRouter
from typing import List
from app.models.schemas import ActorCreate, ActorResponse, APIConfigCreate, PromptConfigBase, ProviderType

router = APIRouter(prefix="/api/presets", tags=["presets"])


# Default prompt templates
DEFAULT_PROMPTS = {
    "conservative": PromptConfigBase(
        system_prompt="You are a cautious and thorough analyst. You prioritize risk assessment and careful consideration of all possibilities. You tend to be skeptical of bold claims and prefer conservative, well-established solutions.",
        review_prompt="Review the responses with a critical eye towards risks, edge cases, and potential issues. Highlight any assumptions that may not hold.",
        revision_prompt="Revise your response to address valid concerns while maintaining your cautious perspective.",
        personality="conservative",
    ),
    "innovative": PromptConfigBase(
        system_prompt="You are an innovative thinker who embraces new approaches and creative solutions. You enjoy exploring unconventional ideas and pushing boundaries. You believe the best solutions often come from unexpected directions.",
        review_prompt="Review the responses and identify opportunities for innovation. Point out where traditional thinking might be limiting.",
        revision_prompt="Revise your response to incorporate creative insights while remaining practical.",
        personality="innovative",
    ),
    "academic": PromptConfigBase(
        system_prompt="You are an academic researcher with deep expertise. You value precision, citations, and logical rigor. You communicate in a scholarly manner and always seek evidence-based conclusions.",
        review_prompt="Review the responses for logical consistency, evidentiary support, and academic rigor. Identify any logical fallacies or unsupported claims.",
        revision_prompt="Revise your response to be more precise and evidence-based.",
        personality="academic",
    ),
    "practical": PromptConfigBase(
        system_prompt="You are a pragmatic problem-solver focused on real-world applications. You value simplicity, efficiency, and actionable solutions. You prefer approaches that can be implemented quickly and effectively.",
        review_prompt="Review the responses for practical applicability. Identify overly complex solutions and suggest simplifications.",
        revision_prompt="Revise your response to be more actionable and implementable.",
        personality="practical",
    ),
}


@router.get("/actors")
async def get_preset_actors() -> List[dict]:
    """Get preset actor templates"""
    return [
        {
            "name": "CASPER",
            "display_color": "#FF6B35",
            "icon": "🔶",
            "is_meta_judge": False,
            "api_config": {
                "provider": "openai",
                "model": "gpt-4o",
                "api_format": "openai_compatible",
            },
            "prompt_config": DEFAULT_PROMPTS["conservative"].model_dump(),
            "description": "Conservative analyst - cautious and thorough",
        },
        {
            "name": "BALTHASAR",
            "display_color": "#4ECDC4",
            "icon": "🔵",
            "is_meta_judge": False,
            "api_config": {
                "provider": "anthropic",
                "model": "claude-sonnet-4-20250514",
                "api_format": "anthropic",
            },
            "prompt_config": DEFAULT_PROMPTS["innovative"].model_dump(),
            "description": "Innovative thinker - creative and forward-looking",
        },
        {
            "name": "MELCHIOR",
            "display_color": "#A855F7",
            "icon": "🟣",
            "is_meta_judge": True,
            "api_config": {
                "provider": "anthropic",
                "model": "claude-sonnet-4-20250514",
                "api_format": "anthropic",
            },
            "prompt_config": {
                "system_prompt": "You are an impartial Meta Judge for multi-agent debates. Your role is to synthesize different perspectives into coherent consensus reports.",
                "review_prompt": "",
                "revision_prompt": "",
                "personality": "neutral",
                "custom_instructions": "Always provide balanced, fair judgments that respect all perspectives.",
            },
            "description": "Meta Judge - consensus synthesizer",
        },
    ]


@router.get("/prompts")
async def get_preset_prompts() -> dict:
    """Get preset prompt templates"""
    return {k: v.model_dump() for k, v in DEFAULT_PROMPTS.items()}
```


### backend\app\api\sessions.py

```python
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
```


### backend\app\api\settings.py

```python
"""
Settings API - Manage workflow prompts and prompt presets.
All prompts are stored in DB and editable via Settings UI.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.services.database import get_db
from app.models.database import WorkflowPromptTemplate, PromptPreset

router = APIRouter(prefix="/api/settings", tags=["settings"])


# ========== Schemas ==========

class WorkflowPromptUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    template_text: Optional[str] = None
    required_variables: Optional[List[str]] = None


class WorkflowPromptResponse(BaseModel):
    id: str
    key: str
    name: str
    description: str
    template_text: str
    required_variables: List[str]
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PromptPresetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    review_prompt: Optional[str] = None
    revision_prompt: Optional[str] = None
    personality: Optional[str] = None
    custom_instructions: Optional[str] = None


class PromptPresetResponse(BaseModel):
    id: str
    key: str
    name: str
    description: str
    system_prompt: str
    review_prompt: str
    revision_prompt: str
    personality: str
    custom_instructions: str
    is_builtin: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ========== Workflow Prompts ==========

@router.get("/workflow-prompts", response_model=List[WorkflowPromptResponse])
async def list_workflow_prompts(db: AsyncSession = Depends(get_db)):
    """List all workflow prompt templates."""
    result = await db.execute(
        select(WorkflowPromptTemplate).order_by(WorkflowPromptTemplate.key)
    )
    return list(result.scalars().all())


@router.get("/workflow-prompts/{key}", response_model=WorkflowPromptResponse)
async def get_workflow_prompt(key: str, db: AsyncSession = Depends(get_db)):
    """Get a specific workflow prompt template."""
    result = await db.execute(
        select(WorkflowPromptTemplate).where(WorkflowPromptTemplate.key == key)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail=f"Workflow prompt '{key}' not found")
    return template


@router.put("/workflow-prompts/{key}", response_model=WorkflowPromptResponse)
async def update_workflow_prompt(
    key: str,
    data: WorkflowPromptUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a workflow prompt template."""
    result = await db.execute(
        select(WorkflowPromptTemplate).where(WorkflowPromptTemplate.key == key)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail=f"Workflow prompt '{key}' not found")

    if data.name is not None:
        template.name = data.name
    if data.description is not None:
        template.description = data.description
    if data.template_text is not None:
        template.template_text = data.template_text
    if data.required_variables is not None:
        template.required_variables = data.required_variables

    await db.commit()
    await db.refresh(template)
    return template


# ========== Prompt Presets ==========

@router.get("/prompt-presets", response_model=List[PromptPresetResponse])
async def list_prompt_presets(db: AsyncSession = Depends(get_db)):
    """List all prompt presets."""
    result = await db.execute(
        select(PromptPreset).order_by(PromptPreset.key)
    )
    return list(result.scalars().all())


@router.get("/prompt-presets/{key}", response_model=PromptPresetResponse)
async def get_prompt_preset(key: str, db: AsyncSession = Depends(get_db)):
    """Get a specific prompt preset."""
    result = await db.execute(
        select(PromptPreset).where(PromptPreset.key == key)
    )
    preset = result.scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail=f"Prompt preset '{key}' not found")
    return preset


@router.put("/prompt-presets/{key}", response_model=PromptPresetResponse)
async def update_prompt_preset(
    key: str,
    data: PromptPresetUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a prompt preset."""
    result = await db.execute(
        select(PromptPreset).where(PromptPreset.key == key)
    )
    preset = result.scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail=f"Prompt preset '{key}' not found")

    if data.name is not None:
        preset.name = data.name
    if data.description is not None:
        preset.description = data.description
    if data.system_prompt is not None:
        preset.system_prompt = data.system_prompt
    if data.review_prompt is not None:
        preset.review_prompt = data.review_prompt
    if data.revision_prompt is not None:
        preset.revision_prompt = data.revision_prompt
    if data.personality is not None:
        preset.personality = data.personality
    if data.custom_instructions is not None:
        preset.custom_instructions = data.custom_instructions

    await db.commit()
    await db.refresh(preset)
    return preset
```


### backend\app\core\__init__.py

```python
from .config import Settings, get_settings

__all__ = ["Settings", "get_settings"]
```


### backend\app\core\config.py

```python
from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""

    # Database
    database_url: str = "sqlite+aiosqlite:///./magi.db"

    # Security
    secret_key: str = "magi-secret-key-change-in-production"

    # CORS
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Default LLM settings
    default_max_tokens: int = 4096
    default_temperature: float = 0.7

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
```


### backend\app\main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import get_settings
from app.services.database import init_db
from app.api import actors_router, debate_router, sessions_router, presets_router
from app.api.settings import router as settings_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title="MAGI Backend",
    description="Multi-Agent Guided Intelligence - Debate System",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(actors_router)
app.include_router(debate_router)
app.include_router(sessions_router)
app.include_router(presets_router)
app.include_router(settings_router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "0.1.0"}
```


### backend\app\models\__init__.py

```python
from .database import Base, Actor, DebateSession, DebateSessionActor, Round, Message
from .database import ProviderType, SessionStatus

__all__ = [
    "Base",
    "Actor",
    "DebateSession",
    "DebateSessionActor",
    "Round",
    "Message",
    "ProviderType",
    "SessionStatus",
]
```


### backend\app\models\database.py

```python
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, Float, Enum as SQLEnum, JSON, UniqueConstraint
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func
import uuid
import enum


class Base(DeclarativeBase):
    pass


def generate_uuid() -> str:
    return str(uuid.uuid4())


class ProviderType(str, enum.Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    CUSTOM = "custom"


class SessionStatus(str, enum.Enum):
    INITIALIZING = "initializing"
    DEBATING = "debating"
    JUDGING = "judging"
    COMPLETED = "completed"
    STOPPED = "stopped"


class Actor(Base):
    __tablename__ = "actors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(50), nullable=False)
    display_color = Column(String(7), default="#FF6B35")
    icon = Column(String(10), default="🤖")

    # API Configuration
    provider = Column(SQLEnum(ProviderType), nullable=False)
    api_format = Column(String(50), default="openai_compatible")
    base_url = Column(String(255))
    api_key = Column(String(255), nullable=False)  # Should be encrypted in production
    model = Column(String(100), nullable=False)
    max_tokens = Column(Integer, default=4096)
    temperature = Column(Float, default=0.7)
    extra_params = Column(JSON, default=dict)

    # Prompt Configuration
    system_prompt = Column(Text, default="")
    review_prompt = Column(Text, default="")
    revision_prompt = Column(Text, default="")
    personality = Column(String(50), default="neutral")
    custom_instructions = Column(Text, default="")

    # Meta
    is_meta_judge = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)  # ✅ 软删除标记
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    sessions = relationship("DebateSessionActor", back_populates="actor")
    judge_sessions = relationship("DebateSession", back_populates="judge_actor")


class DebateSession(Base):
    __tablename__ = "debate_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    question = Column(Text, nullable=False)
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.INITIALIZING)
    judge_actor_id = Column(String(36), ForeignKey("actors.id"))

    # Configuration
    max_rounds = Column(Integer, default=3)
    convergence_threshold = Column(Float, default=0.85)
    auto_stop = Column(Boolean, default=True)

    # Results
    consensus_summary = Column(Text)
    consensus_agreements = Column(JSON, default=list)
    consensus_disagreements = Column(JSON, default=list)
    consensus_confidence = Column(Float)
    consensus_recommendation = Column(Text)

    # Stats
    total_tokens = Column(Integer, default=0)
    total_cost = Column(Float, default=0.0)

    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime)

    # Relationships
    judge_actor = relationship("Actor", back_populates="judge_sessions")
    actors = relationship("DebateSessionActor", back_populates="session", cascade="all, delete-orphan")
    rounds = relationship("Round", back_populates="session", cascade="all, delete-orphan")


class DebateSessionActor(Base):
    __tablename__ = "debate_session_actors"
    __table_args__ = (
        UniqueConstraint('session_id', 'actor_id', name='uq_session_actor'),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("debate_sessions.id"), nullable=False)
    actor_id = Column(String(36), ForeignKey("actors.id"), nullable=False)

    # Relationships
    session = relationship("DebateSession", back_populates="actors")
    actor = relationship("Actor", back_populates="sessions")


class Round(Base):
    __tablename__ = "rounds"
    __table_args__ = (
        UniqueConstraint('session_id', 'round_number', name='uq_session_round'),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("debate_sessions.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    phase = Column(String(20), default="initial")  # initial, review, revision, final

    # Relationships
    session = relationship("DebateSession", back_populates="rounds")
    messages = relationship("Message", back_populates="round", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    round_id = Column(String(36), ForeignKey("rounds.id"), nullable=False)
    actor_id = Column(String(36), ForeignKey("actors.id"), nullable=False)

    role = Column(String(20), nullable=False)  # answer, review, revision, summary
    content = Column(Text, nullable=False)

    # Token tracking
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    round = relationship("Round", back_populates="messages")


class WorkflowPromptTemplate(Base):
    """System workflow prompt templates stored in DB for editing in Settings."""
    __tablename__ = "workflow_prompt_templates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(50), unique=True, nullable=False)  # initial_answer, peer_review, revision, summary, convergence_check
    name = Column(String(100), nullable=False)
    description = Column(Text, default="")
    template_text = Column(Text, nullable=False)
    required_variables = Column(JSON, default=list)  # ["question", "actor_name", ...]
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class PromptPreset(Base):
    """Actor prompt presets stored in DB for editing in Settings."""
    __tablename__ = "prompt_presets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(50), unique=True, nullable=False)  # conservative, innovative, academic, practical, synthesizer
    name = Column(String(100), nullable=False)
    description = Column(Text, default="")
    system_prompt = Column(Text, default="")
    review_prompt = Column(Text, default="")
    revision_prompt = Column(Text, default="")
    personality = Column(String(50), default="neutral")
    custom_instructions = Column(Text, default="")
    is_builtin = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class QuestionIntent(Base):
    """问题意图分析结果 - 存储对用户问题的结构化分析"""
    __tablename__ = "question_intents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("debate_sessions.id"), unique=True)
    question_type = Column(String(50))  # investment_decision, analysis, comparison...
    user_goal = Column(Text)
    time_horizons = Column(JSON, default=list)  # ["short_term", "medium_term", "long_term"]
    comparison_axes = Column(JSON, default=list)  # [{axis_id, label}, ...]
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    session = relationship("DebateSession", backref="question_intent", uselist=False)


class SemanticTopic(Base):
    """每个回答的语义主题提取结果"""
    __tablename__ = "semantic_topics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("debate_sessions.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    phase = Column(String(20), nullable=False)  # initial, revision
    actor_id = Column(String(36), ForeignKey("actors.id"), nullable=False)

    topic_id = Column(String(50), nullable=False)  # energy_substitution, safe_haven...
    axis_id = Column(String(50))  # 对应 comparison_axes
    label = Column(String(100), nullable=False)  # 主题名称
    summary = Column(Text)  # 观点摘要
    stance = Column(String(50))  # 立场标签
    time_horizon = Column(String(20))  # short, medium, long
    risk_level = Column(String(20))  # low, medium, high
    novelty = Column(String(20))  # low, medium, high
    quotes = Column(JSON, default=list)  # 原文引用

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    session = relationship("DebateSession", backref="semantic_topics")
    actor = relationship("Actor", backref="semantic_topics")


class SemanticComparison(Base):
    """跨模型语义比较结果 - 主题分歧图谱"""
    __tablename__ = "semantic_comparisons"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("debate_sessions.id"), nullable=False)
    round_number = Column(Integer, nullable=False)
    phase = Column(String(20), nullable=False)

    topic_id = Column(String(50), nullable=False)
    label = Column(String(100), nullable=False)
    salience = Column(Float, default=0.5)  # 重要度 0-1
    disagreement_score = Column(Float, default=0.5)  # 分歧度 0-1
    status = Column(String(20), default="partial")  # converged, divergent, partial
    difference_types = Column(JSON, default=list)  # ["solution_class", "time_horizon"]
    agreement_summary = Column(Text)
    disagreement_summary = Column(Text)
    actor_positions = Column(JSON, default=list)  # [{actor_id, actor_name, stance_label, summary, quotes}]

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    session = relationship("DebateSession", backref="semantic_comparisons")
```


### backend\app\models\schemas.py

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ProviderType(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    CUSTOM = "custom"


class SessionStatus(str, Enum):
    INITIALIZING = "initializing"
    DEBATING = "debating"
    JUDGING = "judging"
    COMPLETED = "completed"
    STOPPED = "stopped"


# ========== Actor Schemas ==========

class APIConfigBase(BaseModel):
    provider: ProviderType
    api_format: str = "openai_compatible"
    base_url: Optional[str] = None
    model: str
    max_tokens: int = 4096
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    extra_params: dict = Field(default_factory=dict)


class APIConfigCreate(APIConfigBase):
    api_key: str


class APIConfigUpdate(BaseModel):
    """API config update - all fields optional, api_key=None means keep existing"""
    provider: Optional[ProviderType] = None
    api_format: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None  # None means keep existing key
    model: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    extra_params: Optional[dict] = None


class PromptConfigBase(BaseModel):
    system_prompt: str = ""
    review_prompt: str = ""
    revision_prompt: str = ""
    personality: str = "neutral"
    custom_instructions: str = ""


class ActorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    display_color: str = "#FF6B35"
    icon: str = "🤖"
    is_meta_judge: bool = False


class ActorCreate(ActorBase):
    api_config: APIConfigCreate
    prompt_config: PromptConfigBase


class ActorUpdate(BaseModel):
    name: Optional[str] = None
    display_color: Optional[str] = None
    icon: Optional[str] = None
    api_config: Optional[APIConfigUpdate] = None  # ✅ 使用 Update 版本
    prompt_config: Optional[PromptConfigBase] = None
    is_meta_judge: Optional[bool] = None


class ActorResponse(ActorBase):
    id: str
    provider: ProviderType
    model: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ActorDetail(ActorResponse):
    api_format: str
    base_url: Optional[str] = None
    max_tokens: int
    temperature: float
    extra_params: dict
    system_prompt: str
    review_prompt: str
    revision_prompt: str
    personality: str
    custom_instructions: str


# ========== Debate Session Schemas ==========

class SessionConfig(BaseModel):
    max_rounds: int = Field(default=3, ge=1, le=10)
    convergence_threshold: float = Field(default=0.85, ge=0.0, le=1.0)
    auto_stop: bool = True


class DebateStartRequest(BaseModel):
    question: str = Field(..., min_length=1)
    actor_ids: list[str] = Field(..., min_length=2)
    judge_actor_id: str
    config: SessionConfig = Field(default_factory=SessionConfig)


class DebateStartResponse(BaseModel):
    session_id: str


class MessageResponse(BaseModel):
    id: str
    actor_id: str
    actor_name: Optional[str] = None
    role: str
    content: str
    input_tokens: int
    output_tokens: int
    created_at: datetime

    class Config:
        from_attributes = True


class RoundResponse(BaseModel):
    round_number: int
    phase: str
    messages: list[MessageResponse]

    class Config:
        from_attributes = True


class ConsensusResult(BaseModel):
    summary: str
    agreements: list[str]
    disagreements: list[str]
    confidence: Optional[float] = None
    recommendation: str


class DebateSessionResponse(BaseModel):
    id: str
    question: str
    status: SessionStatus
    actors: list[ActorResponse]
    judge_actor: Optional[ActorResponse] = None
    max_rounds: int
    rounds: list[RoundResponse]
    consensus: Optional[ConsensusResult] = None
    total_tokens: int
    total_cost: float
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DebateSessionList(BaseModel):
    id: str
    question: str
    status: SessionStatus
    consensus_confidence: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ========== SSE Event Schemas ==========

class SSEEvent(BaseModel):
    event: str
    data: dict


class RoundStartEvent(BaseModel):
    round: int
    phase: str


class ActorStartEvent(BaseModel):
    actor_id: str
    actor_name: str


class TokenEvent(BaseModel):
    actor_id: str
    content: str


class ActorEndEvent(BaseModel):
    actor_id: str
    input_tokens: int
    output_tokens: int


class ConsensusEvent(BaseModel):
    summary: str
    agreements: list[str]
    disagreements: list[str]
    confidence: float
    recommendation: str


class CompleteEvent(BaseModel):
    session_id: str
    total_tokens: int
    total_cost: float


class ErrorEvent(BaseModel):
    message: str


# ========== Semantic Analysis Schemas ==========

class ComparisonAxis(BaseModel):
    axis_id: str
    label: str


class QuestionIntentResponse(BaseModel):
    id: str
    session_id: str
    question_type: Optional[str] = None
    user_goal: Optional[str] = None
    time_horizons: list[str] = Field(default_factory=list)
    comparison_axes: list[ComparisonAxis] = Field(default_factory=list)
    created_at: datetime

    class Config:
        from_attributes = True


class SemanticTopicResponse(BaseModel):
    id: str
    session_id: str
    round_number: int
    phase: str
    actor_id: str
    topic_id: str
    axis_id: Optional[str] = None
    label: str
    summary: Optional[str] = None
    stance: Optional[str] = None
    time_horizon: Optional[str] = None
    risk_level: Optional[str] = None
    novelty: Optional[str] = None
    quotes: list[str] = Field(default_factory=list)
    created_at: datetime

    class Config:
        from_attributes = True


class ActorPosition(BaseModel):
    actor_id: str
    actor_name: Optional[str] = None
    stance_label: Optional[str] = None
    summary: Optional[str] = None
    quotes: list[str] = Field(default_factory=list)


class SemanticComparisonResponse(BaseModel):
    id: str
    session_id: str
    round_number: int
    phase: str
    topic_id: str
    label: str
    salience: float = 0.5
    disagreement_score: float = 0.5
    status: str = "partial"  # converged, divergent, partial
    difference_types: list[str] = Field(default_factory=list)
    agreement_summary: Optional[str] = None
    disagreement_summary: Optional[str] = None
    actor_positions: list[ActorPosition] = Field(default_factory=list)
    created_at: datetime

    class Config:
        from_attributes = True


class SemanticAnalysisResult(BaseModel):
    """Complete semantic analysis result for a session"""
    question_intent: Optional[QuestionIntentResponse] = None
    comparisons: list[SemanticComparisonResponse] = Field(default_factory=list)
```


### backend\app\services\__init__.py

```python
from .database import get_db, init_db, AsyncSessionLocal
from .llm_adapter import LLMAdapter, OpenAIAdapter, AnthropicAdapter, CustomAdapter, create_adapter

__all__ = [
    "get_db",
    "init_db",
    "AsyncSessionLocal",
    "LLMAdapter",
    "OpenAIAdapter",
    "AnthropicAdapter",
    "CustomAdapter",
    "create_adapter",
]
```


### backend\app\services\convergence_service.py

```python
"""
Convergence Service - Determines if actor responses have converged.

Uses the judge model to analyze similarity and determine if more rounds
would be beneficial.
"""

import json
import logging
from typing import List, TYPE_CHECKING
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import Actor, SemanticComparison
from app.services.llm_adapter import create_adapter
from app.services.prompt_serializer import serialize_latest_answer_blocks

if TYPE_CHECKING:
    from app.services.prompt_service import PromptService

logger = logging.getLogger('magi.convergence')


class ConvergenceResult:
    """Result of a convergence check."""

    def __init__(
        self,
        converged: bool,
        score: float,
        reason: str,
        agreements: list[str] = None,
        disagreements: list[str] = None,
    ):
        self.converged = converged
        self.score = score
        self.reason = reason
        self.agreements = agreements or []
        self.disagreements = disagreements or []

    def to_dict(self) -> dict:
        return {
            "converged": self.converged,
            "score": self.score,
            "reason": self.reason,
            "agreements": self.agreements,
            "disagreements": self.disagreements,
        }


async def check_convergence_with_semantic(
    comparisons: List[SemanticComparison],
    threshold: float = 0.85,
) -> ConvergenceResult:
    """
    Check convergence based on semantic comparison results.

    This is a more sophisticated convergence check that uses the
    semantic disagreement map instead of raw text comparison.

    Args:
        comparisons: List of SemanticComparison objects
        threshold: Convergence threshold (0-1)

    Returns:
        ConvergenceResult with convergence status and details
    """
    if not comparisons:
        return ConvergenceResult(
            converged=False,
            score=0.0,
            reason="No semantic comparisons available",
        )

    # Count high disagreement topics
    high_disagreement_topics = [
        c for c in comparisons
        if c.disagreement_score > 0.6
    ]
    high_disagreement_count = len(high_disagreement_topics)

    # Calculate average disagreement
    total_disagreement = sum(c.disagreement_score for c in comparisons)
    avg_disagreement = total_disagreement / len(comparisons)

    # Calculate convergence score (inverse of disagreement)
    convergence_score = 1.0 - avg_disagreement

    # Determine convergence
    # Converged if:
    # 1. No high disagreement topics, OR
    # 2. Average disagreement is below threshold
    converged = (
        high_disagreement_count == 0 or
        convergence_score >= threshold
    )

    # Build agreements and disagreements lists
    agreements = []
    disagreements = []

    for c in comparisons:
        if c.status == "converged" or c.disagreement_score <= 0.3:
            if c.agreement_summary:
                agreements.append(f"{c.label}: {c.agreement_summary}")
            else:
                agreements.append(c.label)
        elif c.disagreement_score > 0.6:
            if c.disagreement_summary:
                disagreements.append(f"{c.label}: {c.disagreement_summary}")
            else:
                disagreements.append(c.label)

    # Build reason
    if converged:
        if high_disagreement_count == 0:
            reason = "所有主题都已达成共识"
        else:
            reason = f"共识度达到 {round(convergence_score * 100)}%，已超过阈值"
    else:
        reason = f"仍有 {high_disagreement_count} 个主题存在明显分歧"

    return ConvergenceResult(
        converged=converged,
        score=convergence_score,
        reason=reason,
        agreements=agreements,
        disagreements=disagreements,
    )


async def check_convergence(
    db: AsyncSession,
    judge_actor_id: str,
    question: str,
    responses: dict[str, str],  # actor_id -> response content
    threshold: float = 0.85,
    prompt_service: "PromptService" = None,
) -> ConvergenceResult:
    """
    Check if responses have converged using the judge model.

    Args:
        db: Database session
        judge_actor_id: ID of the actor to use for convergence check
        question: The original question
        responses: Map of actor_id to their latest response
        threshold: Convergence threshold (0-1)
        prompt_service: REQUIRED - PromptService instance for loading templates

    Returns:
        ConvergenceResult with convergence status and details

    Raises:
        ValueError: If prompt_service is not provided
    """
    if prompt_service is None:
        raise ValueError(
            "prompt_service is required — hardcoded prompts are banned in this project. "
            "See .claude/RULES.md"
        )

    # Get judge actor
    result = await db.execute(
        select(Actor).where(Actor.id == judge_actor_id)
    )
    judge = result.scalar_one_or_none()

    if not judge:
        logger.error(f"Judge actor {judge_actor_id} not found")
        return ConvergenceResult(
            converged=False,
            score=0.0,
            reason="Judge actor not found",
        )

    # Build structured answer blocks
    answer_blocks = []
    for actor_id, content in responses.items():
        # Get actor name
        actor_result = await db.execute(
            select(Actor.name).where(Actor.id == actor_id)
        )
        actor_name = actor_result.scalar_one_or_none() or "Unknown"
        answer_blocks.append({
            "actor_name": actor_name,
            "content": content,
        })

    latest_answer_blocks = serialize_latest_answer_blocks(answer_blocks)

    # Get prompt from PromptService - NO fallback allowed
    prompt = await prompt_service.get_convergence_prompt(
        question=question,
        latest_answer_blocks=latest_answer_blocks,
    )

    try:
        adapter = create_adapter(
            provider=judge.provider.value,
            api_key=judge.api_key,
            base_url=judge.base_url,
            model=judge.model,
        )

        full_response = ""
        async for token in adapter.stream_completion(
            messages=[{"role": "user", "content": prompt}],
            system_prompt="你是一个专业的收敛判断器。请以JSON格式返回判断结果。",
            max_tokens=judge.max_tokens,
            temperature=0.3,
        ):
            full_response += token

        # Parse JSON response
        json_start = full_response.find("{")
        json_end = full_response.rfind("}") + 1

        if json_start >= 0 and json_end > json_start:
            json_str = full_response[json_start:json_end]
            data = json.loads(json_str)

            converged = data.get("converged", False)
            score = data.get("score")

            # Validate score - if not provided or invalid, mark as unavailable
            if score is None:
                score = None
                converged = False
            else:
                try:
                    score = float(score)
                    # Apply threshold
                    if score >= threshold:
                        converged = True
                except (ValueError, TypeError):
                    score = None
                    converged = False

            return ConvergenceResult(
                converged=converged,
                score=score if score is not None else 0.0,
                reason=data.get("reason", "") + (" (置信度不可用)" if score is None else ""),
                agreements=data.get("agreements", []),
                disagreements=data.get("disagreements", []),
            )
        else:
            logger.warning(f"Could not parse convergence response: {full_response}")
            return ConvergenceResult(
                converged=False,
                score=0.0,
                reason="无法解析收敛判断结果",
            )

    except Exception as e:
        logger.error(f"Convergence check failed: {e}")
        return ConvergenceResult(
            converged=False,
            score=0.0,
            reason=f"Error: {str(e)}",
        )
```


### backend\app\services\database.py

```python
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from app.core.config import get_settings

logger = logging.getLogger('magi.database')

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

# Alias for background tasks
async_session_factory = AsyncSessionLocal


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables and seed default prompts."""
    from app.models.database import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed default workflow prompts and presets
    await _seed_default_prompts()


async def _seed_default_prompts():
    """Seed default workflow prompts and presets if they don't exist.

    This function is idempotent - it only adds missing templates/presets by key.
    """
    from app.models.database import WorkflowPromptTemplate, PromptPreset

    async with AsyncSessionLocal() as db:
        # Load existing template keys
        result = await db.execute(
            select(WorkflowPromptTemplate.key)
        )
        existing_keys = set(row[0] for row in result.fetchall())

        # Default workflow prompts
        workflow_prompts = [
            WorkflowPromptTemplate(
                key="initial_answer",
                name="初始回答提示词",
                description="用于生成初始回答的系统提示词模板",
                template_text="""你是 {{actor_name}}，一名专业的分析者，正在参与一个多模型互评系统。

请针对以下问题给出你的专业回答。你的回答应该：
1. 结构清晰，逻辑严谨
2. 提供具体的论据和例子
3. 考虑多种可能性

问题：{{question}}

请给出你的回答：""",
                required_variables=["question", "actor_name"],
            ),
            WorkflowPromptTemplate(
                key="peer_review",
                name="互评提示词",
                description="用于模型互相评审的回答",
                template_text="""你是一名专业的评审者，请对以下回答进行评审。

原始问题：{{question}}

你是 {{self_actor_name}}，下面是你的回答：

{{self_answer_block}}

其他参与者的回答：

{{peer_answer_blocks}}

## 重要说明

- 引用自己的回答时，请说"我的回答"或"{{self_actor_name}} 的回答"
- 引用其他参与者时，请使用他们的 actor_name 属性值
- 不要把自己的回答称为"你的回答"

请从以下角度进行评审：
1. 各回答的优点和亮点
2. 各回答的不足和可能的错误
3. 改进建议

请给出你的评审意见：""",
                required_variables=["question", "self_actor_name", "self_answer_block", "peer_answer_blocks"],
            ),
            WorkflowPromptTemplate(
                key="revision",
                name="修订提示词",
                description="根据互评意见修订回答",
                template_text="""请根据其他参与者的评审意见，修订你的原始回答。

原始问题：{{question}}

你是 {{self_actor_name}}，你的原始回答：

{{self_previous_answer_block}}

其他参与者对你的评审意见：

{{peer_review_blocks}}

## 重要说明

- 引用自己的上一轮回答时，请说"我的上一轮回答"或"{{self_actor_name}} 的上一轮回答"
- 不要把自己的回答称为"你的回答"
- 引用评审者时，请使用 reviewer_name 属性值

请根据这些意见修订你的回答：
1. 接纳合理的批评和建议
2. 保持你独特的视角
3. 提供更全面准确的答案

请给出修订后的回答：""",
                required_variables=["question", "self_actor_name", "self_previous_answer_block", "peer_review_blocks"],
            ),
            WorkflowPromptTemplate(
                key="final_answer",
                name="最终回答提示词",
                description="综合各模型回答，生成面向用户的最终回答",
                template_text="""你是 {{self_actor_name}}，一个综合决策助手，需要基于多轮互评的结果，输出一篇面向用户的最终回答。

## 原始问题

{{question}}

## 各参与者的最终回答

{{actor_answer_blocks}}

## 收敛分析结果

{{convergence_info}}

## 要求

请直接回答用户的问题，要求：
1. 优先采用已达成共识的观点
2. 对仍有分歧的地方说明条件与不确定性
3. 如果收敛度较低，给出分情境建议
4. 使用清晰、自然的语言，不要使用 JSON 格式
5. 直接给出最终回答，不要解释过程
6. 引用参与者观点时，使用 actor_name 属性值
""",
                required_variables=["question", "self_actor_name", "actor_answer_blocks", "convergence_info"],
            ),
            WorkflowPromptTemplate(
                key="summary",
                name="总结提示词",
                description="总结模型生成最终综合结论",
                template_text="""你是 {{self_actor_name}}，一个公正的综合者，需要根据多轮互评的结果生成最终的综合结论。

原始问题：{{question}}

完整的互评历史：

{{history_blocks}}

## 重要说明

- 引用参与者观点时，请使用 actor_name 属性值
- 引用自己的分析时，请说"我认为"或"经综合分析"

请根据以上信息，生成一个综合性的最终回答。你的回答应该：
1. 整合各参与者的核心观点
2. 指出达成的共识
3. 指出仍存在的分歧
4. 给出你的综合建议

请以 JSON 格式返回：
{
  "summary": "综合总结",
  "agreements": ["共识点1", "共识点2"],
  "disagreements": ["分歧点1"],
  "confidence": <你对结论的信心程度，0.0-1.0之间的小数，如果不确定则省略此字段>,
  "recommendation": "最终建议"
}""",
                required_variables=["question", "self_actor_name", "history_blocks"],
            ),
            WorkflowPromptTemplate(
                key="convergence_check",
                name="收敛检查提示词",
                description="检查各回答是否已收敛",
                template_text="""你是一个收敛判断器，需要判断以下回答是否已经收敛（达成足够共识）。

原始问题：{{question}}

各参与者的最新回答：

{{latest_answer_blocks}}

请判断这些回答是否已收敛。收敛的标准是：
1. 核心观点基本一致
2. 主要分歧已经缩小到次要细节
3. 不太可能通过更多轮次获得显著改进

## 重要说明
- 引用参与者时，请使用 actor_name 属性值

请以 JSON 格式返回：
{
  "converged": true/false,
  "score": 0.0-1.0,
  "reason": "判断理由",
  "agreements": ["已达成共识的点"],
  "disagreements": ["仍存在分歧的点"]
}""",
                required_variables=["question", "latest_answer_blocks"],
            ),
            # Semantic analysis prompts
            WorkflowPromptTemplate(
                key="question_intent_analysis",
                name="问题意图分析提示词",
                description="分析用户问题的意图和提取比较维度",
                template_text="""你是一个问题分析专家。请分析以下问题，提取其核心意图和比较维度。

问题：{{question}}

请以 JSON 格式返回：
{
  "question_type": "问题类型（如 investment_decision, analysis, comparison 等）",
  "user_goal": "用户的核心目标",
  "time_horizons": ["短期", "中期", "长期"],
  "comparison_axes": [
    {"axis_id": "维度ID", "label": "维度名称"}
  ]
}

要求：
1. question_type 应该是问题的核心类型
2. user_goal 应该简洁地描述用户想要达到的目的
3. time_horizons 列出问题涉及的时间维度
4. comparison_axes 列出 3-5 个最核心的比较维度，用于后续比较多模型回答

只返回 JSON，不要其他文字。""",
                required_variables=["question"],
            ),
            WorkflowPromptTemplate(
                key="semantic_extraction",
                name="语义主题提取提示词",
                description="从模型回答中提取语义主题和立场",
                template_text="""你是一个语义分析专家。请分析以下回答，提取其核心主题和立场。

问题：{{question}}

回答：{{answer}}

比较维度：
{{comparison_axes}}

请以 JSON 格式返回该回答的主题：
{
  "topics": [
    {
      "topic_id": "主题标识（英文，如 energy_substitution）",
      "axis_id": "对应的比较维度ID（必须从给定的比较维度列表中选择）",
      "label": "主题名称（中文）",
      "summary": "观点摘要（一句话）",
      "stance": "立场标签（如：保守、激进、中立、实用等）",
      "time_horizon": "时间维度（short/medium/long）",
      "risk_level": "风险偏好（low/medium/high）",
      "novelty": "观点新颖度（low/medium/high）",
      "quotes": ["原文中支持该观点的关键引用"]
    }
  ]
}

要求：
1. axis_id 必须严格从给定的比较维度列表中选择，不能自己编造
2. 每个主题应该对应一个比较维度
3. summary 应该简洁精炼
4. quotes 应该是原文中的关键句子
5. 最多提取 5 个最核心的主题

只返回 JSON，不要其他文字。""",
                required_variables=["question", "answer", "comparison_axes"],
            ),
            WorkflowPromptTemplate(
                key="cross_actor_compare",
                name="跨模型比较提示词",
                description="比较多个模型在同一主题上的观点差异",
                template_text="""你是一个观点比较专家。请比较以下多个回答在同一主题上的差异。

主题：{{topic_label}}

各回答的观点：
{{actor_positions}}

请以 JSON 格式返回：
{
  "salience": 0.9,
  "disagreement_score": 0.3,
  "status": "converged/divergent/partial",
  "difference_types": ["solution_class", "time_horizon", "risk_preference"],
  "agreement_summary": "一致点",
  "disagreement_summary": "分歧点"
}

字段说明：
- salience: 该主题的重要度 (0-1)
- disagreement_score: 分歧程度 (0-1，0表示完全一致，1表示完全分歧)
- status: converged(已共识)/divergent(明显分歧)/partial(部分一致)
- difference_types: 分歧类型，可包括：solution_class(解决方案类别)、time_horizon(时间维度)、risk_preference(风险偏好)、evidence_strength(证据强度)

只返回 JSON，不要其他文字。""",
                required_variables=["topic_label", "actor_positions"],
            ),
        ]

        # Only add templates that don't exist, or update if variables changed
        added_count = 0
        for wp in workflow_prompts:
            if wp.key not in existing_keys:
                db.add(wp)
                added_count += 1
                logger.info(f"Added missing template: {wp.key}")
            else:
                # Check if required_variables mismatch - force update if stale
                result = await db.execute(
                    select(WorkflowPromptTemplate)
                    .where(WorkflowPromptTemplate.key == wp.key)
                )
                existing = result.scalar_one_or_none()
                if existing:
                    existing_vars = set(existing.required_variables or [])
                    new_vars = set(wp.required_variables or [])
                    if existing_vars != new_vars:
                        logger.warning(
                            f"Template '{wp.key}' has stale variables: "
                            f"{list(existing_vars)} → {list(new_vars)}. "
                            f"Force updating template_text and required_variables."
                        )
                        existing.required_variables = wp.required_variables
                        existing.template_text = wp.template_text
                        existing.name = wp.name
                        existing.description = wp.description
                        added_count += 1

        # Load existing preset keys
        result = await db.execute(
            select(PromptPreset.key)
        )
        existing_preset_keys = set(row[0] for row in result.fetchall())

        # Default prompt presets
        prompt_presets = [
            PromptPreset(
                key="conservative",
                name="保守分析型",
                description="谨慎、全面，优先考虑风险和边界情况",
                system_prompt="你是一名谨慎且全面的分析师。你优先进行风险评估和全面考虑所有可能性。你对大胆的主张持怀疑态度，倾向于选择保守、经过验证的解决方案。",
                review_prompt="请以批判性的眼光评审这些回答，重点关注风险、边界情况和潜在问题。指出可能不成立的假设。",
                revision_prompt="请修订你的回答以解决合理的担忧，同时保持你谨慎的视角。",
                personality="conservative",
            ),
            PromptPreset(
                key="innovative",
                name="创新探索型",
                description="拥抱新方法，探索创意解决方案",
                system_prompt="你是一名创新型思考者，拥抱新方法和创意解决方案。你喜欢探索非传统的想法，突破边界。你相信最好的解决方案往往来自意想不到的方向。",
                review_prompt="请评审这些回答并识别创新的机会。指出传统思维可能在哪些方面限制了思考。",
                revision_prompt="请修订你的回答以融入创意洞察，同时保持实用性。",
                personality="innovative",
            ),
            PromptPreset(
                key="academic",
                name="学术严谨型",
                description="注重精确、严谨、证据支撑",
                system_prompt="你是一名具有深厚专业知识的学术研究者。你重视精确性、引用和逻辑严谨性。你以学术的方式交流，始终追求基于证据的结论。",
                review_prompt="请评审这些回答的逻辑一致性、证据支持和学术严谨性。识别任何逻辑谬误或缺乏支持的主张。",
                revision_prompt="请修订你的回答使其更加精确和基于证据。",
                personality="academic",
            ),
            PromptPreset(
                key="practical",
                name="实用主义型",
                description="聚焦实际应用，追求简单高效",
                system_prompt="你是一名专注于实际应用的务实问题解决者。你重视简单性、效率和可执行的解决方案。你倾向于可以快速有效实施的方案。",
                review_prompt="请评审这些回答的实际可应用性。识别过于复杂的解决方案并提出简化建议。",
                revision_prompt="请修订你的回答使其更具可操作性和可实施性。",
                personality="practical",
            ),
            PromptPreset(
                key="synthesizer",
                name="综合总结型",
                description="适合作为总结模型，综合各方观点",
                system_prompt="你是一名公正的多模型辩论综合者。你的角色是将不同的观点综合成连贯的共识报告。你尊重所有视角，提供平衡、公正的判断。",
                review_prompt="",
                revision_prompt="",
                personality="neutral",
                custom_instructions="始终提供平衡、公正的判断，尊重所有观点。",
            ),
        ]

        # Only add presets that don't exist
        for pp in prompt_presets:
            if pp.key not in existing_preset_keys:
                db.add(pp)
                added_count += 1
                logger.info(f"Added missing preset: {pp.key}")

        if added_count > 0:
            await db.commit()
            logger.info(f"Seeded {added_count} new prompts/presets")
        else:
            logger.info("All prompts/presets already exist, skipping seed")
```


### backend\app\services\debate_engine.py

```python
"""
Debate Engine - Core orchestration logic for multi-agent review.

Flow:
1. Initial: All actors answer the question in parallel
2. Review/Revision Loop:
   - Each actor reviews others' answers
   - Each actor revises based on reviews
   - Check for convergence
   - If converged or max rounds reached, exit loop
3. Summary: Judge synthesizes final conclusion

All prompts are loaded from database via PromptService.
"""

import asyncio
import json
import logging
from typing import Optional, Callable
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import (
    Actor,
    DebateSession,
    DebateSessionActor,
    Round as DBRound,
    Message,
    SessionStatus,
)
from app.services.llm_adapter import create_adapter, LLMAdapter
from app.services.prompt_service import PromptService, PromptError
from app.services.convergence_service import check_convergence, ConvergenceResult
from app.services.semantic_service import SemanticService
from app.services.prompt_serializer import BlockPhase

logger = logging.getLogger('magi.debate_engine')
logger.setLevel(logging.DEBUG)

if not logger.handlers:
    file_handler = logging.FileHandler('magi_debug.log', encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(file_handler)
logger.propagate = False


class DebateEngine:
    """Core debate orchestration engine"""

    def __init__(
        self,
        db: AsyncSession,
        session: DebateSession,
        event_queue: Optional[asyncio.Queue] = None,
        is_cancelled: Optional[Callable[[], bool]] = None,
    ):
        self.db = db
        self.session = session
        self.event_queue = event_queue
        self.is_cancelled = is_cancelled
        self.actors: list[Actor] = []
        self.actor_responses: dict[str, list[dict]] = {}  # actor_id -> list of messages
        self.prompt_service = PromptService(db)
        self.semantic_service = SemanticService(db, self.prompt_service)
        self.step_number = 0  # Global step counter for phases
        self.question_intent = None  # Store question intent analysis result
        self.latest_semantic_comparisons = []  # Store latest semantic comparisons

    def _check_cancelled(self) -> bool:
        """Check if the debate should be cancelled."""
        if self.is_cancelled:
            return self.is_cancelled()
        return False

    async def _emit(self, event: dict):
        """Emit an event to the queue if available."""
        if self.event_queue:
            await self.event_queue.put(event)

    async def load_actors(self):
        """Load actors for this session"""
        result = await self.db.execute(
            select(Actor)
            .join(DebateSessionActor)
            .where(DebateSessionActor.session_id == self.session.id)
        )
        self.actors = list(result.scalars().all())

        for actor in self.actors:
            self.actor_responses[actor.id] = []

    def get_adapter(self, actor: Actor) -> LLMAdapter:
        """Create LLM adapter for an actor"""
        return create_adapter(
            provider=actor.provider.value,
            api_key=actor.api_key,
            base_url=actor.base_url,
            model=actor.model,
        )

    async def run_debate(self):
        """Run the full debate and emit events to queue."""
        logger.info(f"=== run_debate START, session_id={self.session.id} ===")

        try:
            # Initialize prompt service
            await self.prompt_service.load_templates()
            await self.prompt_service.load_presets()

            # Update status
            self.session.status = SessionStatus.DEBATING
            await self.db.commit()

            # Load actors
            await self.load_actors()

            if len(self.actors) < 2:
                await self._emit({"event": "debate_error", "data": {"message": "Need at least 2 actors for review"}})
                return

            # Check cancellation before initial round
            if self._check_cancelled():
                logger.info(f"Session {self.session.id} cancelled before initial round")
                return

            # ===== INITIAL ROUND =====
            self.step_number = 1
            await self._emit({
                "event": "phase_start",
                "data": {
                    "step": self.step_number,
                    "phase": "initial",
                    "round": 1,
                }
            })

            initial_round = DBRound(
                session_id=self.session.id,
                round_number=1,
                phase="initial",
            )
            self.db.add(initial_round)
            await self.db.commit()
            await self.db.refresh(initial_round)

            await self._run_initial_round(initial_round)

            if self._check_cancelled():
                return

            await self._emit({
                "event": "phase_end",
                "data": {"step": self.step_number, "phase": "initial"}
            })

            # Run semantic analysis in background - don't block the main flow
            # Semantic analysis is for UI enrichment, not critical for debate logic
            asyncio.create_task(self._run_semantic_analysis_safe(round_number=1, phase="initial"))

            # ===== REVIEW/REVISION CYCLES =====
            max_cycles = self.session.max_rounds or 3
            converged = False
            last_convergence_result: Optional[ConvergenceResult] = None

            for cycle in range(1, max_cycles + 1):
                if self._check_cancelled():
                    logger.info(f"Session {self.session.id} cancelled during cycle {cycle}")
                    return

                # --- Review Phase ---
                self.step_number += 1
                await self._emit({
                    "event": "phase_start",
                    "data": {
                        "step": self.step_number,
                        "phase": "review",
                        "cycle": cycle,
                    }
                })

                review_round = DBRound(
                    session_id=self.session.id,
                    round_number=self.step_number,  # Sequential numbering
                    phase="review",
                )
                self.db.add(review_round)
                await self.db.commit()
                await self.db.refresh(review_round)

                await self._run_review_round(cycle, review_round)

                if self._check_cancelled():
                    return

                await self._emit({
                    "event": "phase_end",
                    "data": {"step": self.step_number, "phase": "review", "cycle": cycle}
                })

                # --- Revision Phase ---
                self.step_number += 1
                await self._emit({
                    "event": "phase_start",
                    "data": {
                        "step": self.step_number,
                        "phase": "revision",
                        "cycle": cycle,
                    }
                })

                revision_round = DBRound(
                    session_id=self.session.id,
                    round_number=self.step_number,  # Sequential numbering
                    phase="revision",
                )
                self.db.add(revision_round)
                await self.db.commit()
                await self.db.refresh(revision_round)

                await self._run_revision_round(cycle, review_round, revision_round)

                if self._check_cancelled():
                    return

                await self._emit({
                    "event": "phase_end",
                    "data": {"step": self.step_number, "phase": "revision", "cycle": cycle}
                })

                # Run semantic analysis in background - don't block the main flow
                asyncio.create_task(self._run_semantic_analysis_safe(
                    round_number=self.step_number,
                    phase="revision",
                    cycle=cycle,
                ))

                # --- Convergence Check ---
                if self.session.auto_stop:
                    last_convergence_result = await self._check_convergence()

                    await self._emit({
                        "event": "convergence_result",
                        "data": {
                            "cycle": cycle,
                            **last_convergence_result.to_dict()
                        }
                    })

                    if last_convergence_result.converged:
                        logger.info(f"Session {self.session.id} converged at cycle {cycle}")
                        converged = True
                        break

            # ===== FINAL ANSWER PHASE =====
            if self._check_cancelled():
                return

            self.step_number += 1
            await self._emit({
                "event": "phase_start",
                "data": {
                    "step": self.step_number,
                    "phase": "final_answer",
                }
            })

            await self._run_final_answer_phase(last_convergence_result)

            if self._check_cancelled():
                return

            await self._emit({
                "event": "phase_end",
                "data": {"step": self.step_number, "phase": "final_answer"}
            })

            # ===== SUMMARY PHASE =====
            if self._check_cancelled():
                return

            self.session.status = SessionStatus.JUDGING
            await self.db.commit()

            self.step_number += 1
            await self._emit({
                "event": "phase_start",
                "data": {
                    "step": self.step_number,
                    "phase": "summary",
                }
            })

            await self._run_summary_phase(last_convergence_result)

            # Complete
            self.session.status = SessionStatus.COMPLETED
            self.session.completed_at = datetime.now(timezone.utc)
            await self.db.commit()

            await self._emit({
                "event": "complete",
                "data": {
                    "session_id": self.session.id,
                    "total_tokens": self.session.total_tokens,
                    "converged": converged,
                },
            })

        except PromptError as e:
            logger.error(f"Prompt error: {e}")
            await self._emit({"event": "debate_error", "data": {"message": str(e)}})
            self.session.status = SessionStatus.STOPPED
            await self.db.commit()

        except asyncio.CancelledError:
            logger.info(f"Session {self.session.id} was cancelled")
            self.session.status = SessionStatus.STOPPED
            await self.db.commit()
            await self._emit({"event": "cancelled", "data": {"session_id": self.session.id}})

        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error(f"Session {self.session.id} failed: {e}")
            await self._emit({"event": "debate_error", "data": {"message": str(e)}})
            self.session.status = SessionStatus.STOPPED
            await self.db.commit()

    async def _run_initial_round(self, db_round: DBRound):
        """Run initial round where each actor answers the question with real streaming"""
        logger.info(f"_run_initial_round START, actors count: {len(self.actors)}")

        async def actor_response_stream(actor: Actor):
            """Stream response from an actor, emitting tokens in real-time"""
            logger.info(f"actor_response START for actor: {actor.name}")

            # Emit actor_start with full metadata
            await self._emit({
                "event": "actor_start",
                "data": {
                    "actor_id": actor.id,
                    "actor_name": actor.name,
                    "actor_icon": actor.icon,
                    "actor_color": actor.display_color,
                    "phase": "initial",
                    "step": self.step_number,
                }
            })

            try:
                adapter = self.get_adapter(actor)
                logger.info(f"Created adapter: {type(adapter).__name__}")

                # Build system prompt from actor config
                system_prompt = actor.system_prompt or f"You are {actor.name}, an AI assistant."
                if actor.custom_instructions:
                    system_prompt += f"\n\n{actor.custom_instructions}"

                # Get initial answer prompt from PromptService - NO fallback
                initial_prompt = await self.prompt_service.get_initial_answer_prompt(
                    question=self.session.question,
                    actor_name=actor.name,
                    actor_custom_prompt=None,  # Already included in system_prompt above
                )

                full_response = ""
                logger.info(f"Calling stream_completion for {actor.name}...")

                # Real streaming: emit each token
                async for token in adapter.stream_completion(
                    messages=[{"role": "user", "content": initial_prompt}],
                    system_prompt=system_prompt,
                    max_tokens=actor.max_tokens,
                    temperature=actor.temperature,
                ):
                    full_response += token
                    await self._emit({
                        "event": "token",
                        "data": {
                            "actor_id": actor.id,
                            "content": token,
                            "phase": "initial",
                        }
                    })

                logger.info(f"stream_completion DONE for {actor.name}, response length: {len(full_response)}")

                # Emit actor_end
                await self._emit({
                    "event": "actor_end",
                    "data": {
                        "actor_id": actor.id,
                        "phase": "initial",
                        "input_tokens": 0,
                        "output_tokens": 0,
                    }
                })

                return actor.id, full_response

            except Exception as e:
                logger.error(f"actor_response FAILED for {actor.name}: {e}", exc_info=True)
                await self._emit({"event": "debate_error", "data": {"message": f"Actor {actor.name} failed: {str(e)}"}})
                raise

        # Run all actors in parallel with real streaming
        tasks = [actor_response_stream(actor) for actor in self.actors]
        logger.info(f"Created {len(tasks)} streaming tasks for actors")

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Store messages AFTER all parallel tasks complete (sequential DB writes)
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Actor {self.actors[i].name} failed: {result}")
            elif isinstance(result, tuple):
                actor_id, full_response = result
                message = Message(
                    round_id=db_round.id,
                    actor_id=actor_id,
                    role="answer",
                    content=full_response,
                )
                self.db.add(message)
                # Track for later rounds
                self.actor_responses[actor_id].append({
                    "role": "answer",
                    "content": full_response,
                    "cycle": 0,
                })

        # Commit all messages at once
        await self.db.commit()

    async def _run_review_round(self, cycle: int, db_round: DBRound):
        """Run review round where each actor critiques others' answers"""
        phase = BlockPhase.INITIAL if cycle == 1 else BlockPhase.REVISION

        # Get latest answers from each actor
        latest_answers = {}
        for actor in self.actors:
            responses = self.actor_responses.get(actor.id, [])
            for r in reversed(responses):
                if r.get("role") in ["answer", "revision"]:
                    latest_answers[actor.id] = r["content"]
                    break

        async def actor_review_stream(actor: Actor):
            """Stream review from an actor with real-time token emission"""
            adapter = self.get_adapter(actor)

            await self._emit({
                "event": "actor_start",
                "data": {
                    "actor_id": actor.id,
                    "actor_name": actor.name,
                    "actor_icon": actor.icon,
                    "actor_color": actor.display_color,
                    "phase": "review",
                    "step": self.step_number,
                    "cycle": cycle,
                }
            })

            # Build self answer block
            my_answer = latest_answers.get(actor.id, "")
            self_answer_block = self.prompt_service.build_self_answer_block(
                actor_name=actor.name,
                content=my_answer,
                phase=phase,
            )

            # Build peer answer blocks
            peer_answers = []
            for aid, content in latest_answers.items():
                if aid != actor.id:
                    other_actor = next((a for a in self.actors if a.id == aid), None)
                    if other_actor:
                        peer_answers.append({
                            "actor_name": other_actor.name,
                            "content": content,
                        })

            peer_answer_blocks = self.prompt_service.build_peer_answer_blocks(
                answers=peer_answers,
                phase=phase,
            )

            # Build review prompt using prompt_service - NO fallback allowed
            system_prompt = actor.review_prompt or f"You are {actor.name}. Provide a critical review."
            if actor.custom_instructions:
                system_prompt += f"\n\n{actor.custom_instructions}"

            review_prompt = await self.prompt_service.get_review_prompt(
                question=self.session.question,
                self_actor_name=actor.name,
                self_answer_block=self_answer_block,
                peer_answer_blocks=peer_answer_blocks,
            )

            full_response = ""
            async for token in adapter.stream_completion(
                messages=[{"role": "user", "content": review_prompt}],
                system_prompt=system_prompt,
                max_tokens=actor.max_tokens,
                temperature=actor.temperature,
            ):
                full_response += token
                await self._emit({
                    "event": "token",
                    "data": {
                        "actor_id": actor.id,
                        "content": token,
                        "phase": "review",
                    }
                })

            await self._emit({
                "event": "actor_end",
                "data": {
                    "actor_id": actor.id,
                    "phase": "review",
                    "cycle": cycle,
                }
            })

            return actor.id, full_response

        tasks = [actor_review_stream(actor) for actor in self.actors]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Store messages AFTER all parallel tasks complete
        for result in results:
            if isinstance(result, tuple):
                actor_id, full_response = result
                message = Message(
                    round_id=db_round.id,
                    actor_id=actor_id,
                    role="review",
                    content=full_response,
                )
                self.db.add(message)
                self.actor_responses[actor_id].append({
                    "role": "review",
                    "content": full_response,
                    "cycle": cycle,
                })

        await self.db.commit()

    async def _run_revision_round(self, cycle: int, review_round: DBRound, db_round: DBRound):
        """Run revision round where actors improve their answers"""
        phase = BlockPhase.INITIAL if cycle == 1 else BlockPhase.REVISION

        # Get review messages
        result = await self.db.execute(
            select(Message).where(Message.round_id == review_round.id)
        )
        review_messages = list(result.scalars().all())

        # Get latest answers
        latest_answers = {}
        for actor in self.actors:
            responses = self.actor_responses.get(actor.id, [])
            for r in reversed(responses):
                if r.get("role") in ["answer", "revision"]:
                    latest_answers[actor.id] = r["content"]
                    break

        async def actor_revision_stream(actor: Actor):
            """Stream revised response from an actor"""
            adapter = self.get_adapter(actor)

            await self._emit({
                "event": "actor_start",
                "data": {
                    "actor_id": actor.id,
                    "actor_name": actor.name,
                    "actor_icon": actor.icon,
                    "actor_color": actor.display_color,
                    "phase": "revision",
                    "step": self.step_number,
                    "cycle": cycle,
                }
            })

            # Build self previous answer block
            my_answer = latest_answers.get(actor.id, "")
            self_previous_answer_block = self.prompt_service.build_self_answer_block(
                actor_name=actor.name,
                content=my_answer,
                phase=phase,
            )

            # Build peer review blocks (reviews about this actor)
            peer_reviews = []
            for msg in review_messages:
                if msg.actor_id != actor.id:
                    other_actor = next((a for a in self.actors if a.id == msg.actor_id), None)
                    if other_actor:
                        peer_reviews.append({
                            "reviewer_name": other_actor.name,
                            "about_actor_name": actor.name,
                            "content": msg.content,
                        })

            peer_review_blocks = self.prompt_service.build_peer_review_blocks(
                reviews=peer_reviews,
                phase=phase,
            )

            # Build revision prompt using prompt_service - NO fallback allowed
            system_prompt = actor.revision_prompt or f"You are {actor.name}. Revise based on feedback."
            if actor.custom_instructions:
                system_prompt += f"\n\n{actor.custom_instructions}"

            revision_prompt = await self.prompt_service.get_revision_prompt(
                question=self.session.question,
                self_actor_name=actor.name,
                self_previous_answer_block=self_previous_answer_block,
                peer_review_blocks=peer_review_blocks,
            )

            full_response = ""
            async for token in adapter.stream_completion(
                messages=[{"role": "user", "content": revision_prompt}],
                system_prompt=system_prompt,
                max_tokens=actor.max_tokens,
                temperature=actor.temperature,
            ):
                full_response += token
                await self._emit({
                    "event": "token",
                    "data": {
                        "actor_id": actor.id,
                        "content": token,
                        "phase": "revision",
                    }
                })

            await self._emit({
                "event": "actor_end",
                "data": {
                    "actor_id": actor.id,
                    "phase": "revision",
                    "cycle": cycle,
                }
            })

            return actor.id, full_response

        tasks = [actor_revision_stream(actor) for actor in self.actors]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Store messages AFTER all parallel tasks complete
        for result in results:
            if isinstance(result, tuple):
                actor_id, full_response = result
                message = Message(
                    round_id=db_round.id,
                    actor_id=actor_id,
                    role="revision",
                    content=full_response,
                )
                self.db.add(message)
                self.actor_responses[actor_id].append({
                    "role": "revision",
                    "content": full_response,
                    "cycle": cycle,
                })

        await self.db.commit()

    async def _check_convergence(self) -> ConvergenceResult:
        """Check if responses have converged."""
        # Get latest answers
        latest_answers = {}
        for actor in self.actors:
            responses = self.actor_responses.get(actor.id, [])
            for r in reversed(responses):
                if r.get("role") in ["answer", "revision"]:
                    latest_answers[actor.id] = r["content"]
                    break

        return await check_convergence(
            db=self.db,
            judge_actor_id=self.session.judge_actor_id,
            question=self.session.question,
            responses=latest_answers,
            threshold=self.session.convergence_threshold or 0.85,
            prompt_service=self.prompt_service,  # REQUIRED - no hardcoded prompts
        )

    async def _run_semantic_analysis_safe(self, round_number: int, phase: str, cycle: int = 0):
        """
        Safe wrapper for semantic analysis that runs in background.

        This method catches all exceptions to prevent background task failures
        from affecting the main debate flow. Semantic analysis is optional
        enrichment for the UI and should not block or crash the debate.
        """
        try:
            await self._run_semantic_analysis(round_number, phase, cycle)
        except asyncio.CancelledError:
            logger.info(f"Semantic analysis cancelled for round {round_number}, phase {phase}")
        except Exception as e:
            # Log but don't propagate - semantic analysis is optional
            logger.error(f"Semantic analysis failed (non-blocking): {e}", exc_info=True)

    async def _run_semantic_analysis(self, round_number: int, phase: str, cycle: int = 0):
        """
        Run semantic analysis on the latest responses with parallel execution.

        This method:
        1. Analyzes question intent (first time only)
        2. Extracts semantic topics from each actor's response (parallel)
        3. Compares topics across actors
        4. Emits semantic_comparison event with canonical phase_id

        Args:
            round_number: The step number for this phase
            phase: Phase name (initial, review, revision, final_answer, summary)
            cycle: Cycle number for revision phases (1-indexed)
        """
        logger.info(f"Running semantic analysis for round {round_number}, phase {phase}, cycle {cycle}")

        try:
            # Get judge actor for semantic analysis
            result = await self.db.execute(
                select(Actor).where(Actor.id == self.session.judge_actor_id)
            )
            judge = result.scalar_one_or_none()

            if not judge:
                logger.warning("Judge actor not found for semantic analysis, skipping")
                return

            adapter = self.get_adapter(judge)

            # Step 1: Analyze question intent (only once) - with timeout
            if not self.question_intent:
                logger.info("Analyzing question intent...")
                try:
                    self.question_intent = await asyncio.wait_for(
                        self.semantic_service.analyze_question_intent(
                            question=self.session.question,
                            adapter=adapter,
                        ),
                        timeout=60.0  # 60 second timeout
                    )
                    # Save to database
                    await self.semantic_service.save_question_intent(
                        session_id=self.session.id,
                        result=self.question_intent,
                    )
                    logger.info(f"Question intent analyzed: {len(self.question_intent.comparison_axes)} axes")
                except asyncio.TimeoutError:
                    logger.warning("Question intent analysis timed out, using defaults")
                    # Use default comparison axes
                    self.question_intent = type('QuestionIntentResult', (), {
                        'question_type': 'general',
                        'user_goal': '',
                        'time_horizons': [],
                        'comparison_axes': [
                            {"axis_id": "main_topic", "label": "核心观点"},
                            {"axis_id": "approach", "label": "解决思路"},
                        ]
                    })()
                except Exception as e:
                    logger.error(f"Question intent analysis failed: {e}")
                    # Use default comparison axes
                    self.question_intent = type('QuestionIntentResult', (), {
                        'question_type': 'general',
                        'user_goal': '',
                        'time_horizons': [],
                        'comparison_axes': [
                            {"axis_id": "main_topic", "label": "核心观点"},
                            {"axis_id": "approach", "label": "解决思路"},
                        ]
                    })()

            # Step 2: Extract semantic topics from each actor's latest response (parallel)
            latest_answers = {}
            for actor in self.actors:
                responses = self.actor_responses.get(actor.id, [])
                for r in reversed(responses):
                    if r.get("role") in ["answer", "revision"]:
                        latest_answers[actor.id] = r["content"]
                        break

            if not latest_answers:
                logger.warning("No answers found for semantic analysis")
                return

            # Parallel topic extraction using asyncio.gather with timeout
            async def extract_topics_for_actor(actor: Actor):
                content = latest_answers.get(actor.id, "")
                if not content:
                    return actor.id, []

                logger.info(f"Extracting topics for actor {actor.name}...")
                try:
                    topics = await asyncio.wait_for(
                        self.semantic_service.extract_semantic_topics(
                            question=self.session.question,
                            answer=content,
                            comparison_axes=self.question_intent.comparison_axes,
                            actor_id=actor.id,
                            adapter=adapter,
                        ),
                        timeout=30.0  # 30 second timeout per actor
                    )
                    return actor.id, topics
                except asyncio.TimeoutError:
                    logger.warning(f"Topic extraction timed out for actor {actor.name}")
                    return actor.id, []
                except Exception as e:
                    logger.error(f"Topic extraction failed for actor {actor.name}: {e}")
                    return actor.id, []

            extraction_tasks = [extract_topics_for_actor(actor) for actor in self.actors]
            extraction_results = await asyncio.gather(*extraction_tasks, return_exceptions=True)

            topics_by_actor = {}
            for result in extraction_results:
                if isinstance(result, tuple):
                    actor_id, topics = result
                    topics_by_actor[actor_id] = topics
                    # Save to database
                    if topics:
                        try:
                            await self.semantic_service.save_semantic_topics(
                                session_id=self.session.id,
                                round_number=round_number,
                                phase=phase,
                                actor_id=actor_id,
                                topics=topics,
                                cycle=cycle,
                            )
                        except Exception as e:
                            logger.error(f"Failed to save semantic topics: {e}")
                elif isinstance(result, Exception):
                    logger.error(f"Topic extraction task failed: {result}")

            # Step 3: Compare topics across actors
            if len(topics_by_actor) >= 2:
                logger.info("Comparing topics across actors...")
                try:
                    comparisons = await asyncio.wait_for(
                        self.semantic_service.compare_actors(
                            question=self.session.question,
                            topics_by_actor=topics_by_actor,
                            actors=self.actors,
                            adapter=adapter,
                        ),
                        timeout=60.0  # 60 second timeout
                    )

                    # Save to database
                    if comparisons:
                        await self.semantic_service.save_semantic_comparisons(
                            session_id=self.session.id,
                            round_number=round_number,
                            phase=phase,
                            comparisons=comparisons,
                            cycle=cycle,
                        )

                    self.latest_semantic_comparisons = comparisons

                    # Emit semantic_comparison event with canonical phase_id
                    phase_id = f"{round_number}:{phase}"
                    if phase == "revision" and cycle:
                        phase_id = f"{round_number}:{phase}:{cycle}"

                    comparison_data = [
                        {
                            "topic_id": c.topic_id,
                            "label": c.label,
                            "salience": c.salience,
                            "disagreement_score": c.disagreement_score,
                            "status": c.status,
                            "difference_types": c.difference_types,
                            "agreement_summary": c.agreement_summary,
                            "disagreement_summary": c.disagreement_summary,
                            "actor_positions": [
                                {
                                    "actor_id": p.actor_id,
                                    "actor_name": p.actor_name,
                                    "stance_label": p.stance_label,
                                    "summary": p.summary,
                                    "quotes": p.quotes,
                                }
                                for p in c.actor_positions
                            ],
                        }
                        for c in comparisons
                    ]

                    await self._emit({
                        "event": "semantic_comparison",
                        "data": {
                            "phase_id": phase_id,
                            "round_number": round_number,
                            "phase": phase,
                            "cycle": cycle,
                            "question_intent": {
                                "question_type": self.question_intent.question_type,
                                "user_goal": self.question_intent.user_goal,
                                "time_horizons": self.question_intent.time_horizons,
                                "comparison_axes": self.question_intent.comparison_axes,
                            },
                            "comparisons": comparison_data,
                        }
                    })

                    logger.info(f"Semantic analysis complete: {len(comparisons)} topics analyzed")

                except asyncio.TimeoutError:
                    logger.warning("Topic comparison timed out")
                except Exception as e:
                    logger.error(f"Topic comparison failed: {e}")
            else:
                logger.info(f"Not enough actors with topics ({len(topics_by_actor)}), skipping comparison")

        except Exception as e:
            logger.error(f"Semantic analysis failed: {e}", exc_info=True)
            # Don't fail the debate if semantic analysis fails

    async def _run_final_answer_phase(self, convergence_result: Optional[ConvergenceResult] = None):
        """Run final answer phase where judge outputs a user-facing final answer."""

        # Get judge actor
        result = await self.db.execute(
            select(Actor).where(Actor.id == self.session.judge_actor_id)
        )
        judge = result.scalar_one_or_none()

        if not judge:
            await self._emit({"event": "debate_error", "data": {"message": "Judge actor not found"}})
            return

        adapter = self.get_adapter(judge)

        # Get latest answers from each actor
        latest_answers = {}
        for actor in self.actors:
            responses = self.actor_responses.get(actor.id, [])
            for r in reversed(responses):
                if r.get("role") in ["answer", "revision"]:
                    latest_answers[actor.id] = r["content"]
                    break

        # Build actor answer blocks
        actor_answers = []
        for actor in self.actors:
            content = latest_answers.get(actor.id, "")
            actor_answers.append({
                "actor_name": actor.name,
                "content": content,
            })

        actor_answer_blocks = self.prompt_service.build_latest_answer_blocks(actor_answers)

        # Build convergence info
        convergence_info = ""
        if convergence_result:
            convergence_info = f"""
## 收敛分析结果

共识度: {round(convergence_result.score * 100)}%
是否已收敛: {"是" if convergence_result.converged else "否"}

已达成共识的观点:
{chr(10).join(f"- {a}" for a in convergence_result.agreements) if convergence_result.agreements else "- 无"}

仍存在分歧的观点:
{chr(10).join(f"- {d}" for d in convergence_result.disagreements) if convergence_result.disagreements else "- 无"}

分析理由: {convergence_result.reason}
"""

        # Create DB round for final_answer
        final_round = DBRound(
            session_id=self.session.id,
            round_number=self.step_number,
            phase="final_answer",
        )
        self.db.add(final_round)
        await self.db.commit()
        await self.db.refresh(final_round)

        # Build final answer prompt using prompt_service - NO fallback allowed
        system_prompt = judge.system_prompt or "你是一个专业的综合决策助手，输出简洁明了的最终回答。"

        final_answer_prompt = await self.prompt_service.get_final_answer_prompt(
            question=self.session.question,
            self_actor_name=judge.name,
            actor_answer_blocks=actor_answer_blocks,
            convergence_info=convergence_info,
        )

        # Emit actor_start with judge's info
        await self._emit({
            "event": "actor_start",
            "data": {
                "actor_id": judge.id,
                "actor_name": judge.name,
                "actor_icon": judge.icon,
                "actor_color": judge.display_color,
                "phase": "final_answer",
                "step": self.step_number,
            }
        })

        full_response = ""
        async for token in adapter.stream_completion(
            messages=[{"role": "user", "content": final_answer_prompt}],
            system_prompt=system_prompt,
            max_tokens=judge.max_tokens,
            temperature=0.3,
        ):
            full_response += token
            await self._emit({
                "event": "token",
                "data": {
                    "actor_id": judge.id,
                    "content": token,
                    "phase": "final_answer",
                }
            })

        # Store message
        message = Message(
            round_id=final_round.id,
            actor_id=judge.id,
            role="final_answer",
            content=full_response,
        )
        self.db.add(message)
        await self.db.commit()

        # Track in actor_responses
        if judge.id not in self.actor_responses:
            self.actor_responses[judge.id] = []
        self.actor_responses[judge.id].append({
            "role": "final_answer",
            "content": full_response,
            "cycle": 0,
        })

        await self._emit({
            "event": "actor_end",
            "data": {
                "actor_id": judge.id,
                "phase": "final_answer",
            }
        })

    async def _run_summary_phase(self, convergence_result: Optional[ConvergenceResult] = None):
        """Run summary phase to synthesize final conclusion

        Note: convergence_result is currently unused but kept for potential
        future integration with summary templates.
        """
        # Get judge actor
        result = await self.db.execute(
            select(Actor).where(Actor.id == self.session.judge_actor_id)
        )
        judge = result.scalar_one_or_none()

        if not judge:
            await self._emit({"event": "debate_error", "data": {"message": "Judge actor not found"}})
            return

        adapter = self.get_adapter(judge)

        # Build history blocks with actor attribution
        history_items = []
        for actor in self.actors:
            responses = self.actor_responses.get(actor.id, [])
            for r in responses:
                role = r.get("role", "response")
                history_items.append({
                    "actor_name": actor.name,
                    "role": role,
                    "cycle": r.get("cycle", 0),
                    "content": r.get("content", ""),
                })

        history_blocks = self.prompt_service.build_history_blocks(
            history_items=history_items,
            self_actor_name=judge.name,
        )

        system_prompt = judge.system_prompt or "You are an impartial Meta Judge synthesizing multi-agent reviews. Always respond with valid JSON."

        # Create DB round for summary
        summary_round = DBRound(
            session_id=self.session.id,
            round_number=self.step_number,
            phase="summary",
        )
        self.db.add(summary_round)
        await self.db.commit()
        await self.db.refresh(summary_round)

        # Build summary prompt using prompt_service - NO fallback allowed
        summary_prompt = await self.prompt_service.get_summary_prompt(
            question=self.session.question,
            self_actor_name=judge.name,
            history_blocks=history_blocks,
        )

        # Emit judge start with judge's actual id
        await self._emit({
            "event": "actor_start",
            "data": {
                "actor_id": judge.id,
                "actor_name": judge.name,
                "actor_icon": judge.icon,
                "actor_color": judge.display_color,
                "phase": "summary",
                "step": self.step_number,
            }
        })

        full_response = ""
        async for token in adapter.stream_completion(
            messages=[{"role": "user", "content": summary_prompt}],
            system_prompt=system_prompt,
            max_tokens=judge.max_tokens,
            temperature=0.3,
        ):
            full_response += token
            await self._emit({
                "event": "token",
                "data": {
                    "actor_id": judge.id,
                    "content": token,
                    "phase": "summary",
                }
            })

        # Parse JSON response with retry logic
        consensus = None
        parse_success = False

        # First attempt
        try:
            json_start = full_response.find("{")
            json_end = full_response.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = full_response[json_start:json_end]
                consensus = json.loads(json_str)
                parse_success = True
        except json.JSONDecodeError:
            pass

        # If first attempt failed, try a more structured retry with context
        if not parse_success:
            logger.warning(f"Summary JSON parse failed, attempting retry with stricter prompt")
            retry_prompt = f"""Based on this multi-agent review, provide ONLY a valid JSON object with no additional text.

Original Question: {self.session.question}

The previous response could not be parsed. Please provide ONLY a valid JSON object:
{{
  "summary": "Brief summary of conclusions",
  "agreements": ["point 1", "point 2"],
  "disagreements": ["point 1"],
  "confidence": <0.0-1.0 or omit if uncertain>,
  "recommendation": "Brief recommendation"
}}"""

            retry_response = ""
            async for token in adapter.stream_completion(
                messages=[{"role": "user", "content": retry_prompt}],
                system_prompt="You are a JSON generator. Output ONLY valid JSON, no other text.",
                max_tokens=512,
                temperature=0.1,
            ):
                retry_response += token

            try:
                json_start = retry_response.find("{")
                json_end = retry_response.rfind("}") + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = retry_response[json_start:json_end]
                    consensus = json.loads(json_str)
                    parse_success = True
            except json.JSONDecodeError:
                pass

        # If still failed, return with confidence: null to indicate unavailable
        if not parse_success or consensus is None:
            consensus = {
                "summary": full_response,
                "agreements": [],
                "disagreements": [],
                "confidence": None,  # null indicates unavailable, not fake 0.5
                "recommendation": full_response,
                "confidence_unavailable": True,  # Explicit flag for frontend
            }
            logger.warning("Summary JSON parse failed after retry, confidence marked as unavailable")

        # Store message
        message = Message(
            round_id=summary_round.id,
            actor_id=judge.id,
            role="summary",
            content=full_response,
        )
        self.db.add(message)

        # Store consensus (only store confidence if valid)
        self.session.consensus_summary = consensus.get("summary", "")
        self.session.consensus_agreements = consensus.get("agreements", [])
        self.session.consensus_disagreements = consensus.get("disagreements", [])
        # Store confidence as-is (could be None if unavailable)
        confidence_value = consensus.get("confidence")
        if confidence_value is not None:
            self.session.consensus_confidence = float(confidence_value)
        else:
            self.session.consensus_confidence = None
        self.session.consensus_recommendation = consensus.get("recommendation", "")
        await self.db.commit()

        await self._emit({
            "event": "actor_end",
            "data": {
                "actor_id": judge.id,
                "phase": "summary",
            }
        })

        await self._emit({
            "event": "consensus",
            "data": consensus,
        })
```


### backend\app\services\llm_adapter.py

```python
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional
import httpx
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
import inspect
import logging

# 独立的文件 handler，避免被其他模块干扰
logger = logging.getLogger('magi.llm_adapter')
logger.setLevel(logging.DEBUG)
# 清除已有的 handlers
logger.handlers = []
# 添加文件 handler
file_handler = logging.FileHandler('magi_debug.log', encoding='utf-8')
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(file_handler)
# 阻止传播到 root logger
logger.propagate = False


class LLMAdapter(ABC):
    """Abstract base class for LLM adapters"""

    @abstractmethod
    async def stream_completion(
        self,
        messages: list[dict],
        system_prompt: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """Stream completion tokens"""
        pass

    @abstractmethod
    async def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        pass


class OpenAIAdapter(LLMAdapter):
    """OpenAI API adapter"""

    def __init__(self, api_key: str, base_url: Optional[str] = None, model: str = "gpt-4o"):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    async def stream_completion(
        self,
        messages: list[dict],
        system_prompt: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        logger.info(f"OpenAIAdapter.stream_completion START, model={self.model}")

        all_messages = []
        if system_prompt:
            all_messages.append({"role": "system", "content": system_prompt})
        all_messages.extend(messages)

        logger.info("Calling chat.completions.create with stream=True...")
        response = self.client.chat.completions.create(
            model=self.model,
            messages=all_messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )

        logger.info(f"Response type: {type(response).__name__}, has __aiter__: {hasattr(response, '__aiter__')}, is coroutine: {inspect.iscoroutine(response)}")

        # ✅ 最安全的判断顺序：先看能否直接异步迭代，再考虑 await
        if hasattr(response, '__aiter__'):
            # AsyncStream / async_generator / 任何 async iterable → 直接迭代
            logger.info("Response has __aiter__, using directly")
            stream = response
        elif hasattr(response, '__await__') or inspect.iscoroutine(response):
            # coroutine 或 awaitable → await 后再迭代
            logger.info("Response is awaitable, awaiting...")
            stream = await response
            logger.info(f"After await, stream type: {type(stream).__name__}")
        else:
            # 不应该到这里
            raise TypeError(f"Unexpected response type: {type(response)}")

        logger.info("Starting async iteration...")
        try:
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            logger.info("Async iteration completed")
        except Exception as e:
            logger.error(f"OpenAIAdapter stream error: {e}", exc_info=True)
            raise

    async def count_tokens(self, text: str) -> int:
        return len(text) // 4


class AnthropicAdapter(LLMAdapter):
    """Anthropic Claude API adapter"""

    def __init__(self, api_key: str, base_url: Optional[str] = None, model: str = "claude-sonnet-4-20250514"):
        self.client = AsyncAnthropic(api_key=api_key, base_url=base_url)
        self.model = model

    async def stream_completion(
        self,
        messages: list[dict],
        system_prompt: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        logger.info(f"AnthropicAdapter.stream_completion START, model={self.model}")

        kwargs = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": messages,
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        stream = self.client.messages.stream(**kwargs)

        async with stream as event_stream:
            async for text in event_stream.text_stream:
                yield text

    async def count_tokens(self, text: str) -> int:
        result = await self.client.messages.count_tokens(
            model=self.model,
            messages=[{"role": "user", "content": text}]
        )
        return result.input_tokens


class CustomAdapter(LLMAdapter):
    """Custom OpenAI-compatible API adapter"""

    def __init__(self, api_key: str, base_url: str, model: str):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    async def stream_completion(
        self,
        messages: list[dict],
        system_prompt: str = "",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        logger.info(f"CustomAdapter.stream_completion START, model={self.model}, base_url={self.client.base_url}")

        all_messages = []
        if system_prompt:
            all_messages.append({"role": "system", "content": system_prompt})
        all_messages.extend(messages)

        logger.info("Calling chat.completions.create with stream=True...")
        response = self.client.chat.completions.create(
            model=self.model,
            messages=all_messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )

        logger.info(f"Response type: {type(response).__name__}, has __aiter__: {hasattr(response, '__aiter__')}, is coroutine: {inspect.iscoroutine(response)}, is async gen: {inspect.isasyncgen(response)}")

        # ✅ 最安全的判断顺序：先看能否直接异步迭代，再考虑 await
        if hasattr(response, '__aiter__'):
            # AsyncStream / async_generator / 任何 async iterable → 直接迭代
            logger.info("Response has __aiter__, using directly")
            stream = response
        elif hasattr(response, '__await__') or inspect.iscoroutine(response):
            # coroutine 或 awaitable → await 后再迭代
            logger.info("Response is awaitable, awaiting...")
            stream = await response
            logger.info(f"After await, stream type: {type(stream).__name__}")
        else:
            # 不应该到这里
            raise TypeError(f"Unexpected response type: {type(response)}")

        logger.info("Starting async iteration...")
        try:
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
            logger.info("Async iteration completed")
        except Exception as e:
            logger.error(f"CustomAdapter stream error: {e}", exc_info=True)
            raise

    async def count_tokens(self, text: str) -> int:
        return len(text) // 4


def create_adapter(
    provider: str,
    api_key: str,
    base_url: Optional[str],
    model: str,
) -> LLMAdapter:
    """Factory function to create appropriate LLM adapter"""
    logger.info(f"create_adapter called: provider={provider}, model={model}, base_url={base_url}")
    if provider == "openai":
        return OpenAIAdapter(api_key=api_key, base_url=base_url, model=model)
    elif provider == "anthropic":
        return AnthropicAdapter(api_key=api_key, base_url=base_url, model=model)
    else:
        if not base_url:
            raise ValueError("base_url is required for custom provider")
        return CustomAdapter(api_key=api_key, base_url=base_url, model=model)
```


### backend\app\services\prompt_serializer.py

```python
"""
Prompt Serializer - Unified block serialization for self/peer disambiguation.

This module provides structured XML-like blocks for LLM context, ensuring:
1. All answers/reviews have explicit actor attribution
2. Self vs peer materials are structurally symmetric
3. No hardcoded model names in templates
"""

from typing import Optional
from enum import Enum


class BlockPhase(str, Enum):
    """Phase of the debate."""
    INITIAL = "initial"
    REVISION = "revision"
    FINAL = "final"


class BlockRole(str, Enum):
    """Role of the actor relative to the block content."""
    SELF = "self"       # The current actor's own content
    PEER = "peer"       # Another actor's content


def serialize_answer_block(
    actor_name: str,
    phase: BlockPhase,
    role: BlockRole,
    content: str,
) -> str:
    """
    Serialize an answer block with full actor attribution.

    Args:
        actor_name: The name of the actor who produced this answer
        phase: The debate phase (initial, revision, final)
        role: Whether this is self (current actor) or peer (other actor)
        content: The answer text

    Returns:
        XML-like block string with actor attribution

    Example output:
        <answer actor_name="GLM" phase="initial" role="self">
        ...content...
        </answer>
    """
    return f'''<answer actor_name="{actor_name}" phase="{phase.value}" role="{role.value}">
{content}
</answer>'''


def serialize_review_block(
    reviewer_name: str,
    about_actor_name: str,
    phase: BlockPhase,
    content: str,
) -> str:
    """
    Serialize a review block with full attribution.

    Args:
        reviewer_name: The name of the actor who wrote the review
        about_actor_name: The name of the actor being reviewed
        phase: The debate phase
        content: The review text

    Returns:
        XML-like block string with full attribution

    Example output:
        <review reviewer_name="DeepSeek" about_actor="GLM" phase="initial">
        ...content...
        </review>
    """
    return f'''<review reviewer_name="{reviewer_name}" about_actor="{about_actor_name}" phase="{phase.value}">
{content}
</review>'''


def serialize_answer_blocks(
    answers: list[dict],
    self_actor_name: str,
    phase: BlockPhase,
) -> str:
    """
    Serialize multiple answer blocks, distinguishing self from peer.

    Args:
        answers: List of dicts with keys: actor_name, content
        self_actor_name: The name of the current actor (to determine role)
        phase: The debate phase

    Returns:
        Combined block strings separated by newlines
    """
    blocks = []
    for ans in answers:
        role = BlockRole.SELF if ans["actor_name"] == self_actor_name else BlockRole.PEER
        blocks.append(serialize_answer_block(
            actor_name=ans["actor_name"],
            phase=phase,
            role=role,
            content=ans["content"],
        ))
    return "\n\n".join(blocks)


def serialize_peer_answer_blocks(
    answers: list[dict],
    phase: BlockPhase,
) -> str:
    """
    Serialize peer answer blocks (all marked as peer role).

    Args:
        answers: List of dicts with keys: actor_name, content
        phase: The debate phase

    Returns:
        Combined block strings
    """
    blocks = []
    for ans in answers:
        blocks.append(serialize_answer_block(
            actor_name=ans["actor_name"],
            phase=phase,
            role=BlockRole.PEER,
            content=ans["content"],
        ))
    return "\n\n".join(blocks)


def serialize_peer_review_blocks(
    reviews: list[dict],
    phase: BlockPhase,
) -> str:
    """
    Serialize peer review blocks.

    Args:
        reviews: List of dicts with keys: reviewer_name, about_actor_name, content
        phase: The debate phase

    Returns:
        Combined block strings
    """
    blocks = []
    for rev in reviews:
        blocks.append(serialize_review_block(
            reviewer_name=rev["reviewer_name"],
            about_actor_name=rev["about_actor_name"],
            phase=phase,
            content=rev["content"],
        ))
    return "\n\n".join(blocks)


def serialize_history_blocks(
    history_items: list[dict],
    self_actor_name: str,
) -> str:
    """
    Serialize history blocks for summary phase.

    Args:
        history_items: List of dicts with keys: actor_name, role, cycle, content
        self_actor_name: The name of the current actor viewing history

    Returns:
        Combined block strings
    """
    blocks = []
    for item in history_items:
        role = BlockRole.SELF if item["actor_name"] == self_actor_name else BlockRole.PEER
        phase = BlockPhase.INITIAL if item.get("cycle", 0) == 0 else BlockPhase.REVISION

        if item.get("role") == "review":
            # Review block
            blocks.append(serialize_review_block(
                reviewer_name=item["actor_name"],
                about_actor_name=item.get("about_actor_name", "unknown"),
                phase=phase,
                content=item["content"],
            ))
        else:
            # Answer block
            blocks.append(serialize_answer_block(
                actor_name=item["actor_name"],
                phase=phase,
                role=role,
                content=item["content"],
            ))
    return "\n\n".join(blocks)


def serialize_latest_answer_blocks(
    answers: list[dict],
) -> str:
    """
    Serialize latest answer blocks for convergence check.

    Args:
        answers: List of dicts with keys: actor_name, content

    Returns:
        Combined block strings (all as peer role for neutrality)
    """
    blocks = []
    for ans in answers:
        blocks.append(serialize_answer_block(
            actor_name=ans["actor_name"],
            phase=BlockPhase.FINAL,
            role=BlockRole.PEER,  # Neutral for convergence check
            content=ans["content"],
        ))
    return "\n\n".join(blocks)
```


### backend\app\services\prompt_service.py

```python
"""
Prompt Service - Loads and renders prompt templates from database.

This is the single source of truth for all prompts.
NO prompts should be hardcoded in the engine or other services.
"""

import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import WorkflowPromptTemplate, PromptPreset
from app.services.prompt_serializer import (
    BlockPhase,
    serialize_answer_block,
    serialize_peer_answer_blocks,
    serialize_peer_review_blocks,
    serialize_latest_answer_blocks,
    serialize_history_blocks,
    BlockRole,
)

logger = logging.getLogger('magi.prompts')


class PromptError(Exception):
    """Raised when a required prompt template is missing."""
    pass


class PromptService:
    """Service for loading and rendering prompts from database."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._template_cache: dict[str, WorkflowPromptTemplate] = {}
        self._preset_cache: dict[str, PromptPreset] = {}

    async def load_templates(self):
        """Load all templates into cache."""
        if self._template_cache:
            return

        result = await self.db.execute(
            select(WorkflowPromptTemplate)
        )
        templates = list(result.scalars().all())

        for t in templates:
            self._template_cache[t.key] = t

        logger.info(f"Loaded {len(templates)} workflow templates")

    async def load_presets(self):
        """Load all presets into cache."""
        if self._preset_cache:
            return

        result = await self.db.execute(
            select(PromptPreset)
        )
        presets = list(result.scalars().all())

        for p in presets:
            self._preset_cache[p.key] = p

        logger.info(f"Loaded {len(presets)} prompt presets")

    async def get_template(self, key: str) -> WorkflowPromptTemplate:
        """
        Get a workflow prompt template by key.

        Raises PromptError if not found.
        """
        if not self._template_cache:
            await self.load_templates()

        template = self._template_cache.get(key)
        if not template:
            raise PromptError(
                f"Required workflow prompt template '{key}' not found in database. "
                "Please initialize the database with seed data."
            )
        return template

    async def get_preset(self, key: str) -> PromptPreset:
        """
        Get a prompt preset by key.

        Raises PromptError if not found.
        """
        if not self._preset_cache:
            await self.load_presets()

        preset = self._preset_cache.get(key)
        if not preset:
            raise PromptError(
                f"Required prompt preset '{key}' not found in database. "
                "Please initialize the database with seed data."
            )
        return preset

    def render(self, template_text: str, variables: dict[str, str]) -> str:
        """
        Render a template with the given variables.

        Uses simple {{variable}} replacement.
        """
        result = template_text
        for key, value in variables.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        return result

    async def render_template(self, key: str, variables: dict[str, str]) -> str:
        """
        Get and render a workflow template.

        Raises PromptError if template not found or missing variables.
        """
        template = await self.get_template(key)

        # Check for missing required variables
        missing = []
        for var in (template.required_variables or []):
            if var not in variables:
                missing.append(var)

        if missing:
            raise PromptError(
                f"Template '{key}' requires variables: {missing}. "
                f"Provided: {list(variables.keys())}"
            )

        return self.render(template.template_text, variables)

    async def get_initial_answer_prompt(
        self,
        question: str,
        actor_name: str,
        actor_custom_prompt: Optional[str] = None,
    ) -> str:
        """Get the system prompt for initial answer phase."""
        base_prompt = await self.render_template("initial_answer", {
            "question": question,
            "actor_name": actor_name,
        })
        if actor_custom_prompt:
            base_prompt = f"{actor_custom_prompt}\n\n{base_prompt}"
        return base_prompt

    async def get_review_prompt(
        self,
        question: str,
        self_actor_name: str,
        self_answer_block: str,
        peer_answer_blocks: str,
    ) -> str:
        """Get the prompt for peer review phase.

        Args:
            question: The original question
            self_actor_name: Name of the current actor
            self_answer_block: Serialized block of the actor's own answer
            peer_answer_blocks: Serialized blocks of peer answers
        """
        return await self.render_template("peer_review", {
            "question": question,
            "self_actor_name": self_actor_name,
            "self_answer_block": self_answer_block,
            "peer_answer_blocks": peer_answer_blocks,
        })

    async def get_revision_prompt(
        self,
        question: str,
        self_actor_name: str,
        self_previous_answer_block: str,
        peer_review_blocks: str,
    ) -> str:
        """Get the prompt for revision phase.

        Args:
            question: The original question
            self_actor_name: Name of the current actor
            self_previous_answer_block: Serialized block of the actor's previous answer
            peer_review_blocks: Serialized blocks of peer reviews about this actor
        """
        return await self.render_template("revision", {
            "question": question,
            "self_actor_name": self_actor_name,
            "self_previous_answer_block": self_previous_answer_block,
            "peer_review_blocks": peer_review_blocks,
        })

    async def get_summary_prompt(
        self,
        question: str,
        self_actor_name: str,
        history_blocks: str,
    ) -> str:
        """Get the prompt for summary phase.

        Args:
            question: The original question
            self_actor_name: Name of the judge actor
            history_blocks: Serialized blocks of all history
        """
        return await self.render_template("summary", {
            "question": question,
            "self_actor_name": self_actor_name,
            "history_blocks": history_blocks,
        })

    async def get_convergence_prompt(
        self,
        question: str,
        latest_answer_blocks: str,
    ) -> str:
        """Get the prompt for convergence check.

        Args:
            question: The original question
            latest_answer_blocks: Serialized blocks of all latest answers
        """
        return await self.render_template("convergence_check", {
            "question": question,
            "latest_answer_blocks": latest_answer_blocks,
        })

    async def get_final_answer_prompt(
        self,
        question: str,
        self_actor_name: str,
        actor_answer_blocks: str,
        convergence_info: str = "",
    ) -> str:
        """Get the prompt for final answer phase.

        Args:
            question: The original question
            self_actor_name: Name of the judge actor
            actor_answer_blocks: Serialized blocks of all actor answers
            convergence_info: Convergence analysis results
        """
        return await self.render_template("final_answer", {
            "question": question,
            "self_actor_name": self_actor_name,
            "actor_answer_blocks": actor_answer_blocks,
            "convergence_info": convergence_info,
        })

    # === Helper methods for serialization ===

    def build_self_answer_block(
        self,
        actor_name: str,
        content: str,
        phase: BlockPhase = BlockPhase.INITIAL,
    ) -> str:
        """Build a self answer block for the current actor."""
        return serialize_answer_block(
            actor_name=actor_name,
            phase=phase,
            role=BlockRole.SELF,
            content=content,
        )

    def build_peer_answer_blocks(
        self,
        answers: list[dict],
        phase: BlockPhase = BlockPhase.INITIAL,
    ) -> str:
        """Build peer answer blocks from a list of answers.

        Args:
            answers: List of dicts with keys: actor_name, content
            phase: The debate phase
        """
        return serialize_peer_answer_blocks(answers, phase)

    def build_peer_review_blocks(
        self,
        reviews: list[dict],
        phase: BlockPhase = BlockPhase.INITIAL,
    ) -> str:
        """Build peer review blocks from a list of reviews.

        Args:
            reviews: List of dicts with keys: reviewer_name, about_actor_name, content
            phase: The debate phase
        """
        return serialize_peer_review_blocks(reviews, phase)

    def build_latest_answer_blocks(
        self,
        answers: list[dict],
    ) -> str:
        """Build latest answer blocks for convergence check.

        Args:
            answers: List of dicts with keys: actor_name, content
        """
        return serialize_latest_answer_blocks(answers)

    def build_history_blocks(
        self,
        history_items: list[dict],
        self_actor_name: str,
    ) -> str:
        """Build history blocks for summary phase.

        Args:
            history_items: List of dicts with keys: actor_name, role, cycle, content
            self_actor_name: Name of the actor viewing the history
        """
        return serialize_history_blocks(history_items, self_actor_name)
```


### backend\app\services\semantic_service.py

```python
"""
Semantic Service - Provides semantic analysis for multi-agent review.

Core capabilities:
1. Question intent analysis - Extract comparison axes from user question
2. Semantic topic extraction - Extract structured topics from each answer
3. Cross-actor comparison - Generate disagreement map across actors
"""

import json
import logging
from typing import Optional
from dataclasses import dataclass, field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import (
    Actor,
    QuestionIntent,
    SemanticTopic,
    SemanticComparison,
)
from app.services.llm_adapter import LLMAdapter
from app.services.prompt_service import PromptService

logger = logging.getLogger('magi.semantic')
logger.setLevel(logging.DEBUG)

if not logger.handlers:
    file_handler = logging.FileHandler('magi_debug.log', encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(file_handler)
logger.propagate = False


@dataclass
class QuestionIntentResult:
    """Result of question intent analysis."""
    question_type: str = "general"
    user_goal: str = ""
    time_horizons: list[str] = field(default_factory=list)
    comparison_axes: list[dict] = field(default_factory=list)


@dataclass
class TopicResult:
    """Result of semantic topic extraction."""
    topic_id: str
    axis_id: Optional[str] = None
    label: str = ""
    summary: str = ""
    stance: str = ""
    time_horizon: str = "medium"
    risk_level: str = "medium"
    novelty: str = "medium"
    quotes: list[str] = field(default_factory=list)


@dataclass
class ActorPositionResult:
    """Actor's position on a topic."""
    actor_id: str
    actor_name: str = ""
    stance_label: str = ""
    summary: str = ""
    quotes: list[str] = field(default_factory=list)


@dataclass
class TopicComparisonResult:
    """Result of cross-actor comparison on a topic."""
    topic_id: str
    label: str
    salience: float = 0.5
    disagreement_score: float = 0.5
    status: str = "partial"  # converged, divergent, partial
    difference_types: list[str] = field(default_factory=list)
    agreement_summary: str = ""
    disagreement_summary: str = ""
    actor_positions: list[ActorPositionResult] = field(default_factory=list)


def parse_json_response(response: str) -> dict:
    """Parse JSON from LLM response with tolerance for formatting."""
    # Try to find JSON in the response
    json_start = response.find("{")
    json_end = response.rfind("}") + 1

    if json_start >= 0 and json_end > json_start:
        json_str = response[json_start:json_end]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse error: {e}")
            # Try to fix common issues
            json_str = json_str.replace("'", '"')
            try:
                return json.loads(json_str)
            except:
                pass

    return {}


class SemanticService:
    """Service for semantic analysis in multi-agent review."""

    def __init__(self, db: AsyncSession, prompt_service: PromptService):
        self.db = db
        self.prompt_service = prompt_service
        # Templates are loaded via PromptService, no direct template storage needed

    async def _load_templates(self):
        """Load prompt templates from database via PromptService.

        Raises PromptError if templates are missing - NO fallback allowed.
        """
        # Templates are loaded on-demand via prompt_service.get_template()
        # This method exists for compatibility but doesn't store templates locally
        pass

    async def analyze_question_intent(
        self,
        question: str,
        adapter: LLMAdapter,
    ) -> QuestionIntentResult:
        """
        Analyze question intent and extract comparison axes.

        Args:
            question: The user's question
            adapter: LLM adapter to use for analysis

        Returns:
            QuestionIntentResult with comparison axes
        """
        # Get prompt from PromptService - NO fallback allowed
        prompt = await self.prompt_service.render_template("question_intent_analysis", {
            "question": question,
        })

        # Call LLM
        full_response = ""
        try:
            async for token in adapter.stream_completion(
                messages=[{"role": "user", "content": prompt}],
                system_prompt="你是一个专业的问题分析专家。请以JSON格式返回分析结果。",
                max_tokens=1024,
                temperature=0.3,
            ):
                full_response += token

            # Parse response
            data = parse_json_response(full_response)

            return QuestionIntentResult(
                question_type=data.get("question_type", "general"),
                user_goal=data.get("user_goal", ""),
                time_horizons=data.get("time_horizons", []),
                comparison_axes=data.get("comparison_axes", []),
            )

        except Exception as e:
            logger.error(f"Question intent analysis failed: {e}")
            # Return default axes based on question length
            return QuestionIntentResult(
                question_type="general",
                user_goal="",
                time_horizons=["short_term", "medium_term", "long_term"],
                comparison_axes=[
                    {"axis_id": "main_topic", "label": "核心观点"},
                    {"axis_id": "approach", "label": "解决思路"},
                    {"axis_id": "risk", "label": "风险考量"},
                ],
            )

    async def extract_semantic_topics(
        self,
        question: str,
        answer: str,
        comparison_axes: list[dict],
        actor_id: str,
        adapter: LLMAdapter,
    ) -> list[TopicResult]:
        """
        Extract semantic topics from an actor's answer.

        Args:
            question: The original question
            answer: The actor's answer
            comparison_axes: Axes from question intent analysis
            actor_id: ID of the actor
            adapter: LLM adapter to use

        Returns:
            List of TopicResult
        """
        if not comparison_axes:
            comparison_axes = [
                {"axis_id": "main_topic", "label": "核心观点"},
                {"axis_id": "approach", "label": "解决思路"},
            ]

        # Get prompt from PromptService - NO fallback allowed
        prompt = await self.prompt_service.render_template("semantic_extraction", {
            "question": question,
            "answer": answer,
            "comparison_axes": json.dumps(comparison_axes, ensure_ascii=False),
        })

        # Call LLM
        full_response = ""
        try:
            async for token in adapter.stream_completion(
                messages=[{"role": "user", "content": prompt}],
                system_prompt="你是一个专业的语义分析专家。请以JSON格式返回分析结果。",
                max_tokens=2048,
                temperature=0.3,
            ):
                full_response += token

            # Parse response
            data = parse_json_response(full_response)
            topics_data = data.get("topics", [])

            # Build valid axis_id set for validation
            valid_axis_ids = {a.get("axis_id") for a in comparison_axes if a.get("axis_id")}

            results = []
            for i, t in enumerate(topics_data):
                axis_id = t.get("axis_id")

                # Validate axis_id: must be from the given comparison_axes
                # If invalid or missing, try to find a matching axis by label similarity
                if axis_id and axis_id not in valid_axis_ids:
                    logger.warning(f"Invalid axis_id '{axis_id}', attempting fallback")
                    axis_id = None

                # Fallback: assign to first axis if only one exists
                if not axis_id and len(comparison_axes) == 1:
                    axis_id = comparison_axes[0].get("axis_id")

                results.append(TopicResult(
                    topic_id=t.get("topic_id", f"topic_{i}"),
                    axis_id=axis_id,
                    label=t.get("label", ""),
                    summary=t.get("summary", ""),
                    stance=t.get("stance", ""),
                    time_horizon=t.get("time_horizon", "medium"),
                    risk_level=t.get("risk_level", "medium"),
                    novelty=t.get("novelty", "medium"),
                    quotes=t.get("quotes", []),
                ))

            return results

        except Exception as e:
            logger.error(f"Semantic topic extraction failed for actor {actor_id}: {e}")
            return []

    async def compare_actors(
        self,
        question: str,  # noqa: ARG002 - kept for potential future use
        topics_by_actor: dict[str, list[TopicResult]],
        actors: list[Actor],
        adapter: LLMAdapter,
    ) -> list[TopicComparisonResult]:
        """
        Compare topics across actors and generate disagreement map.

        Args:
            question: The original question
            topics_by_actor: Map of actor_id to their topic results
            actors: List of actors for name lookup
            adapter: LLM adapter to use

        Returns:
            List of TopicComparisonResult

        IMPORTANT: Topics are aligned by axis_id, NOT by topic_id.
        axis_id comes from the comparison_axes extracted from question intent,
        providing a stable cross-actor alignment coordinate.
        """
        # Build actor lookup
        actor_map = {a.id: a for a in actors}

        # Group topics by axis_id (stable cross-actor alignment)
        # axis_id -> [(actor_id, TopicResult)]
        topics_by_axis: dict[str, list[tuple[str, TopicResult]]] = {}

        for actor_id, topics in topics_by_actor.items():
            for topic in topics:
                # Use axis_id if available, fallback to topic_id for legacy support
                align_key = topic.axis_id or f"unaligned_{topic.topic_id}"
                if align_key not in topics_by_axis:
                    topics_by_axis[align_key] = []
                topics_by_axis[align_key].append((actor_id, topic))

        # Compare each axis
        results = []
        for axis_id, actor_topics in topics_by_axis.items():
            # Skip unaligned topics that only one actor has
            if axis_id.startswith("unaligned_") and len(actor_topics) < 2:
                continue

            # Only compare if at least 2 actors have this axis
            if len(actor_topics) < 2:
                continue

            # Get the label (prefer axis label from first topic with valid axis_id)
            label = actor_topics[0][1].label or axis_id

            # Build positions for comparison
            positions = []
            for actor_id, topic in actor_topics:
                actor = actor_map.get(actor_id)
                positions.append({
                    "actor_id": actor_id,
                    "actor_name": actor.name if actor else "Unknown",
                    "summary": topic.summary,
                    "stance": topic.stance,
                    "quotes": topic.quotes[:2] if topic.quotes else [],
                })

            # Call LLM for comparison - NO fallback allowed
            prompt = await self.prompt_service.render_template("cross_actor_compare", {
                "topic_label": label,
                "actor_positions": json.dumps(positions, ensure_ascii=False),
            })

            try:
                full_response = ""
                async for token in adapter.stream_completion(
                    messages=[{"role": "user", "content": prompt}],
                    system_prompt="你是一个专业的观点比较专家。请以JSON格式返回比较结果。",
                    max_tokens=1024,
                    temperature=0.3,
                ):
                    full_response += token

                data = parse_json_response(full_response)

                # Build actor positions result
                actor_positions = [
                    ActorPositionResult(
                        actor_id=p["actor_id"],
                        actor_name=p["actor_name"],
                        stance_label=p.get("stance", ""),
                        summary=p["summary"],
                        quotes=p.get("quotes", []),
                    )
                    for p in positions
                ]

                # Use axis_id as topic_id for stable cross-phase comparison
                results.append(TopicComparisonResult(
                    topic_id=axis_id,  # Use axis_id as the stable identifier
                    label=label,
                    salience=float(data.get("salience", 0.5)),
                    disagreement_score=float(data.get("disagreement_score", 0.5)),
                    status=data.get("status", "partial"),
                    difference_types=data.get("difference_types", []),
                    agreement_summary=data.get("agreement_summary", ""),
                    disagreement_summary=data.get("disagreement_summary", ""),
                    actor_positions=actor_positions,
                ))

            except Exception as e:
                logger.error(f"Topic comparison failed for {axis_id}: {e}")
                # Add with default values
                actor_positions = [
                    ActorPositionResult(
                        actor_id=p["actor_id"],
                        actor_name=p["actor_name"],
                        stance_label=p.get("stance", ""),
                        summary=p["summary"],
                        quotes=p.get("quotes", []),
                    )
                    for p in positions
                ]

                # Calculate simple disagreement based on stance differences
                stances = [p.get("stance", "") for p in positions]
                unique_stances = len(set(stances)) if stances else 1

                results.append(TopicComparisonResult(
                    topic_id=axis_id,  # Use axis_id as the stable identifier
                    label=label,
                    salience=0.5,
                    disagreement_score=min(1.0, unique_stances / max(len(positions), 1)),
                    status="partial",
                    difference_types=["stance"],
                    agreement_summary="",
                    disagreement_summary="立场存在差异",
                    actor_positions=actor_positions,
                ))

        # Sort by salience (most important first)
        results.sort(key=lambda x: x.salience, reverse=True)

        return results

    async def save_question_intent(
        self,
        session_id: str,
        result: QuestionIntentResult,
    ) -> QuestionIntent:
        """Save question intent analysis to database."""
        intent = QuestionIntent(
            session_id=session_id,
            question_type=result.question_type,
            user_goal=result.user_goal,
            time_horizons=result.time_horizons,
            comparison_axes=result.comparison_axes,
        )
        self.db.add(intent)
        await self.db.commit()
        await self.db.refresh(intent)
        return intent

    async def save_semantic_topics(
        self,
        session_id: str,
        round_number: int,
        phase: str,
        actor_id: str,
        topics: list[TopicResult],
        cycle: int = 0,  # noqa: ARG002 - kept for API consistency
    ) -> list[SemanticTopic]:
        """Save semantic topics to database."""
        db_topics = []
        for t in topics:
            db_topic = SemanticTopic(
                session_id=session_id,
                round_number=round_number,
                phase=phase,
                actor_id=actor_id,
                topic_id=t.topic_id,
                axis_id=t.axis_id,
                label=t.label,
                summary=t.summary,
                stance=t.stance,
                time_horizon=t.time_horizon,
                risk_level=t.risk_level,
                novelty=t.novelty,
                quotes=t.quotes,
            )
            self.db.add(db_topic)
            db_topics.append(db_topic)

        await self.db.commit()
        return db_topics

    async def save_semantic_comparisons(
        self,
        session_id: str,
        round_number: int,
        phase: str,
        comparisons: list[TopicComparisonResult],
        cycle: int = 0,  # noqa: ARG002 - kept for API consistency
    ) -> list[SemanticComparison]:
        """Save semantic comparisons to database."""
        db_comparisons = []
        for c in comparisons:
            actor_positions = [
                {
                    "actor_id": p.actor_id,
                    "actor_name": p.actor_name,
                    "stance_label": p.stance_label,
                    "summary": p.summary,
                    "quotes": p.quotes,
                }
                for p in c.actor_positions
            ]

            db_comp = SemanticComparison(
                session_id=session_id,
                round_number=round_number,
                phase=phase,
                topic_id=c.topic_id,
                label=c.label,
                salience=c.salience,
                disagreement_score=c.disagreement_score,
                status=c.status,
                difference_types=c.difference_types,
                agreement_summary=c.agreement_summary,
                disagreement_summary=c.disagreement_summary,
                actor_positions=actor_positions,
            )
            self.db.add(db_comp)
            db_comparisons.append(db_comp)

        await self.db.commit()
        return db_comparisons

    async def get_latest_comparisons(
        self,
        session_id: str,
    ) -> list[SemanticComparison]:
        """Get the latest semantic comparisons for a session."""
        result = await self.db.execute(
            select(SemanticComparison)
            .where(SemanticComparison.session_id == session_id)
            .order_by(SemanticComparison.round_number.desc())
        )
        return list(result.scalars().all())
```


### backend\app\services\task_manager.py

```python
"""
Task Manager for debate sessions.

Manages running debate tasks and event queues for SSE streaming.
"""

import asyncio
import logging
from typing import Dict, Optional
from dataclasses import dataclass

logger = logging.getLogger('magi.task_manager')


@dataclass
class DebateTask:
    """Represents a running debate task"""
    session_id: str
    task: asyncio.Task
    event_queue: asyncio.Queue
    cancelled: bool = False


class TaskManager:
    """
    Manages running debate tasks.

    - Ensures each session only runs once
    - Provides event queues for SSE streaming
    - Supports task cancellation
    """

    def __init__(self):
        self._tasks: Dict[str, DebateTask] = {}
        self._lock = asyncio.Lock()

    async def start_task(
        self,
        session_id: str,
        coro_factory
    ) -> tuple[bool, asyncio.Queue]:
        """
        Start a new debate task.

        Args:
            session_id: The session ID
            coro_factory: A callable that takes an asyncio.Queue and returns a coroutine

        Returns:
            (success, event_queue) - success=False if already running
        """
        async with self._lock:
            if session_id in self._tasks:
                existing = self._tasks[session_id]
                if not existing.task.done():
                    logger.warning(f"Session {session_id} is already running")
                    return False, existing.event_queue

            event_queue = asyncio.Queue()

            async def wrapped_coro():
                try:
                    # Call the factory with the queue to get the actual coroutine
                    await coro_factory(event_queue)
                except asyncio.CancelledError:
                    logger.info(f"Task for session {session_id} was cancelled")
                    await event_queue.put({"event": "cancelled", "data": {}})
                except Exception as e:
                    logger.error(f"Task for session {session_id} failed: {e}")
                    await event_queue.put({"event": "debate_error", "data": {"message": str(e)}})
                finally:
                    async with self._lock:
                        if session_id in self._tasks:
                            del self._tasks[session_id]

            task = asyncio.create_task(wrapped_coro())
            self._tasks[session_id] = DebateTask(
                session_id=session_id,
                task=task,
                event_queue=event_queue,
            )

            logger.info(f"Started task for session {session_id}")
            return True, event_queue

    def get_event_queue(self, session_id: str) -> Optional[asyncio.Queue]:
        """Get the event queue for a running session."""
        task_info = self._tasks.get(session_id)
        if task_info:
            return task_info.event_queue
        return None

    def is_running(self, session_id: str) -> bool:
        """Check if a session is currently running."""
        task_info = self._tasks.get(session_id)
        return task_info is not None and not task_info.task.done()

    async def cancel_task(self, session_id: str) -> bool:
        """
        Cancel a running task.

        Returns True if task was cancelled, False if not running.
        """
        async with self._lock:
            task_info = self._tasks.get(session_id)
            if task_info and not task_info.task.done():
                task_info.cancelled = True
                task_info.task.cancel()
                logger.info(f"Cancelled task for session {session_id}")
                return True
            return False

    def get_cancelled_flag(self, session_id: str) -> bool:
        """Check if a session was marked as cancelled."""
        task_info = self._tasks.get(session_id)
        return task_info.cancelled if task_info else False

    async def _check_db_stopped(self, db, session_id: str) -> bool:
        """Check if session is stopped in database."""
        from app.models.database import DebateSession, SessionStatus
        from sqlalchemy import select

        result = await db.execute(
            select(DebateSession.status).where(DebateSession.id == session_id)
        )
        status = result.scalar_one_or_none()
        return status == SessionStatus.STOPPED


# Global task manager instance
task_manager = TaskManager()
```


### backend\pyproject.toml

```toml
[project]
name = "magi-backend"
version = "0.1.0"
description = "MAGI Multi-Agent Debate System Backend"
requires-python = ">=3.9"
dependencies = [
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
    "python-multipart>=0.0.6",
    "aiosqlite>=0.19.0",
    "sqlalchemy[asyncio]>=2.0.25",
    "httpx>=0.26.0",
    "openai>=1.12.0",
    "anthropic>=0.18.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["app"]
```


### frontend\next-env.d.ts

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.

```


### frontend\next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig
```


### frontend\package.json

```json
{
  "name": "magi-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "clsx": "^2.1.0",
    "framer-motion": "^11.0.24",
    "lucide-react": "^0.363.0",
    "next": "14.2.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^10.1.0",
    "rehype-sanitize": "^6.0.0",
    "remark-gfm": "^4.0.1",
    "tailwind-merge": "^2.2.2",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@types/node": "^20.11.30",
    "@types/react": "^18.2.67",
    "@types/react-dom": "^18.2.22",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.3",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.3"
  }
}

```


### frontend\postcss.config.js

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```


### frontend\src\app\globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;600;700&family=Noto+Serif+JP:wght@900&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --c-bg: #0A0A0B;
  --c-orange: #f26600;
  --c-orange-dim: rgba(242, 102, 0, 0.4);
  --c-green-line: #2b7a5f;
  --c-fill-blue: #54a5d9;
  --c-fill-green: #67ff8c;
  --c-fill-red: #e30000;
  --c-yellow: #fec200;
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

body {
  background-color: var(--c-bg);
  color: #F5F5F7;
  font-family: 'Inter', 'Noto Sans SC', -apple-system, sans-serif;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #141416;
}

::-webkit-scrollbar-thumb {
  background: #2A2A2E;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3A3A3E;
}

/* Selection */
::selection {
  background: rgba(10, 132, 255, 0.3);
}

/* Focus ring */
:focus-visible {
  outline: 2px solid #0A84FF;
  outline-offset: 2px;
}
```


### frontend\src\app\layout.tsx

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MAGI - Multi-Agent Guided Intelligence',
  description: 'Multi-Agent AI Debate System inspired by Evangelion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh" className="dark">
      <body className="bg-bg-primary text-text-primary antialiased">
        {children}
      </body>
    </html>
  )
}
```


### frontend\src\app\page.tsx

```tsx
'use client'

import { useEffect, useState } from 'react'
import Splash from '@/components/Splash'
import Arena from '@/components/Arena'

export default function Home() {
  const [showSplash, setShowSplash] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSplashComplete = () => {
    setShowSplash(false)
  }

  if (!mounted) return null

  return (
    <main className="min-h-screen">
      {showSplash ? (
        <Splash onComplete={handleSplashComplete} />
      ) : (
        <Arena />
      )}
    </main>
  )
}
```


### frontend\src\components\ActorCard.tsx

```tsx
'use client'

import { motion } from 'framer-motion'
import { Check, Crown } from 'lucide-react'
import { Actor } from '@/types'

interface ActorCardProps {
  actor: Actor
  selected: boolean
  onSelect: () => void
  showJudgeBadge?: boolean
}

export default function ActorCard({ actor, selected, onSelect, showJudgeBadge }: ActorCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`relative h-20 px-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-accent-blue bg-accent-blue/10'
          : 'border-border bg-bg-secondary hover:border-text-tertiary'
      }`}
    >
      {/* Color indicator */}
      <div
        className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
        style={{ backgroundColor: actor.display_color }}
      />

      {/* Content */}
      <div className="pl-4 flex flex-col items-start justify-center h-full">
        <div className="flex items-center gap-2">
          <span className="text-lg">{actor.icon}</span>
          <span className="font-medium">{actor.name}</span>
          {showJudgeBadge && actor.is_meta_judge && (
            <Crown className="w-4 h-4 text-accent-purple" />
          )}
        </div>
        <span className="text-sm text-text-tertiary">{actor.model}</span>
      </div>

      {/* Selected indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-accent-blue rounded-full flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-white" />
        </motion.div>
      )}
    </motion.button>
  )
}
```


### frontend\src\components\ActorManager.tsx

```tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, Edit2, Check, X, TestTube } from 'lucide-react'
import { useActorStore } from '@/stores'
import { Actor, ProviderType } from '@/types'
import { apiClient } from '@/lib/apiClient'

interface PromptPreset {
  id: string
  key: string
  name: string
  description: string
  system_prompt: string
  review_prompt: string
  revision_prompt: string
  personality: string
  custom_instructions: string
}

interface ActorManagerProps {
  onBack: () => void
}

export default function ActorManager({ onBack }: ActorManagerProps) {
  const {
    actors,
    loading,
    error,
    fetchActors,
    createActor,
    updateActor,
    deleteActor,
    testActor,
  } = useActorStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; result: string } | null>(null)

  useEffect(() => {
    fetchActors()
  }, [fetchActors])

  const handleTest = async (id: string) => {
    setTesting(id)
    setTestResult(null)
    try {
      const result = await testActor(id)
      setTestResult({ id, result: result.response })
    } catch (err) {
      setTestResult({ id, result: `Error: ${(err as Error).message}` })
    } finally {
      setTesting(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个 Actor 吗？')) {
      await deleteActor(id)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-lg font-semibold tracking-wider text-accent-orange">Actors</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center text-text-secondary">Loading...</div>
          ) : error ? (
            <div className="text-center text-accent-red">{error}</div>
          ) : actors.length === 0 ? (
            <div className="text-center text-text-secondary">
              No actors yet. Create one to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {actors.map((actor) => (
                <motion.div
                  key={actor.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-bg-secondary border border-border rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-4 h-4 rounded-full mt-1"
                        style={{ backgroundColor: actor.display_color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-medium">{actor.name}</h3>
                          {actor.is_meta_judge && (
                            <span className="px-2 py-0.5 bg-accent-purple/20 text-accent-purple text-xs rounded">
                              总结模型
                            </span>
                          )}
                        </div>
                        <p className="text-text-tertiary text-sm mt-1">
                          {actor.provider} / {actor.model}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTest(actor.id)}
                        disabled={testing === actor.id}
                        className="p-2 text-text-tertiary hover:text-accent-blue transition-colors disabled:opacity-50"
                        title="Test connection"
                      >
                        <TestTube className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(actor.id)}
                        className="p-2 text-text-tertiary hover:text-text-primary transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(actor.id)}
                        className="p-2 text-text-tertiary hover:text-accent-red transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Test result */}
                  {testResult?.id === actor.id && (
                    <div className="mt-4 p-3 bg-bg-tertiary rounded-xl text-sm text-text-secondary">
                      {testResult.result}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {(showCreate || editingId) && (
        <ActorFormModal
          actorId={editingId}
          onClose={() => {
            setShowCreate(false)
            setEditingId(null)
          }}
          onSave={async (data) => {
            if (editingId) {
              await updateActor(editingId, data)
            } else {
              await createActor(data as unknown as Actor)
            }
            setShowCreate(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

interface ActorFormModalProps {
  actorId?: string | null
  onClose: () => void
  onSave: (data: Partial<Actor>) => Promise<void>
}

function ActorFormModal({ actorId, onClose, onSave }: ActorFormModalProps) {
  const { fetchActorDetail } = useActorStore()
  const [presets, setPresets] = useState<PromptPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>('')

  const [name, setName] = useState('')
  const [displayColor, setDisplayColor] = useState('#FF6B35')
  const [icon, setIcon] = useState('🤖')
  const [isJudge, setIsJudge] = useState(false)
  const [provider, setProvider] = useState<ProviderType>('openai')
  const [model, setModel] = useState('gpt-4o')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [reviewPrompt, setReviewPrompt] = useState('')
  const [revisionPrompt, setRevisionPrompt] = useState('')
  const [customInstructions, setCustomInstructions] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load presets on mount
  useEffect(() => {
    loadPresets()
  }, [])

  // Load existing actor data
  useEffect(() => {
    if (actorId) {
      setLoading(true)
      fetchActorDetail(actorId)
        .then((detail) => {
          setName(detail.name)
          setDisplayColor(detail.display_color)
          setIcon(detail.icon)
          setIsJudge(detail.is_meta_judge)
          setProvider(detail.provider as ProviderType)
          setModel(detail.model)
          setBaseUrl(detail.base_url || '')
          setSystemPrompt(detail.system_prompt || '')
          setReviewPrompt(detail.review_prompt || '')
          setRevisionPrompt(detail.revision_prompt || '')
          setCustomInstructions(detail.custom_instructions || '')
          setApiKey('')
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [actorId, fetchActorDetail])

  const loadPresets = async () => {
    try {
      const data = await apiClient.request<PromptPreset[]>('/api/settings/prompt-presets')
      setPresets(data)
    } catch (err) {
      console.error('Failed to load presets:', err)
    }
  }

  // Apply preset to form
  const applyPreset = (presetKey: string) => {
    const preset = presets.find(p => p.key === presetKey)
    if (preset) {
      setSystemPrompt(preset.system_prompt)
      setReviewPrompt(preset.review_prompt)
      setRevisionPrompt(preset.revision_prompt)
      setCustomInstructions(preset.custom_instructions)
      setSelectedPreset(presetKey)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await onSave({
        name,
        display_color: displayColor,
        icon,
        is_meta_judge: isJudge,
        provider,
        model,
        api_key: apiKey || undefined,
        api_format: provider === 'anthropic' ? 'anthropic' : 'openai_compatible',
        base_url: baseUrl || undefined,
        max_tokens: 4096,
        temperature: 0.7,
        extra_params: {},
        system_prompt: systemPrompt,
        review_prompt: reviewPrompt,
        revision_prompt: revisionPrompt,
        personality: 'neutral',
        custom_instructions: customInstructions,
      } as unknown as Actor)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-secondary border border-border rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto mx-4"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {actorId ? '编辑 Actor' : '创建 Actor'}
          </h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-text-secondary">Loading...</div>
        ) : (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-text-secondary text-sm block mb-1">名称</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
                  placeholder="CASPER"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-text-secondary text-sm block mb-1">颜色</label>
                  <input
                    type="color"
                    value={displayColor}
                    onChange={(e) => setDisplayColor(e.target.value)}
                    className="w-full h-10 rounded-xl cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-text-secondary text-sm block mb-1">图标</label>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl text-2xl"
                  />
                </div>
              </div>
            </div>

            {/* Is Judge */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isJudge"
                checked={isJudge}
                onChange={(e) => setIsJudge(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="isJudge" className="text-text-secondary">
                可作为总结模型（综合各方观点）
              </label>
            </div>

            {/* API Configuration */}
            <div className="border-t border-border pt-4 mt-4">
              <h3 className="text-text-primary font-medium mb-3">API 配置</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-text-secondary text-sm block mb-1">Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => {
                      const p = e.target.value as ProviderType
                      setProvider(p)
                      if (p === 'openai') setModel('gpt-4o')
                      else if (p === 'anthropic') setModel('claude-sonnet-4-20250514')
                      else setModel('')
                    }}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="text-text-secondary text-sm block mb-1">Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-text-secondary text-sm block mb-1">
                  API Key {actorId && <span className="text-text-tertiary">(留空保留现有)</span>}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
                  placeholder={actorId ? '留空保留现有 key' : 'sk-...'}
                />
              </div>

              {provider === 'custom' && (
                <div className="mt-4">
                  <label className="text-text-secondary text-sm block mb-1">Base URL</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
                    placeholder="https://api.example.com/v1"
                  />
                </div>
              )}
            </div>

            {/* Prompt Configuration */}
            <div className="border-t border-border pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-text-primary font-medium">提示词配置</h3>
                {presets.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedPreset}
                      onChange={(e) => applyPreset(e.target.value)}
                      className="px-3 py-1.5 bg-bg-tertiary border border-border rounded-lg text-sm focus:outline-none focus:border-accent-blue"
                    >
                      <option value="">选择预设...</option>
                      {presets.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-text-tertiary text-xs">应用预设</span>
                  </div>
                )}
              </div>

              {/* System Prompt */}
              <div className="mb-4">
                <label className="text-text-secondary text-sm block mb-1">
                  系统提示词
                  <span className="text-text-tertiary text-xs ml-2">（定义 Actor 的基本角色和行为）</span>
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue min-h-[80px] resize-none text-sm"
                  placeholder="你是一个专业的分析者..."
                />
              </div>

              {/* Review Prompt */}
              <div className="mb-4">
                <label className="text-text-secondary text-sm block mb-1">
                  互评提示词
                  <span className="text-text-tertiary text-xs ml-2">（指导如何评审他人回答）</span>
                </label>
                <textarea
                  value={reviewPrompt}
                  onChange={(e) => setReviewPrompt(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue min-h-[60px] resize-none text-sm"
                  placeholder="请从专业角度评审..."
                />
              </div>

              {/* Revision Prompt */}
              <div className="mb-4">
                <label className="text-text-secondary text-sm block mb-1">
                  修订提示词
                  <span className="text-text-tertiary text-xs ml-2">（指导如何根据反馈修订）</span>
                </label>
                <textarea
                  value={revisionPrompt}
                  onChange={(e) => setRevisionPrompt(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue min-h-[60px] resize-none text-sm"
                  placeholder="请根据评审意见修订..."
                />
              </div>

              {/* Custom Instructions */}
              <div>
                <label className="text-text-secondary text-sm block mb-1">
                  额外指令
                  <span className="text-text-tertiary text-xs ml-2">（附加到所有提示词后面）</span>
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue min-h-[60px] resize-none text-sm"
                  placeholder="始终提供具体的数据支撑..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button
                onClick={onClose}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !name || (!actorId && !apiKey)}
                className="px-6 py-2 bg-accent-blue text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
```


### frontend\src\components\Arena.tsx

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Settings, Users, History, Loader2, AlertCircle } from 'lucide-react'
import { useActorStore, useDebateStore } from '@/stores'
import { Actor, SessionListItem } from '@/types'
import ActorCard from './ActorCard'
import DebateView from './DebateView'
import ActorManager from './ActorManager'
import SessionHistory from './SessionHistory'
import SettingsView from './SettingsView'
import SessionDetailView from './SessionDetailView'
import ProgressBar from './ProgressBar'
import QuestionBox from './QuestionBox'
import { apiClient } from '@/lib/apiClient'

type View = 'arena' | 'debate' | 'actors' | 'history' | 'settings' | 'sessionDetail'

export default function Arena() {
  const [view, setView] = useState<View>('arena')
  const [question, setQuestion] = useState('')
  const [maxRounds, setMaxRounds] = useState(3)
  const [recentSessions, setRecentSessions] = useState<SessionListItem[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  // Actor store - separate selectors for different data
  const actors = useActorStore((state) => state.actors)
  const selectedActors = useActorStore((state) => state.selectedActors)
  const judgeActorId = useActorStore((state) => state.judgeActorId)
  const fetchActors = useActorStore((state) => state.fetchActors)
  const selectActor = useActorStore((state) => state.selectActor)
  const deselectActor = useActorStore((state) => state.deselectActor)
  const setJudgeActor = useActorStore((state) => state.setJudgeActor)

  // Debate store - use individual selectors to minimize re-renders
  // Status and error are frequently checked but change less often during streaming
  const status = useDebateStore((state) => state.status)
  const error = useDebateStore((state) => state.error)
  const currentPhase = useDebateStore((state) => state.currentPhase)

  // Session-related state - only changes at start/end
  const currentSession = useDebateStore((state) => state.currentSession)

  // Phase history - changes frequently during streaming
  const phaseHistory = useDebateStore((state) => state.phaseHistory)
  const currentPhaseRecord = useDebateStore((state) => state.currentPhaseRecord)

  // Diff selection - changes when user interacts with diff sidebar
  const selectedDiffPhaseId = useDebateStore((state) => state.selectedDiffPhaseId)
  const selectDiffPhase = useDebateStore((state) => state.selectDiffPhase)

  // Semantic state
  const semanticComparisons = useDebateStore((state) => state.semanticComparisons)
  const selectedTopicId = useDebateStore((state) => state.selectedTopicId)
  const selectTopic = useDebateStore((state) => state.selectTopic)

  // Progress state
  const progress = useDebateStore((state) => state.progress)

  // Actions - stable references
  const startDebate = useDebateStore((state) => state.startDebate)
  const stopDebate = useDebateStore((state) => state.stopDebate)
  const reset = useDebateStore((state) => state.reset)

  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchActors()
    loadRecentSessions()
  }, [fetchActors])

  const loadRecentSessions = async () => {
    try {
      const sessions = await apiClient.listSessions()
      setRecentSessions(sessions.slice(0, 5))
    } catch (err) {
      console.error('Failed to load recent sessions:', err)
    }
  }

  const handleStartDebate = async () => {
    if (!question.trim() || selectedActors.length < 2 || !judgeActorId) return

    try {
      // startDebate already calls streamDebate internally
      await startDebate(question, selectedActors, judgeActorId, { max_rounds: maxRounds })
      setView('debate')
    } catch (err) {
      console.error('Failed to start debate:', err)
    }
  }

  const handleBackToArena = () => {
    if (status === 'streaming') {
      stopDebate()
    }
    reset()
    setView('arena')
    loadRecentSessions()
  }

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setView('sessionDetail')
  }

  const selectedActorObjects = actors.filter((a) => selectedActors.includes(a.id))
  const judgeActor = actors.find((a) => a.id === judgeActorId)
  const nonJudgeActors = actors.filter((a) => !a.is_meta_judge)
  const judgeActors = actors.filter((a) => a.is_meta_judge)

  if (view === 'actors') {
    return <ActorManager onBack={() => setView('arena')} />
  }

  if (view === 'history') {
    return <SessionHistory onBack={() => setView('arena')} onSelect={handleSelectSession} />
  }

  if (view === 'settings') {
    return <SettingsView onBack={() => setView('arena')} />
  }

  if (view === 'sessionDetail' && selectedSessionId) {
    return <SessionDetailView sessionId={selectedSessionId} onBack={() => setView('arena')} />
  }

  if (view === 'debate') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center justify-between max-w-[1600px] mx-auto">
            <button
              onClick={handleBackToArena}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-lg font-semibold tracking-wider text-accent-orange">MAGI</h1>
            <div className="w-16" />
          </div>
        </header>

        {/* Debate content - main area with fixed height */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full max-w-[1600px] mx-auto px-6 py-4 flex flex-col">
            {/* Question - collapsible for long questions */}
            <QuestionBox question={question} />

            {/* Status - fixed */}
            <div className="mb-4 flex items-center gap-4 shrink-0">
              {status === 'connecting' && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  连接中...
                </div>
              )}
              {status === 'streaming' && (
                <ProgressBar
                  startedAt={progress.startedAt}
                  currentPhaseStartedAt={progress.currentPhaseStartedAt}
                  completedSteps={progress.completedSteps}
                  estimatedTotalSteps={progress.estimatedTotalSteps}
                  currentStepProgress={progress.currentStepProgress}
                  currentPhase={currentPhase}
                  status={status}
                />
              )}
              {status === 'completed' && (
                <div className="text-accent-green">互评完成</div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-accent-red">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}
            </div>

            {/* Debate view - scrollable area with consensus inside */}
            {status !== 'idle' && (
              <div className="flex-1 min-h-0">
                <DebateView
                  actors={selectedActorObjects}
                  judgeActor={judgeActor}
                  phaseHistory={phaseHistory}
                  currentPhaseRecord={currentPhaseRecord}
                  selectedDiffPhaseId={selectedDiffPhaseId}
                  onSelectDiffPhase={selectDiffPhase}
                  status={status}
                  currentPhase={currentPhase}
                  question={question}
                  semanticComparisons={semanticComparisons}
                  selectedTopicId={selectedTopicId}
                  onSelectTopic={selectTopic}
                  consensus={currentSession?.consensus}  // Pass consensus to DebateView
                />
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  // Arena view
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-semibold tracking-wider text-accent-orange">MAGI</h1>
            <nav className="flex items-center gap-6">
              <button
                onClick={() => setView('arena')}
                className="text-text-primary hover:text-accent-blue transition-colors"
              >
                Arena
              </button>
              <button
                onClick={() => setView('actors')}
                className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
              >
                <Users className="w-4 h-4" />
                Actors
              </button>
              <button
                onClick={() => setView('history')}
                className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
              >
                <History className="w-4 h-4" />
                History
              </button>
            </nav>
          </div>
          <button
            onClick={() => setView('settings')}
            className="text-text-secondary hover:text-text-primary transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-5xl font-serif tracking-widest text-accent-orange mb-4">MAGI</h2>
            <p className="text-xl text-text-secondary tracking-wide">
              Multi-Agent Guided Intelligence
            </p>
          </motion.div>

          {/* Question input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="输入你的问题，让多个 AI 互评求解..."
              className="w-full h-32 bg-bg-secondary border border-border rounded-2xl px-6 py-4 text-lg placeholder:text-text-tertiary focus:outline-none focus:border-accent-blue transition-colors resize-none"
            />
          </motion.div>

          {/* Actor selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <label className="text-text-secondary text-sm mb-3 block">参与互评的 Actor:</label>
            <div className="flex flex-wrap gap-3">
              {nonJudgeActors.map((actor) => (
                <ActorCard
                  key={actor.id}
                  actor={actor}
                  selected={selectedActors.includes(actor.id)}
                  onSelect={() => {
                    if (selectedActors.includes(actor.id)) {
                      deselectActor(actor.id)
                    } else if (selectedActors.length < 3) {
                      selectActor(actor.id)
                    }
                  }}
                />
              ))}
              <button
                onClick={() => setView('actors')}
                className="h-20 px-4 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-text-tertiary hover:border-accent-blue hover:text-accent-blue transition-colors"
              >
                <span className="text-2xl">+</span>
                <span className="text-xs">添加 Actor</span>
              </button>
            </div>
          </motion.div>

          {/* Judge selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <label className="text-text-secondary text-sm mb-3 block">总结模型:</label>
            <div className="flex gap-3">
              {judgeActors.map((actor) => (
                <ActorCard
                  key={actor.id}
                  actor={actor}
                  selected={judgeActorId === actor.id}
                  onSelect={() => setJudgeActor(actor.id)}
                  showJudgeBadge
                />
              ))}
            </div>
          </motion.div>

          {/* Config */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8 flex items-center gap-6"
          >
            <div className="flex items-center gap-3">
              <label className="text-text-secondary">最大互评轮数:</label>
              <select
                value={maxRounds}
                onChange={(e) => setMaxRounds(Number(e.target.value))}
                className="px-3 py-2 bg-bg-secondary border border-border rounded-lg focus:outline-none focus:border-accent-blue"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} 轮</option>
                ))}
              </select>
            </div>
          </motion.div>

          {/* Start button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={handleStartDebate}
              disabled={!question.trim() || selectedActors.length < 2 || !judgeActorId}
              className="w-full py-4 bg-accent-blue hover:bg-blue-600 disabled:bg-bg-tertiary disabled:text-text-tertiary text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              开始互评
            </button>
          </motion.div>

          {/* Recent sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12"
          >
            <h3 className="text-text-secondary text-sm mb-3">最近互评</h3>
            <div className="space-y-2">
              {recentSessions.length === 0 ? (
                <div className="text-text-tertiary text-sm">暂无历史记录</div>
              ) : (
                recentSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 flex items-center justify-between hover:border-accent-blue transition-colors text-left"
                  >
                    <span className="text-text-primary truncate">{session.question}</span>
                    {session.consensus_confidence && (
                      <span className="text-accent-green text-sm ml-2">
                        {Math.round(session.consensus_confidence * 100)}% 共识
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
```


### frontend\src\components\ConsensusView.tsx

```tsx
'use client'

import { motion } from 'framer-motion'
import { Consensus } from '@/types'
import { Check, X, Lightbulb } from 'lucide-react'
import MarkdownBlock from './MarkdownBlock'

interface ConsensusViewProps {
  consensus: Consensus
}

export default function ConsensusView({ consensus }: ConsensusViewProps) {
  const confidencePercent = consensus.confidence !== null && consensus.confidence !== undefined
    ? Math.round(consensus.confidence * 100)
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 bg-bg-secondary border border-accent-purple/30 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 bg-accent-purple/10 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-medium text-accent-purple">共识裁决</h3>
        <div className="flex items-center gap-2">
          {confidencePercent !== null ? (
            <>
              <div className="w-24 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidencePercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-accent-green"
                />
              </div>
              <span className="text-sm text-text-secondary">{confidencePercent}%</span>
            </>
          ) : (
            <span className="text-sm text-text-tertiary">置信度暂不可用</span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div>
          <h4 className="text-text-secondary text-sm mb-2">Summary</h4>
          <MarkdownBlock content={consensus.summary} />
        </div>

        {/* Agreements */}
        {consensus.agreements.length > 0 && (
          <div>
            <h4 className="text-text-secondary text-sm mb-2 flex items-center gap-2">
              <Check className="w-4 h-4 text-accent-green" />
              Agreements
            </h4>
            <ul className="space-y-2">
              {consensus.agreements.map((agreement, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent-green mt-1">•</span>
                  <MarkdownBlock content={agreement} className="flex-1" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disagreements */}
        {consensus.disagreements.length > 0 && (
          <div>
            <h4 className="text-text-secondary text-sm mb-2 flex items-center gap-2">
              <X className="w-4 h-4 text-accent-orange" />
              Disagreements
            </h4>
            <ul className="space-y-2">
              {consensus.disagreements.map((disagreement, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent-orange mt-1">•</span>
                  <MarkdownBlock content={disagreement} className="flex-1" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendation */}
        {consensus.recommendation && (
          <div className="bg-bg-tertiary rounded-xl p-4">
            <h4 className="text-text-secondary text-sm mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-accent-blue" />
              Recommendation
            </h4>
            <MarkdownBlock content={consensus.recommendation} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
```


### frontend\src\components\DebateView.tsx

```tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Actor, LivePhaseRecord, TopicComparison, Consensus } from '@/types'
import ReviewChatView from './ReviewChatView'
import SemanticSidebar from './SemanticSidebar'
import DiffSidebar from './DiffSidebar'
import MiniMagiMonitor from './MiniMagiMonitor'

interface DebateViewProps {
  actors: Actor[]
  judgeActor?: Actor
  phaseHistory: LivePhaseRecord[]
  currentPhaseRecord?: LivePhaseRecord | null
  selectedDiffPhaseId: string | null
  onSelectDiffPhase: (phaseId: string | null) => void
  status: string
  currentPhase: string
  question?: string
  semanticComparisons?: Map<string, TopicComparison[]>
  selectedTopicId?: string | null
  onSelectTopic?: (topicId: string | null) => void
  consensus?: Consensus | null  // Add consensus prop
}

type SidebarTab = 'semantic' | 'diff'

export default function DebateView({
  actors,
  judgeActor,
  phaseHistory,
  currentPhaseRecord,
  selectedDiffPhaseId,
  onSelectDiffPhase,
  status,
  currentPhase,
  question = '',
  semanticComparisons = new Map(),
  selectedTopicId = null,
  onSelectTopic,
  consensus,
}: DebateViewProps) {
  // Sidebar tab state
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('semantic')

  // Selected actors for diff comparison
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null)
  const [selectedCompareId, setSelectedCompareId] = useState<string | null>(null)

  // Get non-judge actors for the debate
  const debateActors = useMemo(() => {
    return actors.filter(a => !a.is_meta_judge)
  }, [actors])

  // All actors including judge for diff selector
  const allActorsForDiff = useMemo(() => {
    return actors
  }, [actors])

  // Set default selection when actors are available
  useEffect(() => {
    const nonJudgeActors = actors.filter(a => !a.is_meta_judge)
    if (nonJudgeActors.length >= 2 && !selectedBaseId && !selectedCompareId) {
      setSelectedBaseId(nonJudgeActors[0].id)
      setSelectedCompareId(nonJudgeActors[1].id)
    }
  }, [actors, selectedBaseId, selectedCompareId])

  // Check if semantic data is available
  const hasSemanticData = useMemo(() => {
    return semanticComparisons.size > 0
  }, [semanticComparisons])

  return (
    <div className="flex h-full min-h-0">
      {/* Main chat area (left ~2/3) - scrolls independently */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <ReviewChatView
          question={question}
          actors={debateActors}
          phaseHistory={phaseHistory}
          status={status}
          onMessageClick={(actorId) => {
            // On click, set this actor as base for diff
            setSelectedBaseId(actorId)
          }}
          consensus={consensus}
        />
      </div>

      {/* Right sidebar with tabs - scrolls independently */}
      <div className="w-80 lg:w-[420px] shrink-0 border-l border-border flex flex-col">
        {/* Mini MAGI Monitor - always visible at top */}
        <MiniMagiMonitor
          status={status as 'idle' | 'connecting' | 'streaming' | 'completed' | 'error'}
          currentPhase={currentPhase}
          currentPhaseRecord={currentPhaseRecord || null}
          phaseHistory={phaseHistory}
          actors={actors}
          judgeActor={judgeActor}
          semanticComparisons={semanticComparisons}
        />

        {/* Tab header */}
        <div className="flex border-b border-border bg-bg-secondary shrink-0">
          <button
            onClick={() => setSidebarTab('semantic')}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              sidebarTab === 'semantic'
                ? 'text-accent-blue border-b-2 border-accent-blue'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            语义图谱
          </button>
          <button
            onClick={() => setSidebarTab('diff')}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              sidebarTab === 'diff'
                ? 'text-accent-blue border-b-2 border-accent-blue'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            原文 Diff
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {sidebarTab === 'semantic' ? (
            <SemanticSidebar
              phaseHistory={phaseHistory}
              semanticComparisons={semanticComparisons}
              selectedDiffPhaseId={selectedDiffPhaseId}
              onSelectDiffPhase={onSelectDiffPhase}
              selectedTopicId={selectedTopicId}
              onSelectTopic={onSelectTopic || (() => {})}
              onSwitchToDiffTab={() => setSidebarTab('diff')}
              status={status}
              currentPhase={currentPhase}
              currentPhaseRecord={currentPhaseRecord}
            />
          ) : (
            <DiffSidebar
              actors={allActorsForDiff}
              phaseHistory={phaseHistory}
              selectedDiffPhaseId={selectedDiffPhaseId}
              onSelectDiffPhase={onSelectDiffPhase}
              selectedBaseId={selectedBaseId}
              selectedCompareId={selectedCompareId}
              onSelectBase={setSelectedBaseId}
              onSelectCompare={setSelectedCompareId}
            />
          )}
        </div>
      </div>
    </div>
  )
}
```


### frontend\src\components\DiffSidebar.tsx

```tsx
'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import { Actor, LivePhaseRecord, LivePhaseType } from '@/types'
import { computeDiff, computeDiffStats, canShowDiff, DiffLine } from '@/lib/reviewDiff'

interface DiffSidebarProps {
  actors: Actor[]
  phaseHistory: LivePhaseRecord[]
  selectedDiffPhaseId: string | null
  onSelectDiffPhase: (phaseId: string | null) => void
  selectedBaseId: string | null
  selectedCompareId: string | null
  onSelectBase: (id: string) => void
  onSelectCompare: (id: string) => void
}

const phaseLabels: Record<string, string> = {
  initial: '初始回答',
  review: '互评',
  revision: '修订',
  final_answer: '最终回答',
  summary: '总结',
}

function getPhaseLabel(record: LivePhaseRecord): string {
  const base = phaseLabels[record.phase] || record.phase
  if (record.cycle) {
    return `第 ${record.cycle} 轮 ${base}`
  }
  return base
}

// Simple diff cache to avoid recomputing on every render
const diffCache = new Map<string, { result: DiffLine[], timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds

function getCachedDiff(key: string): DiffLine[] | null {
  const cached = diffCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result
  }
  return null
}

function setCachedDiff(key: string, result: DiffLine[]) {
  diffCache.set(key, { result, timestamp: Date.now() })
}

export default function DiffSidebar({
  actors,
  phaseHistory,
  selectedDiffPhaseId,
  onSelectDiffPhase,
  selectedBaseId,
  selectedCompareId,
  onSelectBase,
  onSelectCompare,
}: DiffSidebarProps) {
  // Debounce state for diff computation
  const [debouncedContent, setDebouncedContent] = useState<{ base: string | null; compare: string | null }>({
    base: null,
    compare: null,
  })
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get comparable phases (phases with at least 2 actors with content)
  const comparablePhases = useMemo(() => {
    return phaseHistory.filter((record) => {
      // Only initial, review, revision phases are comparable
      if (!['initial', 'review', 'revision'].includes(record.phase)) {
        return false
      }
      const actorIds = Object.keys(record.messages)
      return actorIds.length >= 2
    })
  }, [phaseHistory])

  // Get the selected phase record
  const selectedPhase = useMemo(() => {
    if (!selectedDiffPhaseId) {
      // Default to the most recent comparable phase
      return comparablePhases[comparablePhases.length - 1] || null
    }
    return phaseHistory.find((r) => r.id === selectedDiffPhaseId) || null
  }, [phaseHistory, selectedDiffPhaseId, comparablePhases])

  // Get content for selected actors from the selected phase
  const baseContent = useMemo(() => {
    if (!selectedPhase || !selectedBaseId) return null
    return selectedPhase.messages[selectedBaseId]?.content || null
  }, [selectedPhase, selectedBaseId])

  const compareContent = useMemo(() => {
    if (!selectedPhase || !selectedCompareId) return null
    return selectedPhase.messages[selectedCompareId]?.content || null
  }, [selectedPhase, selectedCompareId])

  // Check if streaming - if any actor in the selected phase is streaming
  const isStreaming = useMemo(() => {
    if (!selectedPhase) return false
    return Object.values(selectedPhase.messages).some((msg) => msg.status === 'streaming')
  }, [selectedPhase])

  // Debounce content updates during streaming to avoid excessive diff recomputation
  useEffect(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // During streaming, debounce more aggressively
    const delay = isStreaming ? 300 : 100

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedContent({ base: baseContent, compare: compareContent })
    }, delay)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [baseContent, compareContent, isStreaming])

  // Compute diff with caching
  const diffResult = useMemo(() => {
    // Don't compute diff while streaming (unless we have cached result)
    if (isStreaming) {
      // Try to get cached result
      if (selectedPhase && selectedBaseId && selectedCompareId) {
        const cacheKey = `${selectedPhase.id}:${selectedBaseId}:${selectedCompareId}`
        const cached = getCachedDiff(cacheKey)
        if (cached) return cached
      }
      return null
    }

    if (!canShowDiff(debouncedContent.base, debouncedContent.compare)) return null

    // Check cache first
    if (selectedPhase && selectedBaseId && selectedCompareId) {
      const cacheKey = `${selectedPhase.id}:${selectedBaseId}:${selectedCompareId}`
      const cached = getCachedDiff(cacheKey)
      if (cached) return cached

      // Compute and cache
      const result = computeDiff(debouncedContent.base!, debouncedContent.compare!)
      setCachedDiff(cacheKey, result)
      return result
    }

    return computeDiff(debouncedContent.base!, debouncedContent.compare!)
  }, [debouncedContent.base, debouncedContent.compare, isStreaming, selectedPhase, selectedBaseId, selectedCompareId])

  // Compute stats
  const stats = useMemo(() => {
    if (!diffResult) return null
    return computeDiffStats(diffResult)
  }, [diffResult])

  // Check if selected phase is comparable
  const isPhaseComparable = selectedPhase && ['initial', 'review', 'revision'].includes(selectedPhase.phase)

  return (
    <div className="h-full flex flex-col bg-bg-secondary overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-text-secondary text-sm font-medium">差异对比</h3>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-b border-border space-y-3 shrink-0">
        {/* Phase selector */}
        <div>
          <label className="text-text-tertiary text-xs block mb-1">选择阶段</label>
          <select
            value={selectedDiffPhaseId || ''}
            onChange={(e) => onSelectDiffPhase(e.target.value || null)}
            className="w-full px-2 py-1.5 bg-bg-tertiary border border-border rounded-lg text-xs focus:outline-none focus:border-accent-blue"
          >
            {comparablePhases.length === 0 ? (
              <option value="">暂无可比较阶段</option>
            ) : (
              comparablePhases.map((record) => (
                <option key={record.id} value={record.id}>
                  第 {record.step} 步 · {getPhaseLabel(record)}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Actor selectors */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-text-tertiary text-xs block mb-1">Base</label>
            <select
              value={selectedBaseId || ''}
              onChange={(e) => onSelectBase(e.target.value)}
              className="w-full px-2 py-1.5 bg-bg-tertiary border border-border rounded-lg text-xs focus:outline-none focus:border-accent-blue"
            >
              <option value="">选择...</option>
              {actors.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-text-tertiary text-xs block mb-1">Compare</label>
            <select
              value={selectedCompareId || ''}
              onChange={(e) => onSelectCompare(e.target.value)}
              className="w-full px-2 py-1.5 bg-bg-tertiary border border-border rounded-lg text-xs focus:outline-none focus:border-accent-blue"
            >
              <option value="">选择...</option>
              {actors.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-4 text-xs shrink-0">
          <span className="text-accent-green">+{stats.additions}</span>
          <span className="text-accent-red">-{stats.removals}</span>
          <span className="text-text-tertiary">~{stats.unchanged}</span>
        </div>
      )}

      {/* Diff content - scrollable */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {!selectedBaseId || !selectedCompareId ? (
          <div className="text-text-tertiary text-xs text-center py-8">
            选择两个 Actor 进行比较
          </div>
        ) : !selectedPhase ? (
          <div className="text-text-tertiary text-xs text-center py-8">
            暂无可比较的阶段
          </div>
        ) : !isPhaseComparable ? (
          <div className="text-text-tertiary text-xs text-center py-8">
            该阶段只有单模型输出，不适合双向 diff
            <div className="mt-2">
              请选择初始回答、互评或修订阶段
            </div>
          </div>
        ) : !baseContent || !compareContent ? (
          <div className="text-text-tertiary text-xs text-center py-8">
            选中的 Actor 在该阶段暂无内容
          </div>
        ) : isStreaming ? (
          // During streaming, show a simple message instead of computing diff
          // This significantly improves performance and prevents UI freezes
          <div className="space-y-3">
            <div className="text-text-tertiary text-xs text-center py-4">
              <div className="animate-pulse mb-2">⏳ 正在生成内容...</div>
              <div className="text-text-tertiary/60">
                内容稳定后将显示差异对比
              </div>
            </div>
          </div>
        ) : diffResult && diffResult.length > 0 ? (
          <div className="font-mono text-xs space-y-0.5">
            {diffResult.map((item, idx) => (
              <DiffLineComponent key={idx} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-accent-green text-xs text-center py-8">
            内容一致，无差异
          </div>
        )}
      </div>
    </div>
  )
}

function DiffLineComponent({ item }: { item: DiffLine }) {
  const bgClass =
    item.type === 'add' ? 'bg-accent-green/10' :
    item.type === 'remove' ? 'bg-accent-red/10' :
    ''

  const textClass =
    item.type === 'add' ? 'text-accent-green' :
    item.type === 'remove' ? 'text-accent-red' :
    'text-text-tertiary'

  const prefix =
    item.type === 'add' ? '+' :
    item.type === 'remove' ? '-' :
    ' '

  return (
    <div className={`${bgClass} ${textClass} px-2 py-0.5 rounded flex`}>
      <span className="w-3 shrink-0">{prefix}</span>
      <span className="break-all">{item.text}</span>
    </div>
  )
}
```


### frontend\src\components\index.ts

```typescript
export { default as Splash } from './Splash'
export { default as Arena } from './Arena'
export { default as ActorCard } from './ActorCard'
export { default as DebateView } from './DebateView'
export { default as ActorManager } from './ActorManager'
export { default as SessionHistory } from './SessionHistory'
export { default as ConsensusView } from './ConsensusView'
export { default as SettingsView } from './SettingsView'
export { default as SessionDetailView } from './SessionDetailView'
export { default as ReviewChatView } from './ReviewChatView'
export { default as DiffSidebar } from './DiffSidebar'
export { default as MarkdownBlock } from './MarkdownBlock'
export { default as MiniMagiMonitor } from './MiniMagiMonitor'
export { default as ProgressBar } from './ProgressBar'
```


### frontend\src\components\MarkdownBlock.tsx

```tsx
'use client'

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

interface MarkdownBlockProps {
  content: string
  className?: string
}

/**
 * MarkdownBlock - Renders markdown content with GFM support and XSS protection.
 *
 * Features:
 * - GitHub Flavored Markdown (tables, strikethrough, task lists)
 * - XSS protection via rehype-sanitize
 * - Tailwind typography styles
 * - Streaming-friendly (works with partial markdown)
 */
export default function MarkdownBlock({ content, className = '' }: MarkdownBlockProps) {
  // Memoize the sanitize schema to avoid recreation on every render
  const sanitizeSchema = useMemo(() => ({
    // Allow standard HTML tags but strip dangerous attributes
    tagNames: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'strong', 'em', 'del', 's',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'div',
    ],
    attributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title'],
      code: ['className'],
      pre: ['className'],
      span: ['className'],
      th: ['align'],
      td: ['align'],
    },
  }), [])

  return (
    <div className={`prose prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={{
          // Custom styling for code blocks
          pre: ({ children }) => (
            <pre className="bg-bg-tertiary rounded-lg p-3 overflow-x-auto text-xs">
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-xs" {...props}>
                  {children}
                </code>
              )
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
          // Custom link styling
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-blue hover:underline"
            >
              {children}
            </a>
          ),
          // Custom table styling
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border px-2 py-1 bg-bg-tertiary text-left font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-2 py-1">
              {children}
            </td>
          ),
          // Custom list styling
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-2 text-text-primary">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 text-text-primary">
              {children}
            </ol>
          ),
          // Blockquote styling
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent-blue pl-3 my-2 text-text-secondary italic">
              {children}
            </blockquote>
          ),
          // Heading styles
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mt-4 mb-2 text-text-primary">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mt-3 mb-2 text-text-primary">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold mt-2 mb-1 text-text-primary">{children}</h3>
          ),
          // Paragraph
          p: ({ children }) => (
            <p className="my-1 text-text-primary">{children}</p>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
```


### frontend\src\components\MiniMagiMonitor.tsx

```tsx
'use client'

import { useMemo } from 'react'
import { Actor, LivePhaseRecord } from '@/types'

// Phase labels and explanations
const phaseInfo: Record<string, { label: string; explanation: string }> = {
  connecting: {
    label: '提訴受理',
    explanation: '系统正在初始化本次评审流程',
  },
  initial: {
    label: '初始回答中',
    explanation: '每个模型先独立回答问题',
  },
  review: {
    label: '交叉互评中',
    explanation: '模型之间正在指出彼此的盲点与漏洞',
  },
  revision: {
    label: '修订整合中',
    explanation: '模型正在根据批评修正观点',
  },
  semantic_pending: {
    label: '语义图谱构建中',
    explanation: '系统正在提炼核心共识与分歧维度',
  },
  final_answer: {
    label: '最终回答生成中',
    explanation: '总结模型正在整合多方观点',
  },
  summary: {
    label: '共识裁决中',
    explanation: '系统正在生成结构化共识报告',
  },
  completed: {
    label: '决议完成',
    explanation: '本次互评已完成',
  },
  error: {
    label: '系统异常',
    explanation: '本次流程发生错误',
  },
}

type NodeState = 'idle' | 'thinking' | 'done' | 'error' | 'judge_active'

interface MiniMagiMonitorProps {
  status: 'idle' | 'connecting' | 'streaming' | 'completed' | 'error'
  currentPhase: string
  currentPhaseRecord: LivePhaseRecord | null
  phaseHistory: LivePhaseRecord[]
  actors: Actor[]
  judgeActor?: Actor
  semanticComparisons?: Map<string, unknown[]>
}

// Derive node state from real data
function getNodeState(
  actorId: string,
  phaseRecord: LivePhaseRecord | null,
  isJudge: boolean,
  currentPhase: string,
  status: string
): NodeState {
  // If error state
  if (status === 'error') {
    return 'error'
  }

  // If completed
  if (status === 'completed') {
    return 'done'
  }

  // If connecting
  if (status === 'connecting') {
    return 'idle'
  }

  // If not streaming or no phase record
  if (status !== 'streaming' || !phaseRecord) {
    return 'idle'
  }

  // For judge in final_answer or summary phase
  if (isJudge && (currentPhase === 'final_answer' || currentPhase === 'summary')) {
    const judgeMessage = phaseRecord.messages[actorId]
    if (judgeMessage) {
      return judgeMessage.status === 'streaming' ? 'judge_active' : 'done'
    }
    // Judge hasn't started yet but we're in its phase
    return 'judge_active'
  }

  // For non-judge actors
  const message = phaseRecord.messages[actorId]
  if (!message) {
    return 'idle'
  }

  return message.status === 'streaming' ? 'thinking' : 'done'
}

export default function MiniMagiMonitor({
  status,
  currentPhase,
  currentPhaseRecord,
  phaseHistory,
  actors,
  judgeActor,
}: MiniMagiMonitorProps) {
  // Get non-judge actors
  const debateActors = useMemo(() => {
    return actors.filter(a => !a.is_meta_judge)
  }, [actors])

  // Determine current phase info
  const phaseData = useMemo(() => {
    // Check if we should show semantic pending state
    // This happens when:
    // 1. Current phase is initial or revision
    // 2. Phase has ended (no actors streaming)
    // 3. No semantic data yet
    // 4. Status is still streaming

    const isWaitingForSemantic =
      status === 'streaming' &&
      ['initial', 'revision'].includes(currentPhase) &&
      currentPhaseRecord &&
      Object.values(currentPhaseRecord.messages).every(m => m.status === 'done')

    if (isWaitingForSemantic) {
      return phaseInfo['semantic_pending']
    }

    if (status === 'connecting') {
      return phaseInfo['connecting']
    }

    if (status === 'error') {
      return phaseInfo['error']
    }

    if (status === 'completed') {
      return phaseInfo['completed']
    }

    return phaseInfo[currentPhase] || { label: currentPhase, explanation: '' }
  }, [status, currentPhase, currentPhaseRecord])

  // Get actor names for display
  const actorA = debateActors[0]
  const actorB = debateActors[1]

  // Calculate node states
  const actorAState = useMemo(() => {
    if (!actorA) return 'idle'
    return getNodeState(actorA.id, currentPhaseRecord, false, currentPhase, status)
  }, [actorA, currentPhaseRecord, currentPhase, status])

  const actorBState = useMemo(() => {
    if (!actorB) return 'idle'
    return getNodeState(actorB.id, currentPhaseRecord, false, currentPhase, status)
  }, [actorB, currentPhaseRecord, currentPhase, status])

  const judgeState = useMemo(() => {
    if (!judgeActor) return 'idle'
    return getNodeState(judgeActor.id, currentPhaseRecord, true, currentPhase, status)
  }, [judgeActor, currentPhaseRecord, currentPhase, status])

  // Count completed actors in current phase
  const completedCount = useMemo(() => {
    if (!currentPhaseRecord) return 0
    return Object.values(currentPhaseRecord.messages).filter(m => m.status === 'done').length
  }, [currentPhaseRecord])

  const totalActors = useMemo(() => {
    if (!currentPhaseRecord) return 0
    return Object.keys(currentPhaseRecord.messages).length
  }, [currentPhaseRecord])

  return (
    <div className="w-full bg-bg-secondary border-b border-border shrink-0">
      <style jsx>{`
        .monitor-svg {
          font-family: 'Noto Serif JP', serif;
        }
        .monitor-svg text {
          font-weight: 900;
          user-select: none;
        }
        .node-stroke {
          fill: transparent;
          stroke: var(--c-orange, #f26600);
          stroke-width: 3;
          stroke-linejoin: miter;
        }
        @keyframes pulse-blue {
          0%, 100% { fill: rgba(84, 165, 217, 0.3); }
          50% { fill: rgba(84, 165, 217, 0.6); }
        }
        @keyframes pulse-purple {
          0%, 100% { fill: rgba(147, 51, 234, 0.3); }
          50% { fill: rgba(147, 51, 234, 0.6); }
        }
        .state-thinking .node-fill {
          fill: rgba(84, 165, 217, 0.5);
          animation: pulse-blue 1.5s ease-in-out infinite;
        }
        .state-thinking .node-text {
          fill: #0a1f2e;
        }
        .state-done .node-fill {
          fill: rgba(103, 255, 140, 0.5);
        }
        .state-done .node-text {
          fill: #0a1f2e;
        }
        .state-error .node-fill {
          fill: rgba(227, 0, 0, 0.5);
        }
        .state-error .node-text {
          fill: #0a1f2e;
        }
        .state-judge_active .node-fill {
          fill: rgba(147, 51, 234, 0.5);
          animation: pulse-purple 1.5s ease-in-out infinite;
        }
        .state-judge_active .node-text {
          fill: #0a1f2e;
        }
        @keyframes flash-status {
          0%, 49.9% { fill: #fec200; stroke: #fec200; }
          50%, 100% { fill: rgba(254, 194, 0, 0.3); stroke: rgba(254, 194, 0, 0.3); }
        }
        .status-active rect {
          animation: flash-status 1s steps(1, end) infinite;
        }
        .status-active text {
          animation: flash-status 1s steps(1, end) infinite;
          stroke: none;
        }
      `}</style>

      {/* Header with phase label */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs text-accent-orange font-medium tracking-wider">MAGI</span>
        <span className="text-xs text-text-secondary">{phaseData.label}</span>
      </div>

      {/* SVG Monitor */}
      <div className="px-2 py-2">
        <svg
          className="monitor-svg w-full"
          viewBox="0 0 300 140"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Connection lines */}
          <g stroke="#f26600" strokeWidth="4" opacity="0.6">
            <line x1="150" y1="85" x2="185" y2="110" />
            <line x1="150" y1="85" x2="115" y2="110" />
          </g>

          {/* Center MAGI label */}
          <text x="150" y="65" textAnchor="middle" fill="#f26600" fontSize="14" letterSpacing="0.15em">
            MAGI
          </text>

          {/* Judge node (top) */}
          <g className={`state-${judgeState}`} transform="translate(100, 10)">
            <polygon
              className="node-fill"
              points="50,0 100,0 100,35 85,50 65,50 50,35"
              fill="transparent"
            />
            <polygon
              className="node-stroke"
              points="50,0 100,0 100,35 85,50 65,50 50,35"
            />
            <text
              x="75"
              y="30"
              textAnchor="middle"
              className="node-text"
              fontSize="10"
              fill="transparent"
            >
              {judgeActor ? judgeActor.name.slice(0, 6).toUpperCase() : 'JUDGE'}
            </text>
          </g>

          {/* Actor A node (bottom left) */}
          <g className={`state-${actorAState}`} transform="translate(20, 85)">
            <polygon
              className="node-fill"
              points="0,0 80,0 80,30 70,45 10,45 0,30"
              fill="transparent"
            />
            <polygon
              className="node-stroke"
              points="0,0 80,0 80,30 70,45 10,45 0,30"
            />
            <text
              x="40"
              y="28"
              textAnchor="middle"
              className="node-text"
              fontSize="9"
              fill="transparent"
            >
              {actorA ? actorA.name.slice(0, 8).toUpperCase() : 'ACTOR A'}
            </text>
          </g>

          {/* Actor B node (bottom right) */}
          <g className={`state-${actorBState}`} transform="translate(200, 85)">
            <polygon
              className="node-fill"
              points="0,0 80,0 80,30 70,45 10,45 0,30"
              fill="transparent"
            />
            <polygon
              className="node-stroke"
              points="0,0 80,0 80,30 70,45 10,45 0,30"
            />
            <text
              x="40"
              y="28"
              textAnchor="middle"
              className="node-text"
              fontSize="9"
              fill="transparent"
            >
              {actorB ? actorB.name.slice(0, 8).toUpperCase() : 'ACTOR B'}
            </text>
          </g>

          {/* Status box */}
          <g
            className={`status-active`}
            transform="translate(190, 10)"
            style={{ opacity: status === 'streaming' || status === 'connecting' ? 1 : 0.7 }}
          >
            <rect
              x="0"
              y="0"
              width="100"
              height="28"
              strokeWidth="2"
              fill="none"
              stroke="#fec200"
            />
            <text
              x="50"
              y="18"
              fontSize="11"
              textAnchor="middle"
              fill="#fec200"
              letterSpacing="0.05em"
            >
              {status === 'completed' ? '完了' : status === 'error' ? '異常' : '処理中'}
            </text>
          </g>
        </svg>
      </div>

      {/* Phase explanation */}
      <div className="px-3 pb-2">
        <p className="text-xs text-text-tertiary text-center">{phaseData.explanation}</p>
        {status === 'streaming' && totalActors > 0 && (
          <p className="text-xs text-text-tertiary text-center mt-1">
            {completedCount}/{totalActors} 模型完成
          </p>
        )}
      </div>
    </div>
  )
}
```


### frontend\src\components\ProgressBar.tsx

```tsx
'use client'

import { useMemo } from 'react'

interface ProgressProps {
  startedAt: number | null
  currentPhaseStartedAt: number | null
  completedSteps: number
  estimatedTotalSteps: number
  currentStepProgress: number
  currentPhase: string
  status: string
}

const phaseInfo: Record<string, { label: string; explanation: string }> = {
  initial: {
    label: '初始回答',
    explanation: '每个模型先独立回答问题',
  },
  review: {
    label: '互评',
    explanation: '模型之间正在指出彼此的盲点与漏洞',
  },
  revision: {
    label: '修订',
    explanation: '模型正在根据批评修正观点',
  },
  final_answer: {
    label: '最终回答',
    explanation: '总结模型正在整合多方观点，输出面向用户的最终回答',
  },
  summary: {
    label: '总结',
    explanation: '系统正在生成结构化共识报告',
  },
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}分${remainingSeconds}秒`
}

function formatETA(remainingMs: number): string {
  if (remainingMs < 0) return '即将完成'
  return formatDuration(remainingMs)
}

export default function ProgressBar({
  startedAt,
  currentPhaseStartedAt,
  completedSteps,
  estimatedTotalSteps,
  currentStepProgress,
  currentPhase,
  status,
}: ProgressProps) {
  const progress = useMemo(() => {
    if (!startedAt) return { percent: 0, elapsed: 0, eta: 0 }

    const now = Date.now()
    const elapsed = now - startedAt

    // Calculate overall progress
    const overallProgress = (completedSteps + currentStepProgress) / estimatedTotalSteps
    const percent = Math.min(100, Math.round(overallProgress * 100))

    // Calculate ETA based on average time per step
    let eta = 0
    if (completedSteps > 0 && overallProgress > 0) {
      const avgTimePerStep = elapsed / (completedSteps + currentStepProgress)
      const remainingSteps = estimatedTotalSteps - completedSteps - currentStepProgress
      eta = Math.max(0, remainingSteps * avgTimePerStep)
    }

    return { percent, elapsed, eta }
  }, [startedAt, completedSteps, estimatedTotalSteps, currentStepProgress])

  if (status === 'idle' || status === 'completed') return null

  const phaseData = phaseInfo[currentPhase] || { label: currentPhase, explanation: '' }

  return (
    <div className="flex items-center gap-4 text-sm">
      {/* Progress bar */}
      <div className="flex-1 max-w-xs">
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-blue rounded-full transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {/* Progress text */}
      <div className="flex items-center gap-3 text-text-secondary">
        <span className="text-xs">{progress.percent}%</span>
        <span className="text-xs">{phaseData.label}</span>
        <span className="text-xs text-text-tertiary">
          {formatDuration(progress.elapsed)}
        </span>
        {progress.eta > 0 && status === 'streaming' && (
          <span className="text-xs text-text-tertiary">
            预计 {formatETA(progress.eta)}
          </span>
        )}
      </div>

      {/* Phase explanation - shown on a new line below the progress */}
      {phaseData.explanation && (
        <span className="text-xs text-text-tertiary hidden lg:inline">
          {phaseData.explanation}
        </span>
      )}
    </div>
  )
}
```


### frontend\src\components\QuestionBox.tsx

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'

interface QuestionBoxProps {
  question: string
  label?: string
  className?: string
  maxLines?: number
}

export default function QuestionBox({
  question,
  label = '问题',
  className = '',
  maxLines = 3,
}: QuestionBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const questionRef = useRef<HTMLDivElement>(null)
  const [needsTruncation, setNeedsTruncation] = useState(false)

  useEffect(() => {
    const el = questionRef.current
    if (!el) return

    const measure = () => {
      const computed = getComputedStyle(el)
      const lineHeight = parseFloat(computed.lineHeight)
      const fontSize = parseFloat(computed.fontSize)

      const effectiveLineHeight =
        Number.isFinite(lineHeight) && lineHeight > 0
          ? lineHeight
          : fontSize * 1.5

      const maxHeight = effectiveLineHeight * maxLines
      setNeedsTruncation(el.scrollHeight > maxHeight + 2)
    }

    measure()

    const observer = new ResizeObserver(() => {
      measure()
    })
    observer.observe(el)

    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [question, maxLines])

  // 折叠状态变化时，如果重新缩回，也重新测一次
  useEffect(() => {
    const el = questionRef.current
    if (!el) return

    const computed = getComputedStyle(el)
    const lineHeight = parseFloat(computed.lineHeight)
    const fontSize = parseFloat(computed.fontSize)
    const effectiveLineHeight =
      Number.isFinite(lineHeight) && lineHeight > 0
        ? lineHeight
        : fontSize * 1.5

    const maxHeight = effectiveLineHeight * maxLines
    setNeedsTruncation(el.scrollHeight > maxHeight + 2)
  }, [isExpanded, maxLines])

  const collapsedMaxHeight = `${28 * maxLines}px` // 对应 leading-7 ≈ 28px

  return (
    <div className={`shrink-0 ${className}`}>
      {/* Header with label and expand/collapse button */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-lg text-text-secondary">{label}</h2>

        {needsTruncation && (
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((v) => !v)}
            className={`
              inline-flex items-center gap-1.5
              h-8 px-3 rounded-full
              border text-sm font-medium
              transition-all duration-200
              ${
                isExpanded
                  ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
                  : 'bg-bg-tertiary/80 border-white/10 text-text-secondary hover:text-text-primary hover:border-accent-blue/40 hover:bg-accent-blue/10'
              }
            `}
          >
            {isExpanded ? '收起问题' : '展开问题'}
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}
      </div>

      {/* Question content with gradient overlay and bottom CTA */}
      <div className="relative">
        <div
          ref={questionRef}
          className="text-xl font-medium leading-7 overflow-hidden transition-all duration-200"
          style={!isExpanded && needsTruncation ? { maxHeight: collapsedMaxHeight } : undefined}
        >
          {question}
        </div>

        {/* Gradient overlay + bottom CTA when collapsed */}
        {!isExpanded && needsTruncation && (
          <>
            {/* Gradient mask */}
            <div
              className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent cursor-pointer"
              onClick={() => setIsExpanded(true)}
            />

            {/* Bottom CTA button */}
            <div className="absolute bottom-2 right-2">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="
                  inline-flex items-center gap-1.5
                  h-8 px-3 rounded-full
                  bg-black/50 backdrop-blur-md
                  border border-white/10
                  text-sm font-medium text-white
                  hover:bg-accent-blue/20
                  hover:border-accent-blue/40
                  transition-all duration-200
                  shadow-lg
                "
              >
                展开完整问题
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```


### frontend\src\components\ReviewChatView.tsx

```tsx
'use client'

import { memo, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Actor, LivePhaseRecord, LiveMessage, ConvergenceData, Consensus } from '@/types'
import ConsensusView from './ConsensusView'
import MarkdownBlock from './MarkdownBlock'

interface ReviewChatViewProps {
  question: string
  actors: Actor[]
  phaseHistory: LivePhaseRecord[]
  status: string
  onMessageClick?: (actorId: string, phase: string) => void
  consensus?: Consensus | null  // Add consensus prop
}

const phaseLabels: Record<string, string> = {
  initial: '初始回答',
  review: '互评',
  revision: '修订',
  final_answer: '最终回答',
  summary: '共识总结',
  judging: '总结中',
}

function getPhaseTitle(record: LivePhaseRecord): string {
  const base = phaseLabels[record.phase] || record.phase
  if (record.cycle) {
    return `第 ${record.step} 步 · 第 ${record.cycle} 轮${base}`
  }
  return `第 ${record.step} 步 · ${base}`
}

// Memoized MessageCard to prevent re-renders when unrelated state changes
const MessageCard = memo(function MessageCard({
  message,
  onMessageClick,
}: {
  message: LiveMessage
  onMessageClick?: (actorId: string, phase: string) => void
}) {
  // Don't render Markdown during streaming - use plain text for performance
  const isStreaming = message.status === 'streaming'

  return (
    <motion.div
      key={`${message.actorId}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onMessageClick?.(message.actorId, message.phase)}
      className="bg-bg-secondary border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-accent-blue/50 transition-colors"
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3 border-b border-border"
        style={{ backgroundColor: `${message.actorColor}10` }}
      >
        <span className="text-xl">{message.actorIcon}</span>
        <span className="font-medium" style={{ color: message.actorColor }}>
          {message.actorName}
        </span>
        <span className="px-2 py-0.5 bg-text-tertiary/20 text-text-tertiary text-xs rounded">
          {phaseLabels[message.phase] || message.phase}
        </span>
        {isStreaming && (
          <span className="text-xs text-accent-blue animate-pulse">streaming...</span>
        )}
      </div>

      {/* Content - plain text during streaming, Markdown when done */}
      <div className="px-4 py-4">
        {isStreaming ? (
          // Plain text during streaming for performance
          <div className="whitespace-pre-wrap break-words text-text-primary">
            {message.content}
            <span className="inline-block w-2 h-4 bg-text-primary animate-pulse ml-1" />
          </div>
        ) : (
          // Full Markdown rendering only when message is complete
          <MarkdownBlock content={message.content} />
        )}
      </div>
    </motion.div>
  )
})

// Memoized ConvergenceCard
const ConvergenceCard = memo(function ConvergenceCard({ convergence }: { convergence: ConvergenceData }) {
  const scorePercent = Math.round(convergence.score * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bg-secondary border border-accent-purple/30 rounded-2xl overflow-hidden"
    >
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border bg-accent-purple/10">
        <span className="text-xl">📊</span>
        <span className="font-medium text-accent-purple">收敛分析</span>
        <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold ${
          convergence.converged
            ? 'bg-accent-green/20 text-accent-green'
            : 'bg-accent-orange/20 text-accent-orange'
        }`}>
          {convergence.converged ? '已收敛' : '继续讨论'}
        </span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Score */}
        <div className="flex items-center gap-3">
          <span className="text-text-tertiary text-sm">共识度</span>
          <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                convergence.converged ? 'bg-accent-green' : 'bg-accent-blue'
              }`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <span className="text-text-primary font-mono text-sm">{scorePercent}%</span>
        </div>

        {/* Reason */}
        {convergence.reason && (
          <div className="text-text-secondary text-sm">
            {convergence.reason}
          </div>
        )}

        {/* Agreements */}
        {convergence.agreements && convergence.agreements.length > 0 && (
          <div>
            <div className="text-accent-green text-xs mb-1">✓ 已达成共识</div>
            <ul className="text-text-tertiary text-xs space-y-1 list-disc list-inside">
              {convergence.agreements.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Disagreements */}
        {convergence.disagreements && convergence.disagreements.length > 0 && (
          <div>
            <div className="text-accent-orange text-xs mb-1">⚡ 仍存分歧</div>
            <ul className="text-text-tertiary text-xs space-y-1 list-disc list-inside">
              {convergence.disagreements.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  )
})

export default function ReviewChatView({
  question,
  actors,
  phaseHistory,
  status,
  onMessageClick,
  consensus,
}: ReviewChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (scrollRef.current && status === 'streaming') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [phaseHistory, status])

  // Build ordered messages from phase history
  // Filter out summary phase - it should only show via ConsensusView, not in chat stream
  const phases = useMemo(() => {
    return phaseHistory
      .filter((record) => record.phase !== 'summary') // Don't show summary in chat
      .map((record) => {
        const messages = Object.values(record.messages) as LiveMessage[]
        // Sort messages by actor order
        const sortedMessages = messages.sort((a, b) => {
          const aIndex = actors.findIndex((act) => act.id === a.actorId)
          const bIndex = actors.findIndex((act) => act.id === b.actorId)
          return aIndex - bIndex
        })

        return {
          record,
          messages: sortedMessages,
        }
      })
  }, [phaseHistory, actors])

  return (
    <div ref={scrollRef} className="space-y-6 overflow-y-auto h-full pb-8 pr-2">
      {/* Question */}
      <div className="bg-bg-secondary border border-border rounded-2xl p-4">
        <div className="text-text-tertiary text-xs mb-2">问题</div>
        <div className="text-text-primary font-medium">{question}</div>
      </div>

      {/* All phases (summary is filtered out - shows via ConsensusView instead) */}
      <AnimatePresence mode="popLayout">
        {phases.map(({ record, messages }) => (
          <motion.div
            key={record.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {/* Phase separator */}
            <div className="flex items-center gap-4 py-2 sticky top-0 bg-bg-primary z-10">
              <div className="text-text-secondary text-sm font-medium">
                {getPhaseTitle(record)}
              </div>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Messages */}
            {messages.map((msg) => (
              <MessageCard
                key={msg.actorId}
                message={msg}
                onMessageClick={onMessageClick}
              />
            ))}

            {/* Convergence result for revision phases */}
            {record.phase === 'revision' && record.convergence && (
              <ConvergenceCard convergence={record.convergence} />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Waiting state */}
      {phases.length === 0 && status === 'streaming' && (
        <div className="text-center text-text-tertiary py-8">
          <div className="animate-pulse">等待响应...</div>
        </div>
      )}

      {/* Consensus - rendered inside scrollable area */}
      {consensus && status === 'completed' && (
        <ConsensusView consensus={consensus} />
      )}
    </div>
  )
}
```


### frontend\src\components\SemanticSidebar.tsx

```tsx
'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TopicComparison, ActorPosition, LivePhaseRecord } from '@/types'

interface SemanticSidebarProps {
  phaseHistory: LivePhaseRecord[]
  semanticComparisons: Map<string, TopicComparison[]>
  selectedDiffPhaseId: string | null
  onSelectDiffPhase: (phaseId: string | null) => void
  selectedTopicId: string | null
  onSelectTopic: (topicId: string | null) => void
  onShowRawDiff?: () => void
  onSwitchToDiffTab?: () => void  // Callback to switch to diff tab
  status?: string
  currentPhase?: string
  currentPhaseRecord?: LivePhaseRecord | null
}

const phaseLabels: Record<string, string> = {
  initial: '初始回答',
  review: '互评',
  revision: '修订',
  final_answer: '最终回答',
  summary: '总结',
}

function getPhaseLabel(record: LivePhaseRecord): string {
  const base = phaseLabels[record.phase] || record.phase
  if (record.cycle) {
    return `第 ${record.cycle} 轮 ${base}`
  }
  return base
}

function getDisagreementColor(score: number): string {
  if (score <= 0.3) return 'bg-green-500'
  if (score <= 0.6) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getDisagreementBorderColor(score: number): string {
  if (score <= 0.3) return 'border-green-400'
  if (score <= 0.6) return 'border-yellow-400'
  return 'border-red-400'
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'converged': return '已共识'
    case 'divergent': return '有分歧'
    default: return '部分一致'
  }
}

export default function SemanticSidebar({
  phaseHistory,
  semanticComparisons,
  selectedDiffPhaseId,
  onSelectDiffPhase,
  selectedTopicId,
  onSelectTopic,
  onShowRawDiff,
  onSwitchToDiffTab,
  status = 'idle',
  currentPhase = '',
  currentPhaseRecord = null,
}: SemanticSidebarProps) {
  const [showRawDiff, setShowRawDiff] = useState(false)
  const [hasUserSelectedPhase, setHasUserSelectedPhase] = useState(false)
  const [hasUserSelectedTopic, setHasUserSelectedTopic] = useState(false)

  // Get comparable phases - phases that have semantic comparison data
  const comparablePhases = useMemo(() => {
    return phaseHistory.filter((record) => {
      // Only initial and revision phases have semantic comparisons
      if (!['initial', 'revision'].includes(record.phase)) {
        return false
      }
      // Check if this phase has semantic data using the record's id as phase_id
      return semanticComparisons.has(record.id)
    })
  }, [phaseHistory, semanticComparisons])

  // Auto-select the most recent phase with semantic data (only if user hasn't selected)
  useEffect(() => {
    if (!hasUserSelectedPhase && comparablePhases.length > 0 && !selectedDiffPhaseId) {
      // Select the most recent phase with semantic data
      const lastPhase = comparablePhases[comparablePhases.length - 1]
      onSelectDiffPhase(lastPhase.id)
    }
  }, [comparablePhases, hasUserSelectedPhase, selectedDiffPhaseId, onSelectDiffPhase])

  // Get the selected phase comparisons
  const selectedComparisons = useMemo(() => {
    if (!selectedDiffPhaseId) {
      // Default to the most recent phase with comparisons
      for (let i = phaseHistory.length - 1; i >= 0; i--) {
        const record = phaseHistory[i]
        if (semanticComparisons.has(record.id)) {
          return semanticComparisons.get(record.id) || []
        }
      }
      return []
    }

    // Use the phase_id (record.id) directly to lookup comparisons
    return semanticComparisons.get(selectedDiffPhaseId) || []
  }, [phaseHistory, selectedDiffPhaseId, semanticComparisons])

  // Auto-select the highest salience topic (only if user hasn't selected)
  useEffect(() => {
    if (!hasUserSelectedTopic && selectedComparisons.length > 0 && !selectedTopicId) {
      // Select the topic with highest salience
      const topTopic = selectedComparisons.reduce((prev, curr) =>
        curr.salience > prev.salience ? curr : prev
      )
      onSelectTopic(topTopic.topic_id)
    }
  }, [selectedComparisons, hasUserSelectedTopic, selectedTopicId, onSelectTopic])

  // Get selected topic
  const selectedTopic = useMemo(() => {
    if (!selectedTopicId || !selectedComparisons.length) return null
    return selectedComparisons.find((c) => c.topic_id === selectedTopicId) || null
  }, [selectedTopicId, selectedComparisons])

  // Calculate stats
  const stats = useMemo(() => {
    if (!selectedComparisons.length) return null

    const converged = selectedComparisons.filter((c) => c.status === 'converged').length
    const divergent = selectedComparisons.filter((c) => c.status === 'divergent').length
    const avgDisagreement = selectedComparisons.reduce((sum, c) => sum + c.disagreement_score, 0) / selectedComparisons.length

    return {
      total: selectedComparisons.length,
      converged,
      divergent,
      avgDisagreement,
    }
  }, [selectedComparisons])

  // Check if we're in a live session waiting for semantic data
  const isLiveWaiting = useMemo(() => {
    // Live session is streaming and current phase is one that should have semantic data
    const isRelevantPhase = ['initial', 'revision'].includes(currentPhase)
    const isStreaming = status === 'streaming'
    const hasPhaseData = currentPhaseRecord && Object.keys(currentPhaseRecord.messages).length > 0
    const allActorsDone = hasPhaseData && Object.values(currentPhaseRecord.messages).every(m => m.status === 'done')
    const noSemanticData = comparablePhases.length === 0 || !semanticComparisons.has(selectedDiffPhaseId || '')

    return isStreaming && isRelevantPhase && allActorsDone && noSemanticData
  }, [status, currentPhase, currentPhaseRecord, comparablePhases, semanticComparisons, selectedDiffPhaseId])

  // Check if this is a completed session with no semantic data
  const isCompletedNoData = useMemo(() => {
    return (status === 'completed' || status === 'idle') && comparablePhases.length === 0
  }, [status, comparablePhases])

  // Handle phase selection
  const handlePhaseSelect = (phaseId: string) => {
    setHasUserSelectedPhase(true)
    setHasUserSelectedTopic(false) // Reset topic selection when phase changes
    onSelectDiffPhase(phaseId || null)
  }

  // Handle topic selection
  const handleTopicSelect = (topicId: string | null) => {
    setHasUserSelectedTopic(true)
    onSelectTopic(topicId)
  }

  return (
    <div className="h-full flex flex-col bg-bg-secondary overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-text-secondary text-sm font-medium">语义分歧图谱</h3>
      </div>

      {/* Phase selector */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <label className="text-text-tertiary text-xs block mb-1">选择阶段</label>
        <select
          value={selectedDiffPhaseId || ''}
          onChange={(e) => handlePhaseSelect(e.target.value)}
          className="w-full px-2 py-1.5 bg-bg-tertiary border border-border rounded-lg text-xs focus:outline-none focus:border-accent-blue"
        >
          {comparablePhases.length === 0 ? (
            <option value="">暂无语义分析结果</option>
          ) : (
            comparablePhases.map((record) => (
              <option key={record.id} value={record.id}>
                第 {record.step} 步 · {getPhaseLabel(record)}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Stats */}
      {stats && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-4 text-xs shrink-0">
          <span className="text-accent-green">{stats.converged} 共识</span>
          <span className="text-accent-red">{stats.divergent} 分歧</span>
          <span className="text-text-tertiary">
            平均分歧度 {Math.round(stats.avgDisagreement * 100)}%
          </span>
        </div>
      )}

      {/* Topic list with labels - not just bubbles - scrollable */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {!selectedComparisons.length ? (
          <div className="text-text-tertiary text-xs text-center py-8 space-y-4">
            {isLiveWaiting ? (
              <>
                {/* Live waiting state - show skeleton */}
                <div className="text-text-secondary">语义图谱构建中...</div>
                <div className="text-text-tertiary text-xs">系统会在本轮回答完成后提炼共识与分歧维度</div>

                {/* Skeleton placeholder */}
                <div className="space-y-2 mt-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-10 bg-bg-tertiary rounded-lg animate-pulse"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>

                {/* CTA to switch to diff */}
                {phaseHistory.some(r => ['initial', 'review', 'revision'].includes(r.phase) && Object.keys(r.messages).length >= 2) && onSwitchToDiffTab && (
                  <button
                    onClick={onSwitchToDiffTab}
                    className="px-4 py-2 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors mt-4"
                  >
                    先查看原文差异对比
                  </button>
                )}
              </>
            ) : isCompletedNoData ? (
              <>
                {/* Completed session with no data */}
                <div className="text-text-secondary">本次记录没有可用的语义图谱数据</div>
                <div className="text-text-tertiary text-xs">可能是会话未能正常完成</div>
                {onSwitchToDiffTab && (
                  <button
                    onClick={onSwitchToDiffTab}
                    className="px-4 py-2 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors mt-4"
                  >
                    查看原文差异对比
                  </button>
                )}
              </>
            ) : comparablePhases.length === 0 ? (
              <>
                {/* No comparable phases yet */}
                <div className="text-text-secondary">当前阶段的语义图谱尚未生成</div>
                <div className="text-text-tertiary text-xs">语义分析会在本轮回答完成后自动生成</div>
                {phaseHistory.some(r => ['initial', 'review', 'revision'].includes(r.phase) && Object.keys(r.messages).length >= 2) && onSwitchToDiffTab && (
                  <button
                    onClick={onSwitchToDiffTab}
                    className="px-4 py-2 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors mt-4"
                  >
                    查看原文差异对比
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Selected phase has no data */}
                <div>该阶段暂无语义分析结果</div>
                {onSwitchToDiffTab && (
                  <button
                    onClick={onSwitchToDiffTab}
                    className="px-4 py-2 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors"
                  >
                    查看原文差异对比
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Topic list with labels */}
            <div className="space-y-1">
              {selectedComparisons.map((comparison) => {
                const isSelected = selectedTopicId === comparison.topic_id

                return (
                  <motion.button
                    key={comparison.topic_id}
                    onClick={() => handleTopicSelect(isSelected ? null : comparison.topic_id)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg border transition-all duration-200
                      ${isSelected
                        ? 'bg-accent-blue/10 border-accent-blue'
                        : 'bg-bg-tertiary border-border hover:border-text-tertiary'
                      }
                    `}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-primary truncate">
                        {comparison.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${getDisagreementColor(comparison.disagreement_score)}`}
                        />
                        <span className={`text-xs ${
                          comparison.status === 'converged'
                            ? 'text-accent-green'
                            : comparison.status === 'divergent'
                            ? 'text-accent-red'
                            : 'text-accent-orange'
                        }`}>
                          {getStatusLabel(comparison.status)}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-text-tertiary pt-2 border-t border-border">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>共识</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>部分</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>分歧</span>
              </div>
            </div>

            {/* Topic detail */}
            <AnimatePresence mode="wait">
              {selectedTopic && (
                <motion.div
                  key={selectedTopic.topic_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-3 bg-bg-tertiary rounded-lg border border-border"
                >
                  {/* Topic header */}
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-text-primary font-medium">{selectedTopic.label}</h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        selectedTopic.status === 'converged'
                          ? 'bg-green-500/20 text-green-400'
                          : selectedTopic.status === 'divergent'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {getStatusLabel(selectedTopic.status)}
                    </span>
                  </div>

                  {/* Agreement summary */}
                  {selectedTopic.agreement_summary && (
                    <div className="mb-2">
                      <div className="text-xs text-accent-green mb-1">一致点</div>
                      <p className="text-xs text-text-secondary">
                        {selectedTopic.agreement_summary}
                      </p>
                    </div>
                  )}

                  {/* Disagreement summary */}
                  {selectedTopic.disagreement_summary && (
                    <div className="mb-3">
                      <div className="text-xs text-accent-red mb-1">分歧点</div>
                      <p className="text-xs text-text-secondary">
                        {selectedTopic.disagreement_summary}
                      </p>
                    </div>
                  )}

                  {/* Actor positions */}
                  <div className="space-y-2">
                    <div className="text-xs text-text-tertiary">各模型观点</div>
                    {selectedTopic.actor_positions.map((position, idx) => (
                      <ActorPositionCard key={idx} position={position} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Raw diff toggle */}
      {onShowRawDiff && (
        <div className="px-4 py-2 border-t border-border shrink-0">
          <button
            onClick={() => setShowRawDiff(!showRawDiff)}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {showRawDiff ? '隐藏原文对照' : '显示原文对照'}
          </button>
        </div>
      )}
    </div>
  )
}

function ActorPositionCard({ position }: { position: ActorPosition }) {
  return (
    <div className="p-2 bg-bg-secondary rounded border border-border">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-text-primary">
          {position.actor_name || 'Unknown'}
        </span>
        {position.stance_label && (
          <span className="text-xs text-text-tertiary px-1.5 py-0.5 bg-bg-tertiary rounded">
            {position.stance_label}
          </span>
        )}
      </div>
      {position.summary && (
        <p className="text-xs text-text-secondary">{position.summary}</p>
      )}
      {position.quotes && position.quotes.length > 0 && (
        <div className="mt-1 text-xs text-text-tertiary italic">
          "{position.quotes[0]}"
        </div>
      )}
    </div>
  )
}
```


### frontend\src\components\SessionDetailView.tsx

```tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { DebateSession, Actor, SemanticAnalysisResult, TopicComparison } from '@/types'
import {
  hydrateSessionToPhaseHistory,
  hydrateSemanticToMap,
  hydrateConsensus,
} from '@/lib/sessionHydrator'
import DebateView from './DebateView'
import QuestionBox from './QuestionBox'

interface SessionDetailViewProps {
  sessionId: string
  onBack: () => void
}

export default function SessionDetailView({ sessionId, onBack }: SessionDetailViewProps) {
  const [session, setSession] = useState<DebateSession | null>(null)
  const [semantic, setSemantic] = useState<SemanticAnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDiffPhaseId, setSelectedDiffPhaseId] = useState<string | null>(null)
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)

  useEffect(() => {
    loadSession()
  }, [sessionId])

  const loadSession = async () => {
    setLoading(true)
    setError(null)
    try {
      // Load both session and semantic analysis in parallel
      const [sessionData, semanticData] = await Promise.all([
        apiClient.getDebate(sessionId),
        apiClient.getSemanticAnalysis(sessionId).catch(() => null), // Don't fail if semantic is missing
      ])
      setSession(sessionData)
      setSemantic(semanticData)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Convert historical data to live format
  const phaseHistory = useMemo(() => {
    if (!session) return []
    return hydrateSessionToPhaseHistory(session)
  }, [session])

  // Convert semantic data to comparisons map
  const semanticComparisons = useMemo(() => {
    return hydrateSemanticToMap(semantic)
  }, [semantic])

  // Get consensus
  const consensus = useMemo(() => {
    if (!session) return null
    return hydrateConsensus(session)
  }, [session])

  // Get actors (non-judge for debate view)
  const debateActors = useMemo(() => {
    if (!session) return []
    return session.actors.filter(a => !a.is_meta_judge)
  }, [session])

  // Get judge actor
  const judgeActor = useMemo(() => {
    if (!session) return undefined
    return session.judge_actor
  }, [session])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col">
        <header className="border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center justify-between max-w-[1600px] mx-auto">
            <button onClick={onBack} className="text-text-secondary hover:text-text-primary transition-colors">
              ← Back
            </button>
            <h1 className="text-lg font-semibold tracking-wider text-accent-orange">MAGI</h1>
            <div className="w-16" />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-text-tertiary" />
        </main>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="h-screen flex flex-col">
        <header className="border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center justify-between max-w-[1600px] mx-auto">
            <button onClick={onBack} className="text-text-secondary hover:text-text-primary transition-colors">
              ← Back
            </button>
            <h1 className="text-lg font-semibold tracking-wider text-accent-orange">MAGI</h1>
            <div className="w-16" />
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <AlertCircle className="w-12 h-12 text-accent-red" />
          <div className="text-accent-red text-lg">{error || 'Session not found'}</div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors"
          >
            返回列表
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <button
            onClick={onBack}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-lg font-semibold tracking-wider text-accent-orange">互评详情</h1>
          <div className="w-16" />
        </div>
      </header>

      {/* Main Content - uses unified DebateView */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-[1600px] mx-auto px-6 py-4 flex flex-col">
          {/* Question */}
          <div className="mb-4 shrink-0">
            <QuestionBox question={session.question} className="mb-0" />
            <p className="text-text-tertiary text-sm mt-2">{formatDate(session.created_at)}</p>
          </div>

          {/* Status */}
          <div className="mb-4 shrink-0">
            <span className={`px-3 py-1 rounded-full text-sm ${
              session.status === 'completed' ? 'bg-accent-green/20 text-accent-green' :
              session.status === 'debating' ? 'bg-accent-blue/20 text-accent-blue' :
              'bg-text-tertiary/20 text-text-tertiary'
            }`}>
              {session.status === 'completed' ? '已完成' : session.status}
            </span>
          </div>

          {/* Debate view - uses the same component as live mode */}
          <div className="flex-1 min-h-0">
            <DebateView
              actors={debateActors}
              judgeActor={judgeActor}
              phaseHistory={phaseHistory}
              currentPhaseRecord={null}
              selectedDiffPhaseId={selectedDiffPhaseId}
              onSelectDiffPhase={setSelectedDiffPhaseId}
              status="completed"
              currentPhase="completed"
              question={session.question}
              semanticComparisons={semanticComparisons}
              selectedTopicId={selectedTopicId}
              onSelectTopic={setSelectedTopicId}
              consensus={consensus}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
```


### frontend\src\components\SessionHistory.tsx

```tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, Check, X } from 'lucide-react'
import { useDebateStore } from '@/stores'
import { SessionListItem } from '@/types'

interface SessionHistoryProps {
  onBack: () => void
  onSelect: (sessionId: string) => void
}

export default function SessionHistory({ onBack, onSelect }: SessionHistoryProps) {
  const { sessions, fetchSessions } = useDebateStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions().finally(() => setLoading(false))
  }, [fetchSessions])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusIcon = (status: string, confidence?: number) => {
    if (status === 'completed' && confidence && confidence > 0.7) {
      return <Check className="w-4 h-4 text-accent-green" />
    }
    if (status === 'completed') {
      return <X className="w-4 h-4 text-accent-orange" />
    }
    return <Clock className="w-4 h-4 text-text-tertiary" />
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-lg font-semibold tracking-wider text-accent-orange">History</h1>
          <div className="w-16" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center text-text-secondary">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-text-secondary">
              No debate history yet. Start your first debate!
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session, index) => (
                <motion.button
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelect(session.id)}
                  className="w-full bg-bg-secondary border border-border rounded-2xl p-4 hover:border-accent-blue transition-colors text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary truncate">{session.question}</p>
                      <p className="text-text-tertiary text-sm mt-1">
                        {formatDate(session.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {getStatusIcon(session.status, session.consensus_confidence)}
                      {session.consensus_confidence && (
                        <span className="text-sm text-text-secondary">
                          {Math.round(session.consensus_confidence * 100)}% 共识
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
```


### frontend\src\components\SettingsView.tsx

```tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'

interface WorkflowPrompt {
  id: string
  key: string
  name: string
  description: string
  template_text: string
  required_variables: string[]
  created_at: string
  updated_at: string | null
}

interface PromptPreset {
  id: string
  key: string
  name: string
  description: string
  system_prompt: string
  review_prompt: string
  revision_prompt: string
  personality: string
  custom_instructions: string
  is_builtin: boolean
  created_at: string
  updated_at: string | null
}

type SettingsTab = 'workflow' | 'presets'

interface SettingsViewProps {
  onBack: () => void
}

export default function SettingsView({ onBack }: SettingsViewProps) {
  const [tab, setTab] = useState<SettingsTab>('workflow')
  const [workflowPrompts, setWorkflowPrompts] = useState<WorkflowPrompt[]>([])
  const [promptPresets, setPromptPresets] = useState<PromptPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({})
  const [editedPresets, setEditedPresets] = useState<Record<string, Partial<PromptPreset>>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [prompts, presets] = await Promise.all([
        apiClient.request<WorkflowPrompt[]>('/api/settings/workflow-prompts'),
        apiClient.request<PromptPreset[]>('/api/settings/prompt-presets'),
      ])
      setWorkflowPrompts(prompts)
      setPromptPresets(presets)

      // Initialize edited state
      const initialEdits: Record<string, string> = {}
      prompts.forEach(p => {
        initialEdits[p.key] = p.template_text
      })
      setEditedPrompts(initialEdits)
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveWorkflowPrompt = async (key: string) => {
    setSaving(key)
    try {
      await apiClient.request(`/api/settings/workflow-prompts/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ template_text: editedPrompts[key] }),
      })
      // Reload to get updated timestamp
      await loadData()
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(null)
    }
  }

  const savePromptPreset = async (key: string) => {
    setSaving(key)
    try {
      const edits = editedPresets[key]
      if (edits) {
        await apiClient.request(`/api/settings/prompt-presets/${key}`, {
          method: 'PUT',
          body: JSON.stringify(edits),
        })
        await loadData()
      }
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(null)
    }
  }

  const formatKey = (key: string) => {
    return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-lg font-semibold tracking-wider text-accent-orange">Settings</h1>
          <button
            onClick={loadData}
            className="text-text-secondary hover:text-text-primary transition-colors"
            title="Reload"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-border">
            <button
              onClick={() => setTab('workflow')}
              className={`pb-3 px-4 transition-colors ${
                tab === 'workflow'
                  ? 'text-accent-blue border-b-2 border-accent-blue'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              工作流提示词
            </button>
            <button
              onClick={() => setTab('presets')}
              className={`pb-3 px-4 transition-colors ${
                tab === 'presets'
                  ? 'text-accent-blue border-b-2 border-accent-blue'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Actor 预设
            </button>
          </div>

          {loading ? (
            <div className="text-center text-text-secondary py-12">Loading...</div>
          ) : tab === 'workflow' ? (
            /* Workflow Prompts */
            <div className="space-y-6">
              {workflowPrompts.map((prompt) => (
                <motion.div
                  key={prompt.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-bg-secondary border border-border rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium">{prompt.name}</h3>
                      <p className="text-text-tertiary text-sm mt-1">{prompt.description}</p>
                    </div>
                    <button
                      onClick={() => saveWorkflowPrompt(prompt.key)}
                      disabled={saving === prompt.key}
                      className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {saving === prompt.key ? 'Saving...' : 'Save'}
                    </button>
                  </div>

                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {prompt.required_variables.map((v) => (
                        <span
                          key={v}
                          className="px-2 py-1 bg-accent-orange/20 text-accent-orange text-xs rounded"
                        >
                          {'{{'}{v}{'}}'}
                        </span>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={editedPrompts[prompt.key] || prompt.template_text}
                    onChange={(e) =>
                      setEditedPrompts((prev) => ({
                        ...prev,
                        [prompt.key]: e.target.value,
                      }))
                    }
                    className="w-full h-48 px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue resize-none font-mono text-sm"
                  />

                  {prompt.updated_at && (
                    <p className="text-text-tertiary text-xs mt-2">
                      Last updated: {new Date(prompt.updated_at).toLocaleString('zh-CN')}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            /* Prompt Presets */
            <div className="space-y-6">
              {promptPresets.map((preset) => (
                <motion.div
                  key={preset.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-bg-secondary border border-border rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 mr-4">
                      <input
                        type="text"
                        value={editedPresets[preset.key]?.name ?? preset.name}
                        onChange={(e) =>
                          setEditedPresets((prev) => ({
                            ...prev,
                            [preset.key]: {
                              ...prev[preset.key],
                              name: e.target.value,
                            },
                          }))
                        }
                        className="text-lg font-medium bg-transparent border-b border-transparent hover:border-border focus:border-accent-blue focus:outline-none w-full"
                      />
                      <input
                        type="text"
                        value={editedPresets[preset.key]?.description ?? preset.description}
                        onChange={(e) =>
                          setEditedPresets((prev) => ({
                            ...prev,
                            [preset.key]: {
                              ...prev[preset.key],
                              description: e.target.value,
                            },
                          }))
                        }
                        className="text-text-tertiary text-sm mt-1 bg-transparent border-b border-transparent hover:border-border focus:border-accent-blue focus:outline-none w-full"
                        placeholder="描述..."
                      />
                    </div>
                    <button
                      onClick={() => savePromptPreset(preset.key)}
                      disabled={saving === preset.key}
                      className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors shrink-0"
                    >
                      <Save className="w-4 h-4" />
                      {saving === preset.key ? 'Saving...' : 'Save'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-text-secondary text-sm block mb-1">System Prompt</label>
                      <textarea
                        value={editedPresets[preset.key]?.system_prompt ?? preset.system_prompt}
                        onChange={(e) =>
                          setEditedPresets((prev) => ({
                            ...prev,
                            [preset.key]: {
                              ...prev[preset.key],
                              system_prompt: e.target.value,
                            },
                          }))
                        }
                        className="w-full h-24 px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue resize-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-text-secondary text-sm block mb-1">Review Prompt</label>
                      <textarea
                        value={editedPresets[preset.key]?.review_prompt ?? preset.review_prompt}
                        onChange={(e) =>
                          setEditedPresets((prev) => ({
                            ...prev,
                            [preset.key]: {
                              ...prev[preset.key],
                              review_prompt: e.target.value,
                            },
                          }))
                        }
                        className="w-full h-20 px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue resize-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-text-secondary text-sm block mb-1">Revision Prompt</label>
                      <textarea
                        value={editedPresets[preset.key]?.revision_prompt ?? preset.revision_prompt}
                        onChange={(e) =>
                          setEditedPresets((prev) => ({
                            ...prev,
                            [preset.key]: {
                              ...prev[preset.key],
                              revision_prompt: e.target.value,
                            },
                          }))
                        }
                        className="w-full h-20 px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue resize-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-text-secondary text-sm block mb-1">额外指令</label>
                      <textarea
                        value={editedPresets[preset.key]?.custom_instructions ?? preset.custom_instructions}
                        onChange={(e) =>
                          setEditedPresets((prev) => ({
                            ...prev,
                            [preset.key]: {
                              ...prev[preset.key],
                              custom_instructions: e.target.value,
                            },
                          }))
                        }
                        className="w-full h-16 px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue resize-none text-sm"
                        placeholder="附加到所有提示词后的指令..."
                      />
                    </div>
                  </div>

                  {preset.updated_at && (
                    <p className="text-text-tertiary text-xs mt-2">
                      Last updated: {new Date(preset.updated_at).toLocaleString('zh-CN')}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
```


### frontend\src\components\Splash.tsx

```tsx
'use client'

import { useEffect, useRef } from 'react'

interface SplashProps {
  onComplete: () => void
}

export default function Splash({ onComplete }: SplashProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load the font
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@900&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)

    // Run the boot animation
    const balthasar = document.getElementById('node-balthasar')
    const casper = document.getElementById('node-casper')
    const melchior = document.getElementById('node-melchior')
    const shingiBox = document.getElementById('ui-shingi')

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    function resetNodes() {
      [balthasar, casper, melchior].forEach(node => {
        if (node) {
          node.classList.remove('state-thinking', 'state-approved', 'state-rejected')
        }
      })
      if (shingiBox) {
        shingiBox.classList.remove('active')
      }
    }

    let running = true

    async function bootMagiOS() {
      // First cycle - show animation
      resetNodes()
      await wait(1500)

      if (!running) return

      shingiBox?.classList.add('active')
      ;[balthasar, casper, melchior].forEach(n => n?.classList.add('state-thinking'))
      await wait(3500)

      if (!running) return

      resetNodes()
      const states = ['state-approved', 'state-rejected']
      ;[balthasar, casper, melchior].forEach(n => {
        const randomState = states[Math.floor(Math.random() * 2)]
        n?.classList.add(randomState)
      })

      await wait(2500)

      // Animation complete, trigger callback
      if (running) {
        onComplete()
      }
    }

    bootMagiOS()

    return () => {
      running = false
      resetNodes()
    }
  }, [onComplete])

  return (
    <div ref={containerRef}>
      <style jsx global>{`
        :root {
          --c-bg: #000000;
          --c-orange: #f26600;
          --c-orange-dim: rgba(242, 102, 0, 0.4);
          --c-green-line: #2b7a5f;
          --c-fill-blue: #54a5d9;
          --c-fill-green: #67ff8c;
          --c-fill-red: #e30000;
          --c-text-idle: transparent;
          --c-text-dark: #0a1f2e;
          --c-yellow: #fec200;
          --hz-4: 0.4s;
        }

        .magi-splash-container {
          margin: 0;
          padding: 0;
          width: 100vw;
          height: 100vh;
          background-color: var(--c-bg);
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          font-family: 'Noto Serif JP', serif;
        }

        .magi-splash-svg {
          width: 100%;
          height: 100%;
          max-width: 1920px;
          max-height: 1080px;
          filter: drop-shadow(0 0 3px var(--c-orange-dim));
        }

        .magi-splash-svg text {
          font-weight: 900;
          user-select: none;
        }

        .magi-splash-svg .header-text { fill: var(--c-orange); letter-spacing: 0.1em; }
        .magi-splash-svg .magi-text { fill: var(--c-orange); letter-spacing: 0.25em; font-size: 48px; }
        .magi-splash-svg .node-text { fill: var(--c-text-idle); letter-spacing: 0.05em; font-size: 50px; }

        .magi-splash-svg .node-stroke {
          fill: transparent;
          stroke: var(--c-orange);
          stroke-width: 8;
          stroke-linejoin: miter;
        }

        .magi-splash-svg .scanline-mask {
          fill: url(#scanline-pattern);
          pointer-events: none;
        }

        @keyframes flash-fill-blue {
          0%, 49.9% { fill: var(--c-fill-blue); }
          50%, 100% { fill: transparent; }
        }
        @keyframes flash-text-dark {
          0%, 49.9% { fill: var(--c-text-dark); }
          50%, 100% { fill: transparent; }
        }
        .magi-splash-svg .state-thinking .node-fill { animation: flash-fill-blue var(--hz-4) steps(1, end) infinite; }
        .magi-splash-svg .state-thinking .node-text { animation: flash-text-dark var(--hz-4) steps(1, end) infinite; }

        .magi-splash-svg .state-approved .node-fill { fill: var(--c-fill-green); }
        .magi-splash-svg .state-approved .node-text { fill: var(--c-text-dark); }

        .magi-splash-svg .state-rejected .node-fill { fill: var(--c-fill-red); }
        .magi-splash-svg .state-rejected .node-text { fill: var(--c-text-dark); }

        .magi-splash-svg .shingi-box { opacity: 0; }
        .magi-splash-svg .shingi-box.active { opacity: 1; }
        @keyframes flash-shingi {
          0%, 49.9% { fill: var(--c-yellow); stroke: var(--c-yellow); }
          50%, 100% { fill: rgba(254, 194, 0, 0.3); stroke: rgba(254, 194, 0, 0.3); }
        }
        .magi-splash-svg .shingi-box.active rect { animation: flash-shingi 1s steps(1, end) infinite; }
        .magi-splash-svg .shingi-box.active text { animation: flash-shingi 1s steps(1, end) infinite; stroke: none; }
      `}</style>

      <div className="magi-splash-container">
        <svg className="magi-splash-svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="scanline-pattern" patternUnits="userSpaceOnUse" width="4" height="4">
              <line x1="0" y1="0" x2="4" y2="0" stroke="rgba(0,0,0,0.15)" strokeWidth="2" />
            </pattern>
          </defs>

          <rect x="40" y="40" width="1840" height="1000" stroke="var(--c-orange)" strokeWidth="3" fill="none" />
          <rect x="70" y="70" width="1780" height="940" stroke="var(--c-orange)" strokeWidth="8" fill="none" />

          <g transform="translate(180, 160)">
            <line x1="0" y1="0" x2="400" y2="0" stroke="var(--c-green-line)" strokeWidth="6" />
            <line x1="0" y1="16" x2="400" y2="16" stroke="var(--c-green-line)" strokeWidth="6" />
            <text x="200" y="160" fontSize="140" textAnchor="middle" className="header-text">提訴</text>
            <line x1="0" y1="200" x2="400" y2="200" stroke="var(--c-green-line)" strokeWidth="6" />
            <line x1="0" y1="216" x2="400" y2="216" stroke="var(--c-green-line)" strokeWidth="6" />
          </g>

          <g transform="translate(1340, 160)">
            <line x1="0" y1="0" x2="400" y2="0" stroke="var(--c-green-line)" strokeWidth="6" />
            <line x1="0" y1="16" x2="400" y2="16" stroke="var(--c-green-line)" strokeWidth="6" />
            <text x="200" y="160" fontSize="140" textAnchor="middle" className="header-text">決議</text>
            <line x1="0" y1="200" x2="400" y2="200" stroke="var(--c-green-line)" strokeWidth="6" />
            <line x1="0" y1="216" x2="400" y2="216" stroke="var(--c-green-line)" strokeWidth="6" />
          </g>

          <g className="shingi-box" id="ui-shingi" transform="translate(1420, 420)">
            <rect x="0" y="0" width="240" height="80" strokeWidth="4" fill="none" />
            <text x="120" y="58" fontSize="50" textAnchor="middle" letterSpacing="0.1em">審議中</text>
          </g>

          <g stroke="var(--c-orange)" strokeWidth="30">
            <line x1="850" y1="860" x2="1070" y2="860" />
            <line x1="775" y1="515" x2="725" y2="675" />
            <line x1="1145" y1="515" x2="1195" y2="675" />
          </g>

          <text x="960" y="700" textAnchor="middle" className="magi-text">MAGI</text>

          <g id="node-balthasar" className="magi-group">
            <polygon className="node-fill" points="710,140 1210,140 1210,450 1080,580 840,580 710,450" fill="transparent"/>
            <polygon className="scanline-mask" points="710,140 1210,140 1210,450 1080,580 840,580 710,450" />
            <polygon className="node-stroke" points="710,140 1210,140 1210,450 1080,580 840,580 710,450" />
            <text x="960" y="380" textAnchor="middle" className="node-text" fontSize="75">BALTHASAR</text>
          </g>

          <g id="node-casper" className="magi-group">
            <polygon className="node-fill" points="250,550 600,550 850,800 850,940 250,940" fill="transparent"/>
            <polygon className="scanline-mask" points="250,550 600,550 850,800 850,940 250,940" />
            <polygon className="node-stroke" points="250,550 600,550 850,800 850,940 250,940" />
            <text x="500" y="780" textAnchor="middle" className="node-text">CASPER</text>
          </g>

          <g id="node-melchior" className="magi-group">
            <polygon className="node-fill" points="1670,550 1320,550 1070,800 1070,940 1670,940" fill="transparent"/>
            <polygon className="scanline-mask" points="1670,550 1320,550 1070,800 1070,940 1670,940" />
            <polygon className="node-stroke" points="1670,550 1320,550 1070,800 1070,940 1670,940" />
            <text x="1370" y="780" textAnchor="middle" className="node-text">MELCHIOR</text>
          </g>
        </svg>
      </div>
    </div>
  )
}
```


### frontend\src\lib\apiClient.ts

```typescript
/**
 * Unified API client for frontend
 *
 * - Normal REST calls use Next.js proxy (/api/...)
 * - SSE streams use direct backend connection
 */

// Backend URL for SSE (bypasses Next.js proxy to avoid buffering)
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

// Base URL for normal REST calls (uses Next.js proxy)
const REST_BASE = ''

interface ApiError {
  detail: string
}

class ApiClient {
  async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${REST_BASE}${path}`
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!res.ok) {
      const error: ApiError = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(error.detail || `HTTP ${res.status}`)
    }

    return res.json()
  }

  // Actors
  async listActors() {
    return this.request<import('@/types').Actor[]>('/api/actors')
  }

  async getActor(id: string) {
    return this.request<import('@/types').ActorDetail>(`/api/actors/${id}`)
  }

  async createActor(data: unknown) {
    return this.request<import('@/types').Actor>('/api/actors', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateActor(id: string, data: unknown) {
    return this.request<import('@/types').Actor>(`/api/actors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteActor(id: string) {
    return this.request<{ message: string }>(`/api/actors/${id}`, {
      method: 'DELETE',
    })
  }

  async testActor(id: string) {
    return this.request<{ status: string; response: string }>(`/api/actors/${id}/test`, {
      method: 'POST',
    })
  }

  // Debate
  async startDebate(data: {
    question: string
    actor_ids: string[]
    judge_actor_id: string
    config?: { max_rounds?: number }
  }) {
    return this.request<{ session_id: string }>('/api/debate/start', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        config: data.config || { max_rounds: 3 },
      }),
    })
  }

  async getDebate(sessionId: string) {
    return this.request<import('@/types').DebateSession>(`/api/debate/${sessionId}`)
  }

  async stopDebate(sessionId: string) {
    return this.request<{ message: string }>(`/api/debate/${sessionId}/stop`, {
      method: 'POST',
    })
  }

  // Sessions
  async listSessions() {
    return this.request<import('@/types').SessionListItem[]>('/api/sessions')
  }

  // Semantic Analysis
  async getSemanticAnalysis(sessionId: string) {
    return this.request<import('@/types').SemanticAnalysisResult>(`/api/debate/${sessionId}/semantic`)
  }

  // SSE Stream URL
  getStreamUrl(sessionId: string) {
    return `${API_BASE}/api/debate/${sessionId}/stream`
  }
}

export const apiClient = new ApiClient()
```


### frontend\src\lib\reviewDiff.ts

```typescript
/**
 * Diff utility for comparing text content between actors.
 * Provides Git-like line-level diff visualization.
 */

export interface DiffLine {
  type: 'add' | 'remove' | 'same'
  text: string
}

/**
 * Split text into sentences/lines for diff comparison.
 * Handles both Chinese and English punctuation.
 */
function splitIntoLines(text: string): string[] {
  // Split by sentence-ending punctuation and newlines
  // Use + instead of * to avoid matching empty strings
  return text
    .split(/[。！？\n；;.]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/**
 * Compute diff between two texts.
 * Uses a simple set-based approach for sentence-level comparison.
 */
export function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = splitIntoLines(oldText)
  const newLines = splitIntoLines(newText)

  const result: DiffLine[] = []
  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)

  // Find lines that were removed (in old but not in new)
  const removed = oldLines.filter(l => !newSet.has(l))
  // Find lines that were added (in new but not in old)
  const added = newLines.filter(l => !oldSet.has(l))
  // Find lines that are the same
  const same = oldLines.filter(l => newSet.has(l))

  // Sort by appearance order in the original/new texts
  const oldIndex = new Map(oldLines.map((l, i) => [l, i]))
  const newIndex = new Map(newLines.map((l, i) => [l, i]))

  // Build combined ordered list
  const allLines = new Set([...oldLines, ...newLines])
  const orderedLines = Array.from(allLines).sort((a, b) => {
    const aOld = oldIndex.get(a) ?? Infinity
    const bOld = oldIndex.get(b) ?? Infinity
    const aNew = newIndex.get(a) ?? Infinity
    const bNew = newIndex.get(b) ?? Infinity
    return Math.min(aOld, aNew) - Math.min(bOld, bNew)
  })

  for (const line of orderedLines) {
    const inOld = oldSet.has(line)
    const inNew = newSet.has(line)

    if (inOld && !inNew) {
      result.push({ type: 'remove', text: line })
    } else if (inNew && !inOld) {
      result.push({ type: 'add', text: line })
    } else {
      result.push({ type: 'same', text: line })
    }
  }

  return result
}

/**
 * Compute diff statistics.
 */
export function computeDiffStats(diff: DiffLine[]): {
  additions: number
  removals: number
  unchanged: number
} {
  return {
    additions: diff.filter(d => d.type === 'add').length,
    removals: diff.filter(d => d.type === 'remove').length,
    unchanged: diff.filter(d => d.type === 'same').length,
  }
}

/**
 * Check if two texts are similar enough to show diff.
 * Returns false if either text is empty or too short.
 */
export function canShowDiff(text1: string | undefined | null, text2: string | undefined | null): boolean {
  if (!text1 || !text2) return false
  if (text1.length < 10 || text2.length < 10) return false
  return true
}
```


### frontend\src\lib\sessionHydrator.ts

```typescript
/**
 * Session Hydrator - Convert historical session data to live format.
 *
 * This module provides utilities to transform database session data
 * into the same format used by live SSE streaming, enabling the
 * unified DebateWorkspace component to render both live and historical
 * sessions consistently.
 */

import {
  DebateSession,
  Round,
  Message,
  LivePhaseRecord,
  LiveMessage,
  LivePhaseType,
  TopicComparison,
  SemanticAnalysisResult,
  Consensus,
  ConvergenceData,
} from '@/types'

/**
 * Convert a historical session to live phase history format.
 */
export function hydrateSessionToPhaseHistory(session: DebateSession): LivePhaseRecord[] {
  const phaseHistory: LivePhaseRecord[] = []
  const actorMap = new Map(session.actors.map(a => [a.id, a]))
  if (session.judge_actor) {
    actorMap.set(session.judge_actor.id, session.judge_actor)
  }

  // Group messages by round/phase
  for (const round of session.rounds) {
    // Skip summary phase in chat - it's shown via ConsensusView
    if (round.phase === 'summary') continue

    const record: LivePhaseRecord = {
      id: `${round.round_number}:${round.phase}`,
      step: round.round_number,
      phase: round.phase as LivePhaseType,
      messages: {},
    }

    for (const msg of round.messages) {
      // Skip summary role messages
      if (msg.role === 'summary') continue

      const actor = actorMap.get(msg.actor_id)
      const liveMessage: LiveMessage = {
        actorId: msg.actor_id,
        actorName: actor?.name || msg.actor_name || 'Unknown',
        actorIcon: actor?.icon || '🤖',
        actorColor: actor?.display_color || '#9333EA',
        phase: round.phase as LivePhaseType,
        step: round.round_number,
        content: msg.content,
        status: 'done',
      }
      record.messages[msg.actor_id] = liveMessage
    }

    phaseHistory.push(record)
  }

  return phaseHistory
}

/**
 * Convert semantic analysis result to comparisons map.
 *
 * The key format matches the phase_id used in live streaming:
 * - For initial: "1:initial"
 * - For revision: "step:revision" (cycle is not stored in DB, use step)
 */
export function hydrateSemanticToMap(
  semantic: SemanticAnalysisResult | null
): Map<string, TopicComparison[]> {
  const comparisons = new Map<string, TopicComparison[]>()

  if (!semantic || !semantic.comparisons) {
    return comparisons
  }

  // Group comparisons by phase_id
  // The API returns round_number and phase, construct phase_id from them
  for (const comp of semantic.comparisons) {
    if (comp.round_number && comp.phase) {
      const phaseId = `${comp.round_number}:${comp.phase}`
      if (!comparisons.has(phaseId)) {
        comparisons.set(phaseId, [])
      }
      comparisons.get(phaseId)!.push(comp)
    }
  }

  return comparisons
}

/**
 * Extract consensus from session.
 */
export function hydrateConsensus(session: DebateSession): Consensus | null {
  if (!session.consensus) return null

  return {
    summary: session.consensus.summary,
    agreements: session.consensus.agreements,
    disagreements: session.consensus.disagreements,
    confidence: session.consensus.confidence,
    recommendation: session.consensus.recommendation,
  }
}

/**
 * Extract question intent from semantic analysis.
 */
export function hydrateQuestionIntent(semantic: SemanticAnalysisResult | null) {
  if (!semantic || !semantic.question_intent) return null

  return {
    question_type: semantic.question_intent.question_type,
    user_goal: semantic.question_intent.user_goal,
    time_horizons: semantic.question_intent.time_horizons,
    comparison_axes: semantic.question_intent.comparison_axes,
  }
}
```


### frontend\src\lib\utils.ts

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```


### frontend\src\stores\actorStore.ts

```typescript
import { create } from 'zustand'
import { Actor, ActorDetail } from '@/types'
import { apiClient } from '@/lib/apiClient'

interface ActorState {
  actors: Actor[]
  actorDetails: Record<string, ActorDetail>
  selectedActors: string[]
  judgeActorId: string | null
  loading: boolean
  error: string | null

  fetchActors: () => Promise<void>
  fetchActorDetail: (id: string) => Promise<ActorDetail>
  createActor: (data: Partial<ActorDetail>) => Promise<Actor>
  updateActor: (id: string, data: Partial<ActorDetail>) => Promise<void>
  deleteActor: (id: string) => Promise<void>
  testActor: (id: string) => Promise<{ status: string; response: string }>

  selectActor: (id: string) => void
  deselectActor: (id: string) => void
  setJudgeActor: (id: string) => void
}

export const useActorStore = create<ActorState>((set, get) => ({
  actors: [],
  actorDetails: {},
  selectedActors: [],
  judgeActorId: null,
  loading: false,
  error: null,

  fetchActors: async () => {
    set({ loading: true, error: null })
    try {
      const actors = await apiClient.listActors()
      set({ actors, loading: false })

      const judges = actors.filter((a: Actor) => a.is_meta_judge)
      const nonJudges = actors.filter((a: Actor) => !a.is_meta_judge)

      if (get().selectedActors.length === 0 && nonJudges.length >= 2) {
        set({ selectedActors: [nonJudges[0].id, nonJudges[1].id] })
      }
      if (!get().judgeActorId && judges.length > 0) {
        set({ judgeActorId: judges[0].id })
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  fetchActorDetail: async (id: string) => {
    const cached = get().actorDetails[id]
    if (cached) return cached

    const detail = await apiClient.getActor(id)
    set((state) => ({ actorDetails: { ...state.actorDetails, [id]: detail } }))
    return detail
  },

  createActor: async (data) => {
    const payload = {
      name: data.name,
      display_color: data.display_color,
      icon: data.icon,
      is_meta_judge: data.is_meta_judge,
      api_config: {
        provider: data.provider,
        api_format: data.api_format,
        base_url: data.base_url,
        model: data.model,
        max_tokens: data.max_tokens,
        temperature: data.temperature,
        extra_params: data.extra_params || {},
        api_key: (data as unknown as { api_key?: string }).api_key,
      },
      prompt_config: {
        system_prompt: data.system_prompt,
        review_prompt: data.review_prompt,
        revision_prompt: data.revision_prompt,
        personality: data.personality,
        custom_instructions: data.custom_instructions,
      },
    }
    const actor = await apiClient.createActor(payload)
    set((state) => ({ actors: [...state.actors, actor] }))
    return actor
  },

  updateActor: async (id, data) => {
    const apiConfig: Record<string, unknown> = {
      provider: data.provider,
      api_format: data.api_format,
      base_url: data.base_url,
      model: data.model,
      max_tokens: data.max_tokens,
      temperature: data.temperature,
      extra_params: data.extra_params || {},
    }

    const apiKey = (data as unknown as { api_key?: string }).api_key
    if (apiKey) {
      apiConfig.api_key = apiKey
    }

    const payload = {
      name: data.name,
      display_color: data.display_color,
      icon: data.icon,
      is_meta_judge: data.is_meta_judge,
      api_config: apiConfig,
      prompt_config: {
        system_prompt: data.system_prompt,
        review_prompt: data.review_prompt,
        revision_prompt: data.revision_prompt,
        personality: data.personality,
        custom_instructions: data.custom_instructions,
      },
    }

    const updated = await apiClient.updateActor(id, payload)
    set((state) => {
      // Remove the cached detail by creating a new object without the key
      const { [id]: _, ...remainingDetails } = state.actorDetails
      return {
        actors: state.actors.map((a) => (a.id === id ? (updated as unknown as Actor) : a)),
        actorDetails: remainingDetails,
      }
    })
  },

  deleteActor: async (id) => {
    await apiClient.deleteActor(id)
    set((state) => ({
      actors: state.actors.filter((a) => a.id !== id),
      selectedActors: state.selectedActors.filter((aid) => aid !== id),
    }))
  },

  testActor: async (id) => {
    return apiClient.testActor(id)
  },

  selectActor: (id) => {
    set((state) => ({
      selectedActors: state.selectedActors.includes(id)
        ? state.selectedActors
        : [...state.selectedActors, id],
    }))
  },

  deselectActor: (id) => {
    set((state) => ({
      selectedActors: state.selectedActors.filter((aid) => aid !== id),
    }))
  },

  setJudgeActor: (id) => {
    set({ judgeActorId: id })
  },
}))
```


### frontend\src\stores\debateStore.ts

```typescript
import { create } from 'zustand'
import { DebateSession, SessionListItem, Consensus, LivePhaseRecord, LiveMessage, LivePhaseType, ConvergenceData, TopicComparison, QuestionIntent } from '@/types'
import { apiClient } from '@/lib/apiClient'

interface ProgressState {
  startedAt: number | null
  currentPhaseStartedAt: number | null
  completedSteps: number
  estimatedTotalSteps: number
  currentStepProgress: number  // 0-1 for current phase (based on actors completed)
  phaseTimings: Map<string, number>  // phase_id -> duration in ms
  // Actor-level progress tracking
  totalActorsInPhase: number
  completedActorsInPhase: number
}

interface DebateState {
  currentSessionId: string | null
  currentSession: DebateSession | null
  sessions: SessionListItem[]

  // Legacy streaming state (kept for backward compatibility)
  streamingContent: Map<string, string>
  activeActors: Set<string>
  currentRound: number
  currentPhase: string
  currentCycle: number
  convergenceResult: ConvergenceData | null

  // New phase history state
  phaseHistory: LivePhaseRecord[]
  currentPhaseRecord: LivePhaseRecord | null
  selectedDiffPhaseId: string | null

  // Semantic analysis state
  questionIntent: QuestionIntent | null
  semanticComparisons: Map<string, TopicComparison[]>  // phaseId -> comparisons
  selectedTopicId: string | null

  // Progress tracking
  progress: ProgressState

  status: 'idle' | 'connecting' | 'streaming' | 'completed' | 'error'
  error: string | null

  fetchSessions: () => Promise<void>
  startDebate: (question: string, actorIds: string[], judgeActorId: string, config?: { max_rounds?: number }) => Promise<string>
  streamDebate: (sessionId: string) => void
  stopDebate: () => Promise<void>

  setSession: (session: DebateSession) => void
  addToken: (actorId: string, content: string) => void
  clearStreaming: (actorId: string) => void
  setRound: (round: number, phase: string) => void
  setConsensus: (consensus: Consensus) => void
  setStatus: (status: 'idle' | 'connecting' | 'streaming' | 'completed' | 'error') => void
  setError: (error: string | null) => void
  reset: () => void
  selectDiffPhase: (phaseId: string | null) => void
  selectTopic: (topicId: string | null) => void
}

let eventSource: EventSource | null = null
let expectedClose = false  // Flag to track expected connection close

// Token batching for performance optimization
// Instead of updating Zustand state on every token, we buffer tokens and flush periodically
const tokenBuffer = new Map<string, string>()  // actorId -> accumulated tokens
let flushTimeoutId: ReturnType<typeof setTimeout> | null = null
const FLUSH_INTERVAL = 50  // ms - flush every 50ms

// Helper to clear token buffer and flush timeout
function clearTokenBufferState() {
  if (flushTimeoutId) {
    clearTimeout(flushTimeoutId)
    flushTimeoutId = null
  }
  tokenBuffer.clear()
}

// Helper to create a phase record ID
function makePhaseId(step: number, phase: LivePhaseType, cycle?: number): string {
  return `${step}:${phase}${cycle !== undefined ? `:${cycle}` : ''}`
}

export const useDebateStore = create<DebateState>((set, get) => ({
  currentSessionId: null,
  currentSession: null,
  sessions: [],
  streamingContent: new Map(),
  activeActors: new Set(),
  currentRound: 0,
  currentPhase: '',
  currentCycle: 0,
  convergenceResult: null,
  phaseHistory: [],
  currentPhaseRecord: null,
  selectedDiffPhaseId: null,
  questionIntent: null,
  semanticComparisons: new Map(),
  selectedTopicId: null,
  progress: {
    startedAt: null,
    currentPhaseStartedAt: null,
    completedSteps: 0,
    estimatedTotalSteps: 9,  // Default: 1 initial + 2*3 review/revision + 1 final + 1 summary
    currentStepProgress: 0,
    phaseTimings: new Map(),
    totalActorsInPhase: 0,
    completedActorsInPhase: 0,
  },
  status: 'idle',
  error: null,

  fetchSessions: async () => {
    try {
      const sessions = await apiClient.listSessions()
      set({ sessions })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  startDebate: async (question, actorIds, judgeActorId, config) => {
    // Reset expectedClose flag for new debate
    expectedClose = false

    const data = await apiClient.startDebate({
      question,
      actor_ids: actorIds,
      judge_actor_id: judgeActorId,
      config: config || { max_rounds: 3 },
    })

    // Calculate estimated total steps: 1 initial + 2*max_rounds review/revision + 1 final + 1 summary
    const maxRounds = config?.max_rounds || 3
    const estimatedTotalSteps = 1 + 2 * maxRounds + 2

    set({
      currentSessionId: data.session_id,
      currentSession: null,
      currentRound: 0,
      currentPhase: '',
      currentCycle: 0,
      streamingContent: new Map(),
      activeActors: new Set(),
      convergenceResult: null,
      phaseHistory: [],
      currentPhaseRecord: null,
      selectedDiffPhaseId: null,
      questionIntent: null,
      semanticComparisons: new Map(),
      selectedTopicId: null,
      error: null,
      progress: {
        startedAt: Date.now(),
        currentPhaseStartedAt: null,
        completedSteps: 0,
        estimatedTotalSteps,
        currentStepProgress: 0,
        phaseTimings: new Map(),
        totalActorsInPhase: 0,
        completedActorsInPhase: 0,
      },
    })

    get().streamDebate(data.session_id)

    return data.session_id
  },

  streamDebate: (sessionId) => {
    // Reset expectedClose flag for new stream
    expectedClose = false

    set({
      status: 'connecting',
      error: null,
      streamingContent: new Map(),
      activeActors: new Set(),
      currentRound: 0,
      currentPhase: '',
      currentCycle: 0,
      convergenceResult: null,
      phaseHistory: [],
      currentPhaseRecord: null,
      selectedDiffPhaseId: null,
      questionIntent: null,
      semanticComparisons: new Map(),
      selectedTopicId: null,
      progress: {
        startedAt: Date.now(),
        currentPhaseStartedAt: null,
        completedSteps: 0,
        estimatedTotalSteps: 9,
        currentStepProgress: 0,
        phaseTimings: new Map(),
        totalActorsInPhase: 0,
        completedActorsInPhase: 0,
      },
    })

    if (eventSource) {
      eventSource.close()
      eventSource = null
    }

    eventSource = new EventSource(apiClient.getStreamUrl(sessionId))

    eventSource.onopen = () => {
      console.log('[SSE] Connection opened')
      set({ status: 'streaming' })
    }

    eventSource.onerror = () => {
      console.error('[SSE] Native error')
      // Check if this is an expected close (normal completion or manual stop)
      if (expectedClose) {
        console.log('[SSE] Expected close, ignoring error')
        return
      }
      // Check if current state is already completed/stopped
      const currentState = get().status
      if (currentState === 'completed' || currentState === 'idle') {
        console.log('[SSE] Already completed/stopped, ignoring error')
        return
      }
      set({ status: 'error', error: 'Connection lost' })
      eventSource?.close()
      eventSource = null
    }

    // New phase_start event - create a new phase record (DO NOT clear history)
    eventSource.addEventListener('phase_start', (e: MessageEvent) => {
      console.log('[SSE] phase_start:', e.data)
      const data = JSON.parse(e.data)
      const step = data.step || 1
      const phase = data.phase as LivePhaseType
      const cycle = data.cycle

      const phaseId = makePhaseId(step, phase, cycle)
      const newRecord: LivePhaseRecord = {
        id: phaseId,
        step,
        phase,
        cycle,
        messages: {},
      }

      set((state) => {
        const newHistory = [...state.phaseHistory, newRecord]

        // Update progress
        const prevPhaseStartedAt = state.progress.currentPhaseStartedAt
        const prevPhaseId = state.currentPhaseRecord?.id
        const newPhaseTimings = new Map(state.progress.phaseTimings)

        // Record previous phase timing if exists
        if (prevPhaseStartedAt && prevPhaseId) {
          newPhaseTimings.set(prevPhaseId, Date.now() - prevPhaseStartedAt)
        }

        return {
          currentPhase: phase,
          currentRound: data.round || cycle || 1,
          currentCycle: cycle || 0,
          phaseHistory: newHistory,
          currentPhaseRecord: newRecord,
          // Clear legacy streaming state for new phase
          streamingContent: new Map(),
          activeActors: new Set(),
          // Update progress
          progress: {
            ...state.progress,
            currentPhaseStartedAt: Date.now(),
            currentStepProgress: 0,
            phaseTimings: newPhaseTimings,
            // Reset actor counts for new phase
            totalActorsInPhase: 0,
            completedActorsInPhase: 0,
          },
        }
      })
    })

    eventSource.addEventListener('actor_start', (e: MessageEvent) => {
      console.log('[SSE] actor_start:', e.data)
      const data = JSON.parse(e.data)
      const actorId = data.actor_id as string
      const actorName = data.actor_name as string
      const actorIcon = data.actor_icon as string
      const actorColor = data.actor_color as string
      const phase = (data.phase || get().currentPhase) as LivePhaseType
      const step = data.step || get().currentRound
      const cycle = data.cycle

      set((state) => {
        // Update legacy state
        const newMap = new Map(state.streamingContent)
        newMap.set(actorId, '')
        const newActive = new Set(state.activeActors)
        newActive.add(actorId)

        // Update phase history
        const phaseRecord = state.currentPhaseRecord
        if (phaseRecord) {
          const newMessage: LiveMessage = {
            actorId,
            actorName,
            actorIcon,
            actorColor,
            phase,
            step,
            cycle,
            content: '',
            status: 'streaming',
          }

          const updatedRecord: LivePhaseRecord = {
            ...phaseRecord,
            messages: {
              ...phaseRecord.messages,
              [actorId]: newMessage,
            },
          }

          const updatedHistory = state.phaseHistory.map((r) =>
            r.id === updatedRecord.id ? updatedRecord : r
          )

          // Track total actors - increment when we see a new actor for this phase
          const currentActorCount = Object.keys(phaseRecord.messages).length
          const newActorCount = currentActorCount + 1

          return {
            streamingContent: newMap,
            activeActors: newActive,
            currentPhaseRecord: updatedRecord,
            phaseHistory: updatedHistory,
            progress: {
              ...state.progress,
              totalActorsInPhase: newActorCount,
              currentStepProgress: state.progress.completedActorsInPhase / Math.max(newActorCount, 1),
            },
          }
        }

        return { streamingContent: newMap, activeActors: newActive }
      })
    })

    eventSource.addEventListener('token', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      const actorId = data.actor_id as string
      const token = data.content as string

      // Buffer the token instead of immediately updating state
      const existing = tokenBuffer.get(actorId) || ''
      tokenBuffer.set(actorId, existing + token)

      // Schedule a flush if not already scheduled
      if (!flushTimeoutId) {
        flushTimeoutId = setTimeout(() => {
          flushTimeoutId = null
          // Flush all buffered tokens to state
          const bufferedTokens = new Map(tokenBuffer)
          tokenBuffer.clear()

          if (bufferedTokens.size === 0) return

          set((state) => {
            // Update legacy state
            const newMap = new Map(state.streamingContent)
            bufferedTokens.forEach((tokens, actorId) => {
              const existing = newMap.get(actorId) || ''
              newMap.set(actorId, existing + tokens)
            })

            // Update phase history
            const phaseRecord = state.currentPhaseRecord
            if (phaseRecord) {
              const updatedMessages = { ...phaseRecord.messages }
              let hasUpdates = false

              bufferedTokens.forEach((tokens, actorId) => {
                if (updatedMessages[actorId]) {
                  updatedMessages[actorId] = {
                    ...updatedMessages[actorId],
                    content: updatedMessages[actorId].content + tokens,
                  }
                  hasUpdates = true
                }
              })

              if (hasUpdates) {
                const updatedRecord: LivePhaseRecord = {
                  ...phaseRecord,
                  messages: updatedMessages,
                }

                const updatedHistory = state.phaseHistory.map((r) =>
                  r.id === updatedRecord.id ? updatedRecord : r
                )

                return {
                  streamingContent: newMap,
                  currentPhaseRecord: updatedRecord,
                  phaseHistory: updatedHistory,
                }
              }
            }

            return { streamingContent: newMap }
          })
        }, FLUSH_INTERVAL)
      }
    })

    eventSource.addEventListener('actor_end', (e: MessageEvent) => {
      console.log('[SSE] actor_end:', e.data)
      const data = JSON.parse(e.data)
      const actorId = data.actor_id as string

      // Flush any remaining tokens for this actor before marking as done
      const remainingTokens = tokenBuffer.get(actorId)
      if (remainingTokens) {
        tokenBuffer.delete(actorId)
      }

      set((state) => {
        // Update legacy state - include any remaining buffered tokens
        const newActive = new Set(state.activeActors)
        newActive.delete(actorId)

        // Update legacy streaming content with remaining tokens
        const newMap = new Map(state.streamingContent)
        if (remainingTokens) {
          const existing = newMap.get(actorId) || ''
          newMap.set(actorId, existing + remainingTokens)
        }

        // Update phase history
        const phaseRecord = state.currentPhaseRecord
        if (phaseRecord && phaseRecord.messages[actorId]) {
          const updatedMessage: LiveMessage = {
            ...phaseRecord.messages[actorId],
            status: 'done',
            // Include remaining buffered tokens
            content: phaseRecord.messages[actorId].content + (remainingTokens || ''),
          }

          const updatedRecord: LivePhaseRecord = {
            ...phaseRecord,
            messages: {
              ...phaseRecord.messages,
              [actorId]: updatedMessage,
            },
          }

          const updatedHistory = state.phaseHistory.map((r) =>
            r.id === updatedRecord.id ? updatedRecord : r
          )

          // Update progress - increment completed actors and calculate progress
          const newCompletedActors = state.progress.completedActorsInPhase + 1
          const totalActors = Math.max(state.progress.totalActorsInPhase, newCompletedActors)
          const newProgress = totalActors > 0 ? newCompletedActors / totalActors : 0

          return {
            activeActors: newActive,
            streamingContent: newMap,
            currentPhaseRecord: updatedRecord,
            phaseHistory: updatedHistory,
            progress: {
              ...state.progress,
              completedActorsInPhase: newCompletedActors,
              currentStepProgress: newProgress,
            },
          }
        }

        return { activeActors: newActive, streamingContent: newMap }
      })
    })

    eventSource.addEventListener('phase_end', (e: MessageEvent) => {
      console.log('[SSE] phase_end:', e.data)
      // Phase ended, update progress
      set((state) => ({
        progress: {
          ...state.progress,
          completedSteps: state.progress.completedSteps + 1,
          currentStepProgress: 1,
          // Reset actor counts for next phase
          totalActorsInPhase: 0,
          completedActorsInPhase: 0,
        }
      }))
    })

    // Convergence result - attach to latest revision phase
    eventSource.addEventListener('convergence_result', (e: MessageEvent) => {
      console.log('[SSE] convergence_result:', e.data)
      const data = JSON.parse(e.data) as ConvergenceData & { cycle?: number }

      set((state) => {
        // Find the latest revision phase to attach convergence result
        const revisionPhases = state.phaseHistory.filter((r) => r.phase === 'revision')
        const targetPhase = revisionPhases[revisionPhases.length - 1]

        if (targetPhase) {
          const updatedRecord: LivePhaseRecord = {
            ...targetPhase,
            convergence: data,
          }

          const updatedHistory = state.phaseHistory.map((r) =>
            r.id === updatedRecord.id ? updatedRecord : r
          )

          return {
            convergenceResult: data,
            phaseHistory: updatedHistory,
          }
        }

        return { convergenceResult: data }
      })
    })

    // Legacy round_start for backward compatibility
    eventSource.addEventListener('round_start', (e: MessageEvent) => {
      console.log('[SSE] round_start:', e.data)
      const data = JSON.parse(e.data)
      const round = data.round
      const phase = (data.phase || 'initial') as LivePhaseType

      const step = round || get().phaseHistory.length + 1
      const phaseId = makePhaseId(step, phase)

      set((state) => {
        // Check if this phase already exists
        const existingRecord = state.phaseHistory.find((r) => r.id === phaseId)
        if (existingRecord) {
          return {
            currentRound: round,
            currentPhase: phase,
            currentPhaseRecord: existingRecord,
            streamingContent: new Map(),
            activeActors: new Set(),
          }
        }

        const newRecord: LivePhaseRecord = {
          id: phaseId,
          step,
          phase,
          messages: {},
        }

        const newHistory = [...state.phaseHistory, newRecord]
        return {
          currentRound: round,
          currentPhase: phase,
          phaseHistory: newHistory,
          currentPhaseRecord: newRecord,
          streamingContent: new Map(),
          activeActors: new Set(),
        }
      })
    })

    // Legacy round_end
    eventSource.addEventListener('round_end', (e: MessageEvent) => {
      console.log('[SSE] round_end:', e.data)
    })

    // Legacy judge events for backward compatibility
    eventSource.addEventListener('judge_start', () => {
      console.log('[SSE] judge_start')
      const step = get().phaseHistory.length + 1
      const phaseId = makePhaseId(step, 'summary')

      set((state) => {
        const newRecord: LivePhaseRecord = {
          id: phaseId,
          step,
          phase: 'summary',
          messages: {},
        }

        const newHistory = [...state.phaseHistory, newRecord]
        return {
          currentPhase: 'summary',
          phaseHistory: newHistory,
          currentPhaseRecord: newRecord,
        }
      })
    })

    eventSource.addEventListener('judge_token', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      const token = data.content as string
      const actorId = 'judge'

      set((state) => {
        // Update legacy state
        const newMap = new Map(state.streamingContent)
        const existing = newMap.get(actorId) || ''
        newMap.set(actorId, existing + token)
        const newActive = new Set(state.activeActors)
        newActive.add(actorId)

        // Update phase history
        const phaseRecord = state.currentPhaseRecord
        if (phaseRecord) {
          const existingMessage = phaseRecord.messages[actorId] || {
            actorId,
            actorName: 'Judge',
            actorIcon: '⚖️',
            actorColor: '#9333EA',
            phase: 'summary' as LivePhaseType,
            step: phaseRecord.step,
            content: '',
            status: 'streaming' as const,
          }

          const updatedMessage: LiveMessage = {
            ...existingMessage,
            content: existingMessage.content + token,
          }

          const updatedRecord: LivePhaseRecord = {
            ...phaseRecord,
            messages: {
              ...phaseRecord.messages,
              [actorId]: updatedMessage,
            },
          }

          const updatedHistory = state.phaseHistory.map((r) =>
            r.id === updatedRecord.id ? updatedRecord : r
          )

          return {
            streamingContent: newMap,
            activeActors: newActive,
            currentPhaseRecord: updatedRecord,
            phaseHistory: updatedHistory,
          }
        }

        return { streamingContent: newMap, activeActors: newActive }
      })
    })

    eventSource.addEventListener('consensus', (e: MessageEvent) => {
      console.log('[SSE] consensus:', e.data)
      const data = JSON.parse(e.data)
      set((state) => ({
        currentSession: state.currentSession
          ? { ...state.currentSession, consensus: data }
          : { consensus: data } as DebateSession,
      }))
    })

    // Semantic comparison event - use phase_id from backend
    eventSource.addEventListener('semantic_comparison', (e: MessageEvent) => {
      console.log('[SSE] semantic_comparison:', e.data)
      const data = JSON.parse(e.data)

      set((state) => {
        // Update question intent
        const questionIntent = data.question_intent || state.questionIntent

        // Update semantic comparisons map using phase_id from backend
        const newComparisons = new Map(state.semanticComparisons)
        // Use phase_id from backend, fallback to derived key for legacy compatibility
        const phaseId = data.phase_id || `${data.round_number}:${data.phase}`
        newComparisons.set(phaseId, data.comparisons || [])

        return {
          questionIntent,
          semanticComparisons: newComparisons,
        }
      })
    })

    eventSource.addEventListener('complete', async (e: MessageEvent) => {
      console.log('[SSE] complete:', e.data)
      expectedClose = true  // Mark as expected close
      clearTokenBufferState()  // Clear token buffer

      try {
        const session = await apiClient.getDebate(sessionId)
        // Keep phaseHistory intact, just update the session
        set({ currentSession: session, status: 'completed' })
      } catch {
        set({ status: 'completed' })
      }

      eventSource?.close()
      eventSource = null
    })

    eventSource.addEventListener('debate_error', (e: MessageEvent) => {
      console.error('[SSE] debate_error:', e.data)
      const data = JSON.parse(e.data)
      clearTokenBufferState()  // Clear token buffer
      set({ status: 'error', error: data.message })
      eventSource?.close()
      eventSource = null
    })

    eventSource.addEventListener('cancelled', () => {
      console.log('[SSE] cancelled')
      expectedClose = true  // Mark as expected close
      clearTokenBufferState()  // Clear token buffer
      set({ status: 'idle', error: 'Review was cancelled' })
      eventSource?.close()
      eventSource = null
    })
  },

  stopDebate: async () => {
    expectedClose = true  // Mark as expected close
    clearTokenBufferState()  // Clear token buffer
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }

    const sessionId = get().currentSessionId
    if (sessionId) {
      try {
        await apiClient.stopDebate(sessionId)
      } catch (e) {
        console.error('Failed to stop debate:', e)
      }
    }

    set({ status: 'idle', currentSessionId: null })
  },

  setSession: (session) => set({ currentSession: session }),
  addToken: (actorId, content) => {
    set((state) => {
      const newMap = new Map(state.streamingContent)
      const existing = newMap.get(actorId) || ''
      newMap.set(actorId, existing + content)
      return { streamingContent: newMap }
    })
  },
  clearStreaming: (actorId) => {
    set((state) => {
      const newMap = new Map(state.streamingContent)
      newMap.delete(actorId)
      const newActive = new Set(state.activeActors)
      newActive.delete(actorId)
      return { streamingContent: newMap, activeActors: newActive }
    })
  },
  setRound: (round, phase) => set({ currentRound: round, currentPhase: phase }),
  setConsensus: (consensus) => {
    set((state) => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, consensus }
        : { consensus } as DebateSession,
    }))
  },
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  selectDiffPhase: (phaseId) => set({ selectedDiffPhaseId: phaseId }),
  selectTopic: (topicId) => set({ selectedTopicId: topicId }),
  reset: () => {
    expectedClose = true  // Mark as expected close
    clearTokenBufferState()  // Clear token buffer and timeout
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    set({
      currentSessionId: null,
      currentSession: null,
      streamingContent: new Map(),
      activeActors: new Set(),
      currentRound: 0,
      currentPhase: '',
      currentCycle: 0,
      convergenceResult: null,
      phaseHistory: [],
      currentPhaseRecord: null,
      selectedDiffPhaseId: null,
      questionIntent: null,
      semanticComparisons: new Map(),
      selectedTopicId: null,
      status: 'idle',
      error: null,
      progress: {
        startedAt: null,
        currentPhaseStartedAt: null,
        completedSteps: 0,
        estimatedTotalSteps: 9,
        currentStepProgress: 0,
        phaseTimings: new Map(),
        totalActorsInPhase: 0,
        completedActorsInPhase: 0,
      },
    })
  },
}))
```


### frontend\src\stores\index.ts

```typescript
export { useActorStore } from './actorStore'
export { useDebateStore } from './debateStore'
```


### frontend\src\types\index.ts

```typescript
// Actor types
export type ProviderType = 'openai' | 'anthropic' | 'custom'

export interface APIConfig {
  provider: ProviderType
  api_format: string
  base_url?: string
  model: string
  max_tokens: number
  temperature: number
  extra_params: Record<string, unknown>
}

export interface PromptConfig {
  system_prompt: string
  review_prompt: string
  revision_prompt: string
  personality: string
  custom_instructions: string
}

export interface Actor {
  id: string
  name: string
  display_color: string
  icon: string
  is_meta_judge: boolean
  provider: ProviderType
  model: string
  created_at: string
  updated_at?: string
}

export interface ActorDetail extends Actor {
  api_format: string
  base_url?: string
  max_tokens: number
  temperature: number
  extra_params: Record<string, unknown>
  system_prompt: string
  review_prompt: string
  revision_prompt: string
  personality: string
  custom_instructions: string
}

// Debate types
export type SessionStatus = 'initializing' | 'debating' | 'judging' | 'completed' | 'stopped'

export interface Message {
  id: string
  actor_id: string
  actor_name?: string
  role: 'answer' | 'review' | 'revision' | 'final_answer' | 'summary' | 'final'
  content: string
  input_tokens: number
  output_tokens: number
  created_at: string
}

export interface Round {
  round_number: number
  phase: string
  messages: Message[]
}

export interface Consensus {
  summary: string
  agreements: string[]
  disagreements: string[]
  confidence: number | null
  recommendation: string
}

export interface DebateSession {
  id: string
  question: string
  status: SessionStatus
  actors: Actor[]
  judge_actor?: Actor
  max_rounds: number
  rounds: Round[]
  consensus?: Consensus
  total_tokens: number
  total_cost: number
  created_at: string
  completed_at?: string
}

export interface SessionListItem {
  id: string
  question: string
  status: SessionStatus
  consensus_confidence?: number
  created_at: string
}

// Phase types for live history
export type LivePhaseType = 'initial' | 'review' | 'revision' | 'final_answer' | 'summary'

export interface LiveMessage {
  actorId: string
  actorName: string
  actorIcon: string
  actorColor: string
  phase: LivePhaseType
  step: number
  cycle?: number
  content: string
  status: 'streaming' | 'done'
}

export interface ConvergenceData {
  converged: boolean
  score: number
  reason: string
  agreements: string[]
  disagreements: string[]
}

export interface LivePhaseRecord {
  id: string              // e.g. `${step}:${phase}:${cycle ?? 0}`
  step: number
  phase: LivePhaseType
  cycle?: number
  messages: Record<string, LiveMessage>  // actorId -> message
  convergence?: ConvergenceData
}

// SSE Event types
export type SSEEventType =
  | 'phase_start'
  | 'phase_end'
  | 'actor_start'
  | 'token'
  | 'actor_end'
  | 'round_start'
  | 'round_end'
  | 'judge_start'
  | 'judge_token'
  | 'convergence_result'
  | 'consensus'
  | 'complete'
  | 'error'
  | 'debate_error'
  | 'cancelled'

export interface SSEEvent {
  event: SSEEventType
  data: Record<string, unknown>
}


// ========== Semantic Analysis Types ==========

export interface ComparisonAxis {
  axis_id: string
  label: string
}

export interface QuestionIntent {
  question_type: string
  user_goal: string
  time_horizons: string[]
  comparison_axes: ComparisonAxis[]
}

export interface SemanticTopic {
  topic_id: string
  axis_id?: string
  label: string
  summary: string
  stance: string
  time_horizon: string
  risk_level: string
  novelty: string
  quotes: string[]
}

export interface ActorPosition {
  actor_id: string
  actor_name?: string
  stance_label?: string
  summary?: string
  quotes: string[]
}

export interface TopicComparison {
  id?: string
  session_id?: string
  round_number?: number
  phase?: string
  topic_id: string
  label: string
  salience: number
  disagreement_score: number
  status: 'converged' | 'divergent' | 'partial'
  difference_types: string[]
  agreement_summary?: string
  disagreement_summary?: string
  actor_positions: ActorPosition[]
  created_at?: string
}

export interface SemanticAnalysisResult {
  question_intent?: QuestionIntent
  comparisons: TopicComparison[]
}
```


### frontend\tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark mode base
        bg: {
          primary: '#0A0A0B',
          secondary: '#141416',
          tertiary: '#1C1C1F',
        },
        border: '#2A2A2E',
        text: {
          primary: '#F5F5F7',
          secondary: '#86868B',
          tertiary: '#56565A',
        },
        // Accent colors
        accent: {
          blue: '#0A84FF',
          green: '#30D158',
          orange: '#FF9F0A',
          red: '#FF453A',
          purple: '#BF5AF2',
        },
        // Actor colors
        actor: {
          casper: '#FF6B35',
          balthasar: '#4ECDC4',
          melchior: '#A855F7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        serif: ['Noto Serif JP', 'serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'flash': 'flash 0.4s steps(1, end) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        flash: {
          '0%, 49.9%': { opacity: '1' },
          '50%, 100%': { opacity: '0.3' },
        },
      },
    },
  },
  plugins: [],
}

export default config
```


### frontend\tsconfig.json

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```


### merge_code.py

```python
#!/usr/bin/env python3
"""
将项目代码合并为一个 Markdown 文档
用于发送给 AI 进行分析
"""

import os
import argparse
from pathlib import Path
from datetime import datetime

# 默认排除的目录
EXCLUDE_DIRS = {
    'node_modules', '.git', '__pycache__', '.next', 'dist', 'build',
    '.venv', 'venv', 'env', '.env', 'egg-info', '.mypy_cache',
    '.pytest_cache', '.idea', '.vscode', 'coverage', '.nyc_output'
}

# 默认排除的文件
EXCLUDE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    '.DS_Store', 'Thumbs.db', '.env', '.env.local', '.env.development', '.env.production'
}

# 要包含的文件扩展名
INCLUDE_EXTENSIONS = {
    # Python
    '.py', '.pyx', '.pyi',
    # JavaScript/TypeScript
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    # Web
    '.html', '.css', '.scss', '.sass', '.less',
    # Config
    '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg',
    # Data
    '.xml', '.sql',
    # Docs (optional)
    '.md',
    # Shell
    '.sh', '.bat', '.cmd', '.ps1',
    # Other
    '.vue', '.svelte', '.astro'
}

# 特殊文件名（无扩展名也要包含）
SPECIAL_FILES = {
    'Dockerfile', 'docker-compose', 'Makefile', 'Procfile',
    '.gitignore', '.dockerignore', '.editorconfig', '.prettierrc',
    '.eslintrc', '.babelrc', 'tsconfig', 'jsconfig'
}


def should_include(path: Path, include_docs: bool = False, include_all: bool = False) -> bool:
    """判断是否应该包含该文件"""
    name = path.name

    # 排除特定文件
    if name in EXCLUDE_FILES:
        return False

    # 检查是否在排除目录中
    for part in path.parts:
        if part in EXCLUDE_DIRS:
            return False

    # 如果是 include_all 模式，包含所有文本文件
    if include_all:
        # 排除二进制文件
        binary_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
                           '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4',
                           '.pdf', '.zip', '.tar', '.gz'}
        return path.suffix.lower() not in binary_extensions

    # 检查扩展名
    if path.suffix.lower() in INCLUDE_EXTENSIONS:
        # 如果是 .md 文件且不包含文档，则排除
        if path.suffix.lower() == '.md' and not include_docs:
            return False
        return True

    # 检查特殊文件名
    for special in SPECIAL_FILES:
        if name.startswith(special) or name == special:
            return True

    return False


def get_language(path: Path) -> str:
    """根据文件扩展名获取语法高亮语言"""
    ext_map = {
        '.py': 'python',
        '.pyx': 'python',
        '.pyi': 'python',
        '.js': 'javascript',
        '.jsx': 'jsx',
        '.ts': 'typescript',
        '.tsx': 'tsx',
        '.mjs': 'javascript',
        '.cjs': 'javascript',
        '.html': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.sass': 'sass',
        '.less': 'less',
        '.json': 'json',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.toml': 'toml',
        '.ini': 'ini',
        '.cfg': 'ini',
        '.xml': 'xml',
        '.sql': 'sql',
        '.md': 'markdown',
        '.sh': 'bash',
        '.bat': 'batch',
        '.cmd': 'batch',
        '.ps1': 'powershell',
        '.vue': 'vue',
        '.svelte': 'svelte',
        '.astro': 'astro',
    }
    return ext_map.get(path.suffix.lower(), '')


def merge_project(root_dir: str, output_file: str,
                  include_docs: bool = False,
                  include_all: bool = False,
                  max_file_size: int = 100000) -> None:
    """合并项目代码"""

    root = Path(root_dir).resolve()

    # 收集所有要包含的文件
    files = []
    for path in root.rglob('*'):
        if path.is_file() and should_include(path, include_docs, include_all):
            # 检查文件大小
            try:
                if path.stat().st_size <= max_file_size:
                    files.append(path)
            except OSError:
                continue

    # 排序文件
    files.sort()

    # 生成 Markdown
    lines = []
    lines.append(f"# Project: {root.name}")
    lines.append(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"Root: {root}")
    lines.append(f"Files: {len(files)}")
    lines.append("\n---\n")

    # 目录结构
    lines.append("## Directory Structure\n")
    lines.append("```\n")

    # 生成简化的目录树
    dir_tree = set()
    for f in files:
        try:
            rel = f.relative_to(root)
            for i, part in enumerate(rel.parts[:-1]):
                dir_tree.add(tuple(rel.parts[:i+1]))
        except ValueError:
            continue

    for d in sorted(dir_tree):
        indent = "  " * (len(d) - 1)
        lines.append(f"{indent}{d[-1]}/")

    for f in files:
        try:
            rel = f.relative_to(root)
            depth = len(rel.parts) - 1
            indent = "  " * depth
            lines.append(f"{indent}{f.name}")
        except ValueError:
            continue

    lines.append("```\n")
    lines.append("\n---\n")

    # 文件内容
    lines.append("## Files\n")

    for file_path in files:
        try:
            rel_path = file_path.relative_to(root)
        except ValueError:
            continue

        lang = get_language(file_path)

        lines.append(f"\n### {rel_path}\n")
        lines.append(f"```{lang}")

        try:
            content = file_path.read_text(encoding='utf-8', errors='replace')
            lines.append(content)
        except Exception as e:
            lines.append(f"[Error reading file: {e}]")

        lines.append("```\n")

    # 写入输出文件
    output = Path(output_file)
    output.write_text('\n'.join(lines), encoding='utf-8')

    print(f"[OK] Done!")
    print(f"   Files: {len(files)}")
    print(f"   Output: {output.resolve()}")
    print(f"   Size: {output.stat().st_size / 1024:.1f} KB")


def main():
    parser = argparse.ArgumentParser(
        description='将项目代码合并为一个 Markdown 文档'
    )
    parser.add_argument(
        'path',
        nargs='?',
        default='.',
        help='项目根目录 (默认: 当前目录)'
    )
    parser.add_argument(
        '-o', '--output',
        default='project-code.md',
        help='输出文件名 (默认: project-code.md)'
    )
    parser.add_argument(
        '-d', '--docs',
        action='store_true',
        help='包含 .md 文档文件'
    )
    parser.add_argument(
        '-a', '--all',
        action='store_true',
        help='包含所有文本文件 (不仅仅是代码)'
    )
    parser.add_argument(
        '-s', '--max-size',
        type=int,
        default=100000,
        help='单个文件最大字节数 (默认: 100000)'
    )

    args = parser.parse_args()

    merge_project(
        args.path,
        args.output,
        include_docs=args.docs,
        include_all=args.all,
        max_file_size=args.max_size
    )


if __name__ == '__main__':
    main()
```


### start.bat

```batch
@echo off
echo Starting MAGI Backend...
cd /d d:\Projects\MAGI\backend
start cmd /k "D:\anaconda\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo Backend starting on http://localhost:8000
echo.
echo Starting MAGI Frontend...
cd /d d:\Projects\MAGI\frontend
start cmd /k "npm run dev"
echo Frontend starting on http://localhost:3000
echo.
echo Done! Check the new windows for server logs.
pause
```


### START.HTML

```html
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>MAGI Supercomputer Boot UI</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@900&display=swap" rel="stylesheet">
<style>
    :root {
        --c-bg: #000000;
        --c-orange: #f26600;
        --c-orange-dim: rgba(242, 102, 0, 0.4);
        --c-green-line: #2b7a5f;
        --c-fill-blue: #54a5d9;
        --c-fill-green: #67ff8c;
        --c-fill-red: #e30000;
        --c-text-idle: transparent;
        --c-text-dark: #0a1f2e;
        --c-yellow: #fec200;
        --hz-4: 0.4s;
    }

    body, html {
        margin: 0;
        padding: 0;
        width: 100vw;
        height: 100vh;
        background-color: var(--c-bg);
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        font-family: 'Noto Serif JP', serif;
    }

    #magi-container {
        width: 100vw;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background: radial-gradient(circle at center, #0a0a0a 0%, #000 100%);
    }

    svg {
        width: 100%;
        height: 100%;
        max-width: 1920px;
        max-height: 1080px;
        filter: drop-shadow(0 0 3px var(--c-orange-dim));
    }

    text {
        font-weight: 900;
        user-select: none;
    }

    .header-text { fill: var(--c-orange); letter-spacing: 0.1em; }
    .magi-text { fill: var(--c-orange); letter-spacing: 0.25em; font-size: 48px; }
    .node-text { fill: var(--c-text-idle); letter-spacing: 0.05em; font-size: 50px; }

    .node-stroke {
        fill: transparent;
        stroke: var(--c-orange);
        stroke-width: 8;
        stroke-linejoin: miter;
    }

    .scanline-mask {
        fill: url(#scanline-pattern);
        pointer-events: none;
    }

    @keyframes flash-fill-blue {
        0%, 49.9% { fill: var(--c-fill-blue); }
        50%, 100% { fill: transparent; }
    }
    @keyframes flash-text-dark {
        0%, 49.9% { fill: var(--c-text-dark); }
        50%, 100% { fill: transparent; }
    }
    .state-thinking .node-fill { animation: flash-fill-blue var(--hz-4) steps(1, end) infinite; }
    .state-thinking .node-text { animation: flash-text-dark var(--hz-4) steps(1, end) infinite; }

    .state-approved .node-fill { fill: var(--c-fill-green); }
    .state-approved .node-text { fill: var(--c-text-dark); }

    .state-rejected .node-fill { fill: var(--c-fill-red); }
    .state-rejected .node-text { fill: var(--c-text-dark); }

    .shingi-box { opacity: 0; }
    .shingi-box.active { opacity: 1; }
    @keyframes flash-shingi {
        0%, 49.9% { fill: var(--c-yellow); stroke: var(--c-yellow); }
        50%, 100% { fill: rgba(254, 194, 0, 0.3); stroke: rgba(254, 194, 0, 0.3); }
    }
    .shingi-box.active rect { animation: flash-shingi 1s steps(1, end) infinite; }
    .shingi-box.active text { animation: flash-shingi 1s steps(1, end) infinite; stroke: none; }

</style>
</head>
<body>

<div id="magi-container">
    <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet">
        <defs>
            <pattern id="scanline-pattern" patternUnits="userSpaceOnUse" width="4" height="4">
                <line x1="0" y1="0" x2="4" y2="0" stroke="rgba(0,0,0,0.15)" stroke-width="2" />
            </pattern>
        </defs>

        <rect x="40" y="40" width="1840" height="1000" stroke="var(--c-orange)" stroke-width="3" fill="none" />
        <rect x="70" y="70" width="1780" height="940" stroke="var(--c-orange)" stroke-width="8" fill="none" />

        <g transform="translate(180, 160)">
            <line x1="0" y1="0" x2="400" y2="0" stroke="var(--c-green-line)" stroke-width="6" />
            <line x1="0" y1="16" x2="400" y2="16" stroke="var(--c-green-line)" stroke-width="6" />
            <text x="200" y="160" font-size="140" text-anchor="middle" class="header-text">提訴</text>
            <line x1="0" y1="200" x2="400" y2="200" stroke="var(--c-green-line)" stroke-width="6" />
            <line x1="0" y1="216" x2="400" y2="216" stroke="var(--c-green-line)" stroke-width="6" />
        </g>

        <g transform="translate(1340, 160)">
            <line x1="0" y1="0" x2="400" y2="0" stroke="var(--c-green-line)" stroke-width="6" />
            <line x1="0" y1="16" x2="400" y2="16" stroke="var(--c-green-line)" stroke-width="6" />
            <text x="200" y="160" font-size="140" text-anchor="middle" class="header-text">決議</text>
            <line x1="0" y1="200" x2="400" y2="200" stroke="var(--c-green-line)" stroke-width="6" />
            <line x1="0" y1="216" x2="400" y2="216" stroke="var(--c-green-line)" stroke-width="6" />
        </g>

        <g class="shingi-box" id="ui-shingi" transform="translate(1420, 420)">
            <rect x="0" y="0" width="240" height="80" stroke-width="4" fill="none" />
            <text x="120" y="58" font-size="50" text-anchor="middle" letter-spacing="0.1em">審議中</text>
        </g>

        <g stroke="var(--c-orange)" stroke-width="30">
            <line x1="850" y1="860" x2="1070" y2="860" />
            <line x1="775" y1="515" x2="725" y2="675" />
            <line x1="1145" y1="515" x2="1195" y2="675" />
        </g>

        <text x="960" y="700" text-anchor="middle" class="magi-text">MAGI</text>

        <g id="node-balthasar" class="magi-group">
            <polygon class="node-fill" points="710,140 1210,140 1210,450 1080,580 840,580 710,450" fill="transparent"/>
            <polygon class="scanline-mask" points="710,140 1210,140 1210,450 1080,580 840,580 710,450" />
            <polygon class="node-stroke" points="710,140 1210,140 1210,450 1080,580 840,580 710,450" />
            <text x="960" y="380" text-anchor="middle" class="node-text" font-size="75">BALTHASAR</text>
        </g>

        <g id="node-casper" class="magi-group">
            <polygon class="node-fill" points="250,550 600,550 850,800 850,940 250,940" fill="transparent"/>
            <polygon class="scanline-mask" points="250,550 600,550 850,800 850,940 250,940" />
            <polygon class="node-stroke" points="250,550 600,550 850,800 850,940 250,940" />
            <text x="500" y="780" text-anchor="middle" class="node-text">CASPER</text>
        </g>

        <g id="node-melchior" class="magi-group">
            <polygon class="node-fill" points="1670,550 1320,550 1070,800 1070,940 1670,940" fill="transparent"/>
            <polygon class="scanline-mask" points="1670,550 1320,550 1070,800 1070,940 1670,940" />
            <polygon class="node-stroke" points="1670,550 1320,550 1070,800 1070,940 1670,940" />
            <text x="1370" y="780" text-anchor="middle" class="node-text">MELCHIOR</text>
        </g>

    </svg>
</div>

<script>
    document.addEventListener("DOMContentLoaded", () => {
        const balthasar = document.getElementById('node-balthasar');
        const casper = document.getElementById('node-casper');
        const melchior = document.getElementById('node-melchior');
        const shingiBox = document.getElementById('ui-shingi');

        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        function resetNodes() {
            [balthasar, casper, melchior].forEach(node => {
                node.classList.remove('state-thinking', 'state-approved', 'state-rejected');
            });
            shingiBox.classList.remove('active');
        }

        async function bootMagiOS() {
            while (true) {
                resetNodes();
                await wait(2000);

                shingiBox.classList.add('active');
                [balthasar, casper, melchior].forEach(n => n.classList.add('state-thinking'));
                await wait(3500);

                resetNodes();
                const states = ['state-approved', 'state-rejected'];
                [balthasar, casper, melchior].forEach(n => {
                    const randomState = states[Math.floor(Math.random() * 2)];
                    n.classList.add(randomState);
                });

                await wait(4000);
            }
        }

        bootMagiOS();
    });
</script>
</body>
</html>
```


### stop.bat

```batch
@echo off
echo Stopping all Python and Node processes...
taskkill /F /IM python.exe 2>nul
taskkill /F /IM node.exe 2>nul
echo Done.
pause
```
