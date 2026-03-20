# Project: MAGI

Generated: 2026-03-20 22:43:15
Root: D:\Projects\MAGI
Files: 58

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
      ReviewChatView.tsx
      SemanticSidebar.tsx
      SessionDetailView.tsx
      SessionHistory.tsx
      SettingsView.tsx
      Splash.tsx
      apiClient.ts
      reviewDiff.ts
      utils.ts
      actorStore.ts
      debateStore.ts
      index.ts
      index.ts
  tailwind.config.ts
  tsconfig.json
  tsconfig.tsbuildinfo
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
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import Actor, SemanticComparison
from app.services.llm_adapter import create_adapter

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
) -> ConvergenceResult:
    """
    Check if responses have converged using the judge model.

    Args:
        db: Database session
        judge_actor_id: ID of the actor to use for convergence check
        question: The original question
        responses: Map of actor_id to their latest response
        threshold: Convergence threshold (0-1)

    Returns:
        ConvergenceResult with convergence status and details
    """
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

    # Build the prompt
    response_list = []
    for actor_id, content in responses.items():
        # Get actor name
        actor_result = await db.execute(
            select(Actor.name).where(Actor.id == actor_id)
        )
        actor_name = actor_result.scalar_one_or_none() or "Unknown"
        response_list.append(f"**{actor_name}**:\n{content}")

    prompt = f"""你是一个收敛判断器，需要判断以下回答是否已经收敛（达成足够共识）。

原始问题：{question}

各参与者的最新回答：

{chr(10).join(response_list)}

请判断这些回答是否已收敛。收敛的标准是：
1. 核心观点基本一致
2. 主要分歧已经缩小到次要细节
3. 不太可能通过更多轮次获得显著改进

请以 JSON 格式返回：
{{
  "converged": true或false,
  "score": 0.0到1.0之间的数值,
  "reason": "判断理由",
  "agreements": ["已达成共识的点"],
  "disagreements": ["仍存在分歧的点"]
}}
"""

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
            score = float(data.get("score", 0.5))

            # Apply threshold
            if score >= threshold:
                converged = True

            return ConvergenceResult(
                converged=converged,
                score=score,
                reason=data.get("reason", ""),
                agreements=data.get("agreements", []),
                disagreements=data.get("disagreements", []),
            )
        else:
            logger.warning(f"Could not parse convergence response: {full_response}")
            return ConvergenceResult(
                converged=False,
                score=0.5,
                reason="Could not parse convergence response",
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
                template_text="""你是一名专业的分析者，正在参与一个多模型互评系统。

请针对以下问题给出你的专业回答。你的回答应该：
1. 结构清晰，逻辑严谨
2. 提供具体的论据和例子
3. 考虑多种可能性

问题：{{question}}

请给出你的回答：""",
                required_variables=["question"],
            ),
            WorkflowPromptTemplate(
                key="peer_review",
                name="互评提示词",
                description="用于模型互相评审的回答",
                template_text="""你是一名专业的评审者，请对以下回答进行评审。

原始问题：{{question}}

你的回答：
{{own_answer}}

其他参与者的回答：
{{other_answers}}

请从以下角度进行评审：
1. 各回答的优点和亮点
2. 各回答的不足和可能的错误
3. 改进建议

请给出你的评审意见：""",
                required_variables=["question", "own_answer", "other_answers"],
            ),
            WorkflowPromptTemplate(
                key="revision",
                name="修订提示词",
                description="根据互评意见修订回答",
                template_text="""请根据其他参与者的评审意见，修订你的原始回答。

原始问题：{{question}}

你的原始回答：
{{own_answer}}

其他参与者的评审意见：
{{reviews_about_me}}

请根据这些意见修订你的回答：
1. 接纳合理的批评和建议
2. 保持你独特的视角
3. 提供更全面准确的答案

请给出修订后的回答：""",
                required_variables=["question", "own_answer", "reviews_about_me"],
            ),
            WorkflowPromptTemplate(
                key="final_answer",
                name="最终回答提示词",
                description="综合各模型回答，生成面向用户的最终回答",
                template_text="""你是一个综合决策助手，需要基于多轮互评的结果，输出一篇面向用户的最终回答。

## 原始问题

{{question}}

## 各参与者的最终回答

{{actor_answers}}

## 收敛分析结果

{{convergence_info}}

## 要求

请直接回答用户的问题，要求：
1. 优先采用已达成共识的观点
2. 对仍有分歧的地方说明条件与不确定性
3. 如果收敛度较低，给出分情境建议
4. 使用清晰、自然的语言，不要使用 JSON 格式
5. 直接给出最终回答，不要解释过程
""",
                required_variables=["question", "actor_answers", "convergence_info"],
            ),
            WorkflowPromptTemplate(
                key="summary",
                name="总结提示词",
                description="总结模型生成最终综合结论",
                template_text="""你是一个公正的综合者，需要根据多轮互评的结果生成最终的综合结论。

原始问题：{{question}}

完整的互评历史：
{{history}}

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
  "confidence": 0.85,
  "recommendation": "最终建议"
}""",
                required_variables=["question", "history"],
            ),
            WorkflowPromptTemplate(
                key="convergence_check",
                name="收敛检查提示词",
                description="检查各回答是否已收敛",
                template_text="""你是一个收敛判断器，需要判断以下回答是否已经收敛（达成足够共识）。

原始问题：{{question}}

各参与者的最新回答：
{{latest_answers}}

请判断这些回答是否已收敛。收敛的标准是：
1. 核心观点基本一致
2. 主要分歧已经缩小到次要细节
3. 不太可能通过更多轮次获得显著改进

请以 JSON 格式返回：
{
  "converged": true/false,
  "score": 0.0-1.0,
  "reason": "判断理由",
  "agreements": ["已达成共识的点"],
  "disagreements": ["仍存在分歧的点"]
}""",
                required_variables=["question", "latest_answers"],
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

        # Only add templates that don't exist
        added_count = 0
        for wp in workflow_prompts:
            if wp.key not in existing_keys:
                db.add(wp)
                added_count += 1
                logger.info(f"Added missing template: {wp.key}")

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

            # Run semantic analysis after initial round
            await self._run_semantic_analysis(round_number=1, phase="initial")

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

                # Run semantic analysis after revision
                await self._run_semantic_analysis(
                    round_number=self.step_number,
                    phase="revision",
                    cycle=cycle,
                )

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

                # Build system prompt from actor config + template
                system_prompt = actor.system_prompt or f"You are {actor.name}, an AI assistant."
                if actor.custom_instructions:
                    system_prompt += f"\n\n{actor.custom_instructions}"

                full_response = ""
                logger.info(f"Calling stream_completion for {actor.name}...")

                # Real streaming: emit each token
                async for token in adapter.stream_completion(
                    messages=[{"role": "user", "content": self.session.question}],
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

                # Store message after completion
                message = Message(
                    round_id=db_round.id,
                    actor_id=actor.id,
                    role="answer",
                    content=full_response,
                )
                self.db.add(message)
                await self.db.commit()

                # Track for later rounds
                self.actor_responses[actor.id].append({
                    "role": "answer",
                    "content": full_response,
                    "cycle": 0,
                })

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

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Actor {self.actors[i].name} failed: {result}")

    async def _run_review_round(self, cycle: int, db_round: DBRound):
        """Run review round where each actor critiques others' answers"""

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

            # Get other actors' answers
            other_responses = []
            for aid, content in latest_answers.items():
                if aid != actor.id:
                    other_actor = next((a for a in self.actors if a.id == aid), None)
                    if other_actor:
                        other_responses.append(f"**{other_actor.name}**: {content}")

            # Build review prompt
            system_prompt = actor.review_prompt or f"You are {actor.name}. Provide a critical review."
            if actor.custom_instructions:
                system_prompt += f"\n\n{actor.custom_instructions}"

            review_prompt = f"""Original question: {self.session.question}

Here are the responses from other participants:

{chr(10).join(other_responses)}

Please provide a critical review of these responses. Focus on:
1. Key points you agree with
2. Important points that were missed or incorrect
3. Suggestions for improvement"""

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

            # Store message
            message = Message(
                round_id=db_round.id,
                actor_id=actor.id,
                role="review",
                content=full_response,
            )
            self.db.add(message)
            await self.db.commit()

            self.actor_responses[actor.id].append({
                "role": "review",
                "content": full_response,
                "cycle": cycle,
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
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _run_revision_round(self, cycle: int, review_round: DBRound, db_round: DBRound):
        """Run revision round where actors improve their answers"""

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

            # Get reviews about this actor's response
            reviews_about_me = []
            for msg in review_messages:
                if msg.actor_id != actor.id:
                    other_actor = next((a for a in self.actors if a.id == msg.actor_id), None)
                    if other_actor:
                        reviews_about_me.append(f"**{other_actor.name}'s review**: {msg.content}")

            my_answer = latest_answers.get(actor.id, "")

            # Build revision prompt
            system_prompt = actor.revision_prompt or f"You are {actor.name}. Revise based on feedback."
            if actor.custom_instructions:
                system_prompt += f"\n\n{actor.custom_instructions}"

            revision_prompt = f"""Original question: {self.session.question}

Your current response:
{my_answer}

Reviews from other participants:
{chr(10).join(reviews_about_me)}

Please revise your response to:
1. Address valid critiques from the reviews
2. Incorporate useful suggestions
3. Maintain your unique perspective where appropriate
4. Provide a more comprehensive and accurate answer"""

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

            # Store message
            message = Message(
                round_id=db_round.id,
                actor_id=actor.id,
                role="revision",
                content=full_response,
            )
            self.db.add(message)
            await self.db.commit()

            self.actor_responses[actor.id].append({
                "role": "revision",
                "content": full_response,
                "cycle": cycle,
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
        await asyncio.gather(*tasks, return_exceptions=True)

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
        )

    async def _run_semantic_analysis(self, round_number: int, phase: str, cycle: int = 0):
        """
        Run semantic analysis on the latest responses.

        This method:
        1. Analyzes question intent (first time only)
        2. Extracts semantic topics from each actor's response
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
                logger.warning("Judge actor not found for semantic analysis")
                return

            adapter = self.get_adapter(judge)

            # Step 1: Analyze question intent (only once)
            if not self.question_intent:
                logger.info("Analyzing question intent...")
                self.question_intent = await self.semantic_service.analyze_question_intent(
                    question=self.session.question,
                    adapter=adapter,
                )
                # Save to database
                await self.semantic_service.save_question_intent(
                    session_id=self.session.id,
                    result=self.question_intent,
                )
                logger.info(f"Question intent analyzed: {len(self.question_intent.comparison_axes)} axes")

            # Step 2: Extract semantic topics from each actor's latest response
            latest_answers = {}
            for actor in self.actors:
                responses = self.actor_responses.get(actor.id, [])
                for r in reversed(responses):
                    if r.get("role") in ["answer", "revision"]:
                        latest_answers[actor.id] = r["content"]
                        break

            topics_by_actor = {}
            for actor in self.actors:
                content = latest_answers.get(actor.id, "")
                if not content:
                    continue

                logger.info(f"Extracting topics for actor {actor.name}...")
                topics = await self.semantic_service.extract_semantic_topics(
                    question=self.session.question,
                    answer=content,
                    comparison_axes=self.question_intent.comparison_axes,
                    actor_id=actor.id,
                    adapter=adapter,
                )
                topics_by_actor[actor.id] = topics

                # Save to database
                if topics:
                    await self.semantic_service.save_semantic_topics(
                        session_id=self.session.id,
                        round_number=round_number,
                        phase=phase,
                        actor_id=actor.id,
                        topics=topics,
                        cycle=cycle,
                    )

            # Step 3: Compare topics across actors
            if len(topics_by_actor) >= 2:
                logger.info("Comparing topics across actors...")
                comparisons = await self.semantic_service.compare_actors(
                    question=self.session.question,
                    topics_by_actor=topics_by_actor,
                    actors=self.actors,
                    adapter=adapter,
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
                # phase_id format: "step:phase[:cycle]" (cycle only for revision)
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

        # Build answer list
        answer_list = []
        for actor in self.actors:
            content = latest_answers.get(actor.id, "")
            answer_list.append(f"**{actor.name}**:\n{content}")

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

        # Build final answer prompt
        final_answer_prompt = f"""你是一个综合决策助手，需要基于多轮互评的结果，输出一篇面向用户的最终回答。

## 原始问题

{self.session.question}

## 各参与者的最终回答

{chr(10).join(answer_list)}
{convergence_info}

## 要求

请直接回答用户的问题，要求：
1. 优先采用已达成共识的观点
2. 对仍有分歧的地方说明条件与不确定性
3. 如果收敛度较低，给出分情境建议
4. 使用清晰、自然的语言，不要使用 JSON 格式
5. 直接给出最终回答，不要解释过程
"""

        system_prompt = judge.system_prompt or "你是一个专业的综合决策助手，输出简洁明了的最终回答。"

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
        """Run summary phase to synthesize final conclusion"""

        # Get judge actor
        result = await self.db.execute(
            select(Actor).where(Actor.id == self.session.judge_actor_id)
        )
        judge = result.scalar_one_or_none()

        if not judge:
            await self._emit({"event": "debate_error", "data": {"message": "Judge actor not found"}})
            return

        adapter = self.get_adapter(judge)

        # Compile all history
        history = f"**Original Question**: {self.session.question}\n\n"

        for actor in self.actors:
            responses = self.actor_responses.get(actor.id, [])
            history += f"## {actor.name}\n\n"
            for r in responses:
                role_label = {
                    "answer": "Initial Answer",
                    "review": "Review",
                    "revision": "Revision",
                    "final_answer": "Final Answer",
                }.get(r.get("role"), r.get("role", "Response"))
                cycle = r.get("cycle", 0)
                history += f"### {role_label}" + (f" (Cycle {cycle})" if cycle > 0 else "") + "\n"
                history += f"{r.get('content', '')}\n\n"

        # Add convergence info if available
        convergence_info = ""
        if convergence_result:
            convergence_info = f"""
## 收敛分析

共识度: {round(convergence_result.score * 100)}%
是否已收敛: {"是" if convergence_result.converged else "否"}

已达成共识的观点:
{chr(10).join(f"- {a}" for a in convergence_result.agreements) if convergence_result.agreements else "- 无"}

仍存在分歧的观点:
{chr(10).join(f"- {d}" for d in convergence_result.disagreements) if convergence_result.disagreements else "- 无"}
"""

        # Build summary prompt
        summary_prompt = f"""Based on the following multi-agent review, please provide a comprehensive summary.
{history}
{convergence_info}
Please provide:
1. A concise summary of the key conclusions
2. Points where all participants agreed
3. Points where participants disagreed
4. Your confidence level (0-1) in the consensus
5. A final recommendation

Format your response as JSON:
{{
  "summary": "...",
  "agreements": ["point 1", "point 2"],
  "disagreements": ["point 1"],
  "confidence": 0.85,
  "recommendation": "..."
}}"""

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

        # If first attempt failed, try a more structured retry
        if not parse_success:
            logger.warning(f"Summary JSON parse failed, attempting retry with stricter prompt")
            retry_prompt = """The previous response could not be parsed as JSON. Please provide ONLY a valid JSON object with no additional text:

{
  "summary": "Brief summary of conclusions",
  "agreements": ["point 1", "point 2"],
  "disagreements": ["point 1"],
  "confidence": 0.85,
  "recommendation": "Brief recommendation"
}"""

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
        own_answer: str,
        other_answers: str,
        actor_custom_prompt: Optional[str] = None,
    ) -> str:
        """Get the prompt for peer review phase."""
        return await self.render_template("peer_review", {
            "question": question,
            "own_answer": own_answer,
            "other_answers": other_answers,
        })

    async def get_revision_prompt(
        self,
        question: str,
        own_answer: str,
        reviews_about_me: str,
        actor_custom_prompt: Optional[str] = None,
    ) -> str:
        """Get the prompt for revision phase."""
        return await self.render_template("revision", {
            "question": question,
            "own_answer": own_answer,
            "reviews_about_me": reviews_about_me,
        })

    async def get_summary_prompt(
        self,
        question: str,
        history: str,
    ) -> str:
        """Get the prompt for summary phase."""
        return await self.render_template("summary", {
            "question": question,
            "history": history,
        })

    async def get_convergence_prompt(
        self,
        question: str,
        latest_answers: str,
    ) -> str:
        """Get the prompt for convergence check."""
        return await self.render_template("convergence_check", {
            "question": question,
            "latest_answers": latest_answers,
        })

    async def get_final_answer_prompt(
        self,
        question: str,
        actor_answers: str,
        convergence_info: str = "",
    ) -> str:
        """Get the prompt for final answer phase."""
        return await self.render_template("final_answer", {
            "question": question,
            "actor_answers": actor_answers,
            "convergence_info": convergence_info,
        })
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
    WorkflowPromptTemplate,
)
from app.services.llm_adapter import create_adapter, LLMAdapter
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
        self._intent_template: Optional[WorkflowPromptTemplate] = None
        self._extraction_template: Optional[WorkflowPromptTemplate] = None
        self._compare_template: Optional[WorkflowPromptTemplate] = None

    async def _load_templates(self):
        """Load prompt templates from database."""
        if not self._intent_template:
            try:
                self._intent_template = await self.prompt_service.get_template("question_intent_analysis")
            except:
                logger.warning("question_intent_analysis template not found, using fallback")

        if not self._extraction_template:
            try:
                self._extraction_template = await self.prompt_service.get_template("semantic_extraction")
            except:
                logger.warning("semantic_extraction template not found, using fallback")

        if not self._compare_template:
            try:
                self._compare_template = await self.prompt_service.get_template("cross_actor_compare")
            except:
                logger.warning("cross_actor_compare template not found, using fallback")

    def _get_fallback_intent_prompt(self, question: str) -> str:
        """Fallback prompt for question intent analysis."""
        return f"""你是一个问题分析专家。请分析以下问题，提取其核心意图和比较维度。

问题：{question}

请以 JSON 格式返回：
{{
  "question_type": "问题类型（如 investment_decision, analysis, comparison 等）",
  "user_goal": "用户的核心目标",
  "time_horizons": ["短期", "中期", "长期"],
  "comparison_axes": [
    {{"axis_id": "维度ID", "label": "维度名称"}}
  ]
}}

只返回 JSON，不要其他文字。"""

    def _get_fallback_extraction_prompt(self, question: str, answer: str, axes: list[dict]) -> str:
        """Fallback prompt for semantic extraction."""
        axes_text = "\n".join([f"- {a.get('axis_id', a.get('label', ''))}: {a.get('label', '')}" for a in axes])

        return f"""你是一个语义分析专家。请分析以下回答，提取其核心主题和立场。

问题：{question}

回答：{answer}

可用的比较维度（axis_id必须从以下列表中选择）：
{axes_text}

请以 JSON 格式返回该回答的主题：
{{
  "topics": [
    {{
      "topic_id": "主题标识（唯一ID）",
      "axis_id": "必须从上面的比较维度列表中选择一个axis_id",
      "label": "主题名称",
      "summary": "观点摘要（一句话）",
      "stance": "立场标签（如：保守、激进、中立）",
      "time_horizon": "时间维度（short/medium/long）",
      "risk_level": "风险偏好（low/medium/high）",
      "novelty": "观点新颖度（low/medium/high）",
      "quotes": ["原文中支持该观点的引用"]
    }}
  ]
}}

重要：axis_id 必须严格从给定的比较维度列表中选择，不能自己编造。只返回 JSON，不要其他文字。"""

    def _get_fallback_compare_prompt(self, topic_label: str, positions: list[dict]) -> str:
        """Fallback prompt for cross-actor comparison."""
        positions_text = "\n\n".join([
            f"**{p.get('actor_name', 'Unknown')}**: {p.get('summary', '')}"
            for p in positions
        ])

        return f"""你是一个观点比较专家。请比较以下多个回答在同一主题上的差异。

主题：{topic_label}

各回答的观点：
{positions_text}

请以 JSON 格式返回：
{{
  "salience": 0.9,
  "disagreement_score": 0.3,
  "status": "converged/divergent/partial",
  "difference_types": ["solution_class", "time_horizon", "risk_preference"],
  "agreement_summary": "一致点",
  "disagreement_summary": "分歧点"
}}

只返回 JSON，不要其他文字。"""

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
        await self._load_templates()

        # Build prompt
        if self._intent_template:
            prompt = self.prompt_service.render(self._intent_template.template_text, {
                "question": question,
            })
        else:
            prompt = self._get_fallback_intent_prompt(question)

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
        await self._load_templates()

        if not comparison_axes:
            comparison_axes = [
                {"axis_id": "main_topic", "label": "核心观点"},
                {"axis_id": "approach", "label": "解决思路"},
            ]

        # Build prompt
        if self._extraction_template:
            prompt = self.prompt_service.render(self._extraction_template.template_text, {
                "question": question,
                "answer": answer,
                "comparison_axes": json.dumps(comparison_axes, ensure_ascii=False),
            })
        else:
            prompt = self._get_fallback_extraction_prompt(question, answer, comparison_axes)

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
        question: str,
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
        await self._load_templates()

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

            # Call LLM for comparison
            if self._compare_template:
                prompt = self.prompt_service.render(self._compare_template.template_text, {
                    "topic_label": label,
                    "actor_positions": json.dumps(positions, ensure_ascii=False),
                })
            else:
                prompt = self._get_fallback_compare_prompt(label, positions)

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
        cycle: int = 0,
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
        cycle: int = 0,
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
    "next": "14.2.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.2",
    "framer-motion": "^11.0.24",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.2",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "lucide-react": "^0.363.0"
  },
  "devDependencies": {
    "typescript": "^5.4.3",
    "@types/node": "^20.11.30",
    "@types/react": "^18.2.67",
    "@types/react-dom": "^18.2.22",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.3"
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
import ConsensusView from './ConsensusView'
import { apiClient } from '@/lib/apiClient'

type View = 'arena' | 'debate' | 'actors' | 'history' | 'settings' | 'sessionDetail'

export default function Arena() {
  const [view, setView] = useState<View>('arena')
  const [question, setQuestion] = useState('')
  const [maxRounds, setMaxRounds] = useState(3)
  const [recentSessions, setRecentSessions] = useState<SessionListItem[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const {
    actors,
    selectedActors,
    judgeActorId,
    fetchActors,
    selectActor,
    deselectActor,
    setJudgeActor,
  } = useActorStore()

  const {
    status,
    currentRound,
    currentPhase,
    currentSession,
    currentSessionId,
    phaseHistory,
    selectedDiffPhaseId,
    selectDiffPhase,
    semanticComparisons,
    selectedTopicId,
    selectTopic,
    startDebate,
    stopDebate,
    reset,
    error,
  } = useDebateStore()

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
          <div className="flex items-center justify-between max-w-7xl mx-auto">
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
          <div className="h-full max-w-7xl mx-auto px-6 py-4 flex flex-col">
            {/* Question - fixed at top */}
            <div className="mb-4 shrink-0">
              <h2 className="text-lg text-text-secondary mb-1">问题</h2>
              <p className="text-xl font-medium">{question}</p>
            </div>

            {/* Status - fixed */}
            <div className="mb-4 flex items-center gap-4 shrink-0">
              {status === 'connecting' && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  连接中...
                </div>
              )}
              {status === 'streaming' && (
                <div className="flex items-center gap-2">
                  <span className="text-accent-blue">Round {currentRound}</span>
                  <span className="text-text-tertiary">•</span>
                  <span className="text-text-secondary capitalize">{currentPhase}</span>
                </div>
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

            {/* Debate view - scrollable area */}
            {status !== 'idle' && (
              <div className="flex-1 min-h-0">
                <DebateView
                  actors={selectedActorObjects}
                  judgeActor={judgeActor}
                  phaseHistory={phaseHistory}
                  selectedDiffPhaseId={selectedDiffPhaseId}
                  onSelectDiffPhase={selectDiffPhase}
                  status={status}
                  question={question}
                  semanticComparisons={semanticComparisons}
                  selectedTopicId={selectedTopicId}
                  onSelectTopic={selectTopic}
                />
              </div>
            )}

            {/* Consensus - fixed at bottom */}
            {currentSession?.consensus && status === 'completed' && (
              <div className="mt-4 shrink-0">
                <ConsensusView consensus={currentSession.consensus} />
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
          <p className="text-text-primary">{consensus.summary}</p>
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
                  <span className="text-text-primary">{agreement}</span>
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
                  <span className="text-text-primary">{disagreement}</span>
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
            <p className="text-text-primary">{consensus.recommendation}</p>
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
import { Actor, LivePhaseRecord, TopicComparison } from '@/types'
import ReviewChatView from './ReviewChatView'
import SemanticSidebar from './SemanticSidebar'
import DiffSidebar from './DiffSidebar'

interface DebateViewProps {
  actors: Actor[]
  judgeActor?: Actor
  phaseHistory: LivePhaseRecord[]
  selectedDiffPhaseId: string | null
  onSelectDiffPhase: (phaseId: string | null) => void
  status: string
  question?: string
  semanticComparisons?: Map<string, TopicComparison[]>
  selectedTopicId?: string | null
  onSelectTopic?: (topicId: string | null) => void
}

type SidebarTab = 'semantic' | 'diff'

export default function DebateView({
  actors,
  judgeActor,
  phaseHistory,
  selectedDiffPhaseId,
  onSelectDiffPhase,
  status,
  question = '',
  semanticComparisons = new Map(),
  selectedTopicId = null,
  onSelectTopic,
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

  // Auto-switch to diff tab if no semantic data available
  useEffect(() => {
    if (!hasSemanticData && phaseHistory.length > 0) {
      // Check if there are comparable phases for diff
      const comparablePhases = phaseHistory.filter((record) => {
        if (!['initial', 'review', 'revision'].includes(record.phase)) return false
        return Object.keys(record.messages).length >= 2
      })
      if (comparablePhases.length > 0 && sidebarTab === 'semantic') {
        setSidebarTab('diff')
      }
    }
  }, [hasSemanticData, phaseHistory, sidebarTab])

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
        />
      </div>

      {/* Right sidebar with tabs - scrolls independently */}
      <div className="w-80 lg:w-[420px] shrink-0 border-l border-border">
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
        <div className="h-[calc(100%-40px)] overflow-hidden">
          {sidebarTab === 'semantic' ? (
            <SemanticSidebar
              phaseHistory={phaseHistory}
              semanticComparisons={semanticComparisons}
              selectedDiffPhaseId={selectedDiffPhaseId}
              onSelectDiffPhase={onSelectDiffPhase}
              selectedTopicId={selectedTopicId}
              onSelectTopic={onSelectTopic || (() => {})}
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

import { useMemo } from 'react'
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

  // Check if streaming
  const isBaseStreaming = useMemo(() => {
    if (!selectedPhase || !selectedBaseId) return false
    return selectedPhase.messages[selectedBaseId]?.status === 'streaming'
  }, [selectedPhase, selectedBaseId])

  const isCompareStreaming = useMemo(() => {
    if (!selectedPhase || !selectedCompareId) return false
    return selectedPhase.messages[selectedCompareId]?.status === 'streaming'
  }, [selectedPhase, selectedCompareId])

  // Compute diff
  const diffResult = useMemo(() => {
    if (!canShowDiff(baseContent, compareContent)) return null
    return computeDiff(baseContent!, compareContent!)
  }, [baseContent, compareContent])

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
        ) : isBaseStreaming || isCompareStreaming ? (
          <div className="space-y-3">
            {/* Show partial diff while streaming */}
            <div className="text-text-tertiary text-xs text-center">
              正在生成内容...
            </div>
            {diffResult && diffResult.length > 0 && (
              <div className="font-mono text-xs space-y-0.5">
                {diffResult.slice(0, 20).map((item, idx) => (
                  <DiffLineComponent key={idx} item={item} />
                ))}
                {diffResult.length > 20 && (
                  <div className="text-text-tertiary text-center">...</div>
                )}
              </div>
            )}
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
```


### frontend\src\components\ReviewChatView.tsx

```tsx
'use client'

import { useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Actor, LivePhaseRecord, LiveMessage, ConvergenceData } from '@/types'

interface ReviewChatViewProps {
  question: string
  actors: Actor[]
  phaseHistory: LivePhaseRecord[]
  status: string
  onMessageClick?: (actorId: string, phase: string) => void
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

function MessageCard({
  message,
  onMessageClick,
}: {
  message: LiveMessage
  onMessageClick?: (actorId: string, phase: string) => void
}) {
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
        {message.status === 'streaming' && (
          <span className="text-xs text-accent-blue animate-pulse">streaming...</span>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <div className="text-text-primary whitespace-pre-wrap">
          {message.content}
          {message.status === 'streaming' && (
            <span className="inline-block w-2 h-4 bg-text-primary animate-pulse ml-1" />
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ConvergenceCard({ convergence }: { convergence: ConvergenceData }) {
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
            : 'bg-accent-yellow/20 text-accent-yellow'
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
            <div className="text-accent-yellow text-xs mb-1">⚡ 仍存分歧</div>
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
}

export default function ReviewChatView({
  question,
  actors,
  phaseHistory,
  status,
  onMessageClick,
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

  // Find if there's a final consensus in summary phase (for reference, not displayed)
  const summaryPhase = useMemo(() => {
    return phaseHistory.find((r) => r.phase === 'summary')
  }, [phaseHistory])

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
          <div className="text-text-tertiary text-xs text-center py-8">
            {comparablePhases.length === 0
              ? '等待语义分析完成...'
              : '该阶段暂无语义分析结果'}
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
                            : 'text-accent-yellow'
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
import { ArrowLeft, Loader2 } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { DebateSession, Actor, Round, Message } from '@/types'

interface SessionDetailViewProps {
  sessionId: string
  onBack: () => void
}

// Diff utility for comparing texts
function computeDiff(oldText: string, newText: string): { type: 'add' | 'remove' | 'same'; text: string }[] {
  const oldLines = oldText.split(/[。！？\n]/).filter(l => l.trim())
  const newLines = newText.split(/[。！？\n]/).filter(l => l.trim())

  const result: { type: 'add' | 'remove' | 'same'; text: string }[] = []
  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)

  // Simple line-based diff
  for (const line of oldLines) {
    if (!newSet.has(line)) {
      result.push({ type: 'remove', text: line })
    }
  }
  for (const line of newLines) {
    if (!oldSet.has(line)) {
      result.push({ type: 'add', text: line })
    } else {
      result.push({ type: 'same', text: line })
    }
  }

  return result
}

export default function SessionDetailView({ sessionId, onBack }: SessionDetailViewProps) {
  const [session, setSession] = useState<DebateSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhase, setSelectedPhase] = useState<string>('initial')
  const [baseActorId, setBaseActorId] = useState<string | null>(null)
  const [compareActorId, setCompareActorId] = useState<string | null>(null)

  useEffect(() => {
    loadSession()
  }, [sessionId])

  const loadSession = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getDebate(sessionId)
      setSession(data)
      // Set default actor selection for diff
      const actors = data.actors.filter(a => !a.is_meta_judge)
      if (actors.length >= 2) {
        setBaseActorId(actors[0].id)
        setCompareActorId(actors[1].id)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Get messages grouped by phase for chat timeline
  // Filter out summary phase - it should only show via ConsensusView, not in chat
  const chatMessages = useMemo(() => {
    if (!session) return []

    const messages: {
      actor_id: string
      actor_name: string
      actor_color: string
      actor_icon: string
      round_number: number
      phase: string
      role: string
      content: string
      created_at: string
    }[] = []

    // Build actor lookup including judge_actor
    const allActors: Actor[] = [...session.actors]
    if (session.judge_actor) {
      allActors.push(session.judge_actor)
    }

    for (const round of session.rounds) {
      // Skip summary phase - only show via ConsensusView
      if (round.phase === 'summary') continue

      for (const msg of round.messages) {
        // Skip summary role messages as well
        if (msg.role === 'summary') continue

        // First try to find actor in allActors (including judge)
        let actor = allActors.find(a => a.id === msg.actor_id)
        // If not found and we have actor_name from API, use it
        if (!actor && msg.actor_name) {
          // Create a synthetic actor from message data
          actor = {
            id: msg.actor_id,
            name: msg.actor_name,
            display_color: '#9333EA', // Default purple for judge
            icon: '⚖️',
            is_meta_judge: true,
            provider: 'openai' as const,
            model: '',
            created_at: '',
          }
        }
        if (actor) {
          messages.push({
            actor_id: msg.actor_id,
            actor_name: actor.name,
            actor_color: actor.display_color,
            actor_icon: actor.icon,
            round_number: round.round_number,
            phase: round.phase,
            role: msg.role,
            content: msg.content,
            created_at: msg.created_at,
          })
        }
      }
    }

    return messages
  }, [session])

  // Get unique phases from rounds (excluding summary for diff)
  const phases = useMemo(() => {
    if (!session) return []
    const phaseSet = new Set<string>()
    for (const round of session.rounds) {
      // Exclude summary from phase selector
      if (round.phase !== 'summary') {
        phaseSet.add(round.phase)
      }
    }
    return Array.from(phaseSet)
  }, [session])

  // Get messages for selected phase (for diff view)
  const phaseMessages = useMemo(() => {
    if (!session || !selectedPhase) return []
    return session.rounds
      .filter(r => r.phase === selectedPhase)
      .flatMap(r => r.messages)
  }, [session, selectedPhase])

  // Compute diff between two actors
  const diffResult = useMemo(() => {
    if (!baseActorId || !compareActorId) return null

    const baseMsg = phaseMessages.find(m => m.actor_id === baseActorId)
    const compareMsg = phaseMessages.find(m => m.actor_id === compareActorId)

    if (!baseMsg || !compareMsg) return null

    return computeDiff(baseMsg.content, compareMsg.content)
  }, [phaseMessages, baseActorId, compareActorId])

  // Phase labels for display
  const phaseLabels: Record<string, string> = {
    initial: '初始回答',
    review: '互评',
    revision: '修订',
    final_answer: '最终回答',
    summary: '共识总结',
  }

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
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <button onClick={onBack} className="text-text-secondary hover:text-text-primary transition-colors">
              ← Back
            </button>
            <h1 className="text-lg font-semibold tracking-wider text-accent-orange">Session Detail</h1>
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
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <button onClick={onBack} className="text-text-secondary hover:text-text-primary transition-colors">
              ← Back
            </button>
            <h1 className="text-lg font-semibold tracking-wider text-accent-orange">Session Detail</h1>
            <div className="w-16" />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-accent-red">{error || 'Session not found'}</div>
        </main>
      </div>
    )
  }

  const nonJudgeActors = session.actors.filter(a => !a.is_meta_judge)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
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

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Chat Timeline (left 2/3) */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto">
            {/* Question */}
            <div className="mb-8">
              <h2 className="text-xl text-text-secondary mb-2">问题</h2>
              <p className="text-2xl font-medium">{session.question}</p>
              <p className="text-text-tertiary text-sm mt-2">{formatDate(session.created_at)}</p>
            </div>

            {/* Status */}
            <div className="mb-6">
              <span className={`px-3 py-1 rounded-full text-sm ${
                session.status === 'completed' ? 'bg-accent-green/20 text-accent-green' :
                session.status === 'debating' ? 'bg-accent-blue/20 text-accent-blue' :
                'bg-text-tertiary/20 text-text-tertiary'
              }`}>
                {session.status === 'completed' ? '已完成' : session.status}
              </span>
            </div>

            {/* Chat Messages */}
            <div className="space-y-4">
              {chatMessages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-bg-secondary border border-border rounded-2xl overflow-hidden"
                >
                  {/* Header */}
                  <div
                    className="px-4 py-3 flex items-center gap-3 border-b border-border"
                    style={{ backgroundColor: `${msg.actor_color}15` }}
                  >
                    <span className="text-xl">{msg.actor_icon}</span>
                    <span className="font-medium" style={{ color: msg.actor_color }}>
                      {msg.actor_name}
                    </span>
                    <span className="px-2 py-0.5 bg-text-tertiary/20 text-text-tertiary text-xs rounded">
                      {phaseLabels[msg.phase] || msg.phase}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="px-4 py-4">
                    <div className="text-text-primary whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Consensus */}
            {session.consensus && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl p-6"
              >
                <h3 className="text-lg font-semibold text-accent-purple mb-4">综合结论</h3>
                <div className="text-text-primary mb-4">{session.consensus.summary}</div>

                {session.consensus.agreements.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm text-accent-green mb-2">共识点：</h4>
                    <ul className="list-disc list-inside text-text-secondary text-sm">
                      {session.consensus.agreements.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {session.consensus.disagreements.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm text-accent-orange mb-2">分歧点：</h4>
                    <ul className="list-disc list-inside text-text-secondary text-sm">
                      {session.consensus.disagreements.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text-tertiary">置信度：</span>
                  {session.consensus.confidence !== null && session.consensus.confidence !== undefined ? (
                    <span className="text-accent-blue">{Math.round(session.consensus.confidence * 100)}%</span>
                  ) : (
                    <span className="text-text-tertiary">暂不可用</span>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Diff Sidebar (right 1/3) */}
        <div className="w-96 border-l border-border overflow-auto p-4 bg-bg-secondary">
          <h3 className="text-text-secondary text-sm font-medium mb-4">差异对比</h3>

          {/* Phase selector */}
          <div className="mb-4">
            <label className="text-text-tertiary text-xs block mb-1">阶段</label>
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm focus:outline-none focus:border-accent-blue"
            >
              {phases.map((p) => (
                <option key={p} value={p}>{phaseLabels[p] || p}</option>
              ))}
            </select>
          </div>

          {/* Actor selectors */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="text-text-tertiary text-xs block mb-1">Base</label>
              <select
                value={baseActorId || ''}
                onChange={(e) => setBaseActorId(e.target.value)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm focus:outline-none focus:border-accent-blue"
              >
                {nonJudgeActors.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-text-tertiary text-xs block mb-1">Compare</label>
              <select
                value={compareActorId || ''}
                onChange={(e) => setCompareActorId(e.target.value)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm focus:outline-none focus:border-accent-blue"
              >
                {nonJudgeActors.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Diff display */}
          <div className="bg-bg-tertiary rounded-lg p-3 font-mono text-xs">
            {diffResult ? (
              <div className="space-y-1">
                {diffResult.map((item, idx) => (
                  <div
                    key={idx}
                    className={`${
                      item.type === 'add' ? 'text-accent-green bg-accent-green/10' :
                      item.type === 'remove' ? 'text-accent-red bg-accent-red/10' :
                      'text-text-tertiary'
                    } px-2 py-1 rounded`}
                  >
                    {item.type === 'add' && '+ '}
                    {item.type === 'remove' && '- '}
                    {item.text}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-text-tertiary text-center py-4">
                选择两个 Actor 进行比较
              </div>
            )}
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
    const data = await apiClient.startDebate({
      question,
      actor_ids: actorIds,
      judge_actor_id: judgeActorId,
      config: config || { max_rounds: 3 },
    })

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
    })

    get().streamDebate(data.session_id)

    return data.session_id
  },

  streamDebate: (sessionId) => {
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
        return {
          currentPhase: phase,
          currentRound: data.round || cycle || 1,
          currentCycle: cycle || 0,
          phaseHistory: newHistory,
          currentPhaseRecord: newRecord,
          // Clear legacy streaming state for new phase
          streamingContent: new Map(),
          activeActors: new Set(),
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

    eventSource.addEventListener('token', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      const actorId = data.actor_id as string
      const token = data.content as string

      set((state) => {
        // Update legacy state
        const newMap = new Map(state.streamingContent)
        const existing = newMap.get(actorId) || ''
        newMap.set(actorId, existing + token)

        // Update phase history
        const phaseRecord = state.currentPhaseRecord
        if (phaseRecord && phaseRecord.messages[actorId]) {
          const updatedMessage: LiveMessage = {
            ...phaseRecord.messages[actorId],
            content: phaseRecord.messages[actorId].content + token,
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
            currentPhaseRecord: updatedRecord,
            phaseHistory: updatedHistory,
          }
        }

        return { streamingContent: newMap }
      })
    })

    eventSource.addEventListener('actor_end', (e: MessageEvent) => {
      console.log('[SSE] actor_end:', e.data)
      const data = JSON.parse(e.data)
      const actorId = data.actor_id as string

      set((state) => {
        // Update legacy state
        const newActive = new Set(state.activeActors)
        newActive.delete(actorId)

        // Update phase history
        const phaseRecord = state.currentPhaseRecord
        if (phaseRecord && phaseRecord.messages[actorId]) {
          const updatedMessage: LiveMessage = {
            ...phaseRecord.messages[actorId],
            status: 'done',
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
            activeActors: newActive,
            currentPhaseRecord: updatedRecord,
            phaseHistory: updatedHistory,
          }
        }

        return { activeActors: newActive }
      })
    })

    eventSource.addEventListener('phase_end', (e: MessageEvent) => {
      console.log('[SSE] phase_end:', e.data)
      // Phase ended, nothing special to do - history is preserved
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
      set({ status: 'error', error: data.message })
      eventSource?.close()
      eventSource = null
    })

    eventSource.addEventListener('cancelled', () => {
      console.log('[SSE] cancelled')
      expectedClose = true  // Mark as expected close
      set({ status: 'idle', error: 'Review was cancelled' })
      eventSource?.close()
      eventSource = null
    })
  },

  stopDebate: async () => {
    expectedClose = true  // Mark as expected close
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


### frontend\tsconfig.tsbuildinfo

```
{"fileNames":["./node_modules/typescript/lib/lib.es5.d.ts","./node_modules/typescript/lib/lib.es2015.d.ts","./node_modules/typescript/lib/lib.es2016.d.ts","./node_modules/typescript/lib/lib.es2017.d.ts","./node_modules/typescript/lib/lib.es2018.d.ts","./node_modules/typescript/lib/lib.es2019.d.ts","./node_modules/typescript/lib/lib.es2020.d.ts","./node_modules/typescript/lib/lib.es2021.d.ts","./node_modules/typescript/lib/lib.es2022.d.ts","./node_modules/typescript/lib/lib.es2023.d.ts","./node_modules/typescript/lib/lib.es2024.d.ts","./node_modules/typescript/lib/lib.esnext.d.ts","./node_modules/typescript/lib/lib.dom.d.ts","./node_modules/typescript/lib/lib.dom.iterable.d.ts","./node_modules/typescript/lib/lib.es2015.core.d.ts","./node_modules/typescript/lib/lib.es2015.collection.d.ts","./node_modules/typescript/lib/lib.es2015.generator.d.ts","./node_modules/typescript/lib/lib.es2015.iterable.d.ts","./node_modules/typescript/lib/lib.es2015.promise.d.ts","./node_modules/typescript/lib/lib.es2015.proxy.d.ts","./node_modules/typescript/lib/lib.es2015.reflect.d.ts","./node_modules/typescript/lib/lib.es2015.symbol.d.ts","./node_modules/typescript/lib/lib.es2015.symbol.wellknown.d.ts","./node_modules/typescript/lib/lib.es2016.array.include.d.ts","./node_modules/typescript/lib/lib.es2016.intl.d.ts","./node_modules/typescript/lib/lib.es2017.arraybuffer.d.ts","./node_modules/typescript/lib/lib.es2017.date.d.ts","./node_modules/typescript/lib/lib.es2017.object.d.ts","./node_modules/typescript/lib/lib.es2017.sharedmemory.d.ts","./node_modules/typescript/lib/lib.es2017.string.d.ts","./node_modules/typescript/lib/lib.es2017.intl.d.ts","./node_modules/typescript/lib/lib.es2017.typedarrays.d.ts","./node_modules/typescript/lib/lib.es2018.asyncgenerator.d.ts","./node_modules/typescript/lib/lib.es2018.asynciterable.d.ts","./node_modules/typescript/lib/lib.es2018.intl.d.ts","./node_modules/typescript/lib/lib.es2018.promise.d.ts","./node_modules/typescript/lib/lib.es2018.regexp.d.ts","./node_modules/typescript/lib/lib.es2019.array.d.ts","./node_modules/typescript/lib/lib.es2019.object.d.ts","./node_modules/typescript/lib/lib.es2019.string.d.ts","./node_modules/typescript/lib/lib.es2019.symbol.d.ts","./node_modules/typescript/lib/lib.es2019.intl.d.ts","./node_modules/typescript/lib/lib.es2020.bigint.d.ts","./node_modules/typescript/lib/lib.es2020.date.d.ts","./node_modules/typescript/lib/lib.es2020.promise.d.ts","./node_modules/typescript/lib/lib.es2020.sharedmemory.d.ts","./node_modules/typescript/lib/lib.es2020.string.d.ts","./node_modules/typescript/lib/lib.es2020.symbol.wellknown.d.ts","./node_modules/typescript/lib/lib.es2020.intl.d.ts","./node_modules/typescript/lib/lib.es2020.number.d.ts","./node_modules/typescript/lib/lib.es2021.promise.d.ts","./node_modules/typescript/lib/lib.es2021.string.d.ts","./node_modules/typescript/lib/lib.es2021.weakref.d.ts","./node_modules/typescript/lib/lib.es2021.intl.d.ts","./node_modules/typescript/lib/lib.es2022.array.d.ts","./node_modules/typescript/lib/lib.es2022.error.d.ts","./node_modules/typescript/lib/lib.es2022.intl.d.ts","./node_modules/typescript/lib/lib.es2022.object.d.ts","./node_modules/typescript/lib/lib.es2022.string.d.ts","./node_modules/typescript/lib/lib.es2022.regexp.d.ts","./node_modules/typescript/lib/lib.es2023.array.d.ts","./node_modules/typescript/lib/lib.es2023.collection.d.ts","./node_modules/typescript/lib/lib.es2023.intl.d.ts","./node_modules/typescript/lib/lib.es2024.arraybuffer.d.ts","./node_modules/typescript/lib/lib.es2024.collection.d.ts","./node_modules/typescript/lib/lib.es2024.object.d.ts","./node_modules/typescript/lib/lib.es2024.promise.d.ts","./node_modules/typescript/lib/lib.es2024.regexp.d.ts","./node_modules/typescript/lib/lib.es2024.sharedmemory.d.ts","./node_modules/typescript/lib/lib.es2024.string.d.ts","./node_modules/typescript/lib/lib.esnext.array.d.ts","./node_modules/typescript/lib/lib.esnext.collection.d.ts","./node_modules/typescript/lib/lib.esnext.intl.d.ts","./node_modules/typescript/lib/lib.esnext.disposable.d.ts","./node_modules/typescript/lib/lib.esnext.promise.d.ts","./node_modules/typescript/lib/lib.esnext.decorators.d.ts","./node_modules/typescript/lib/lib.esnext.iterator.d.ts","./node_modules/typescript/lib/lib.esnext.float16.d.ts","./node_modules/typescript/lib/lib.esnext.error.d.ts","./node_modules/typescript/lib/lib.esnext.sharedmemory.d.ts","./node_modules/typescript/lib/lib.decorators.d.ts","./node_modules/typescript/lib/lib.decorators.legacy.d.ts","./node_modules/next/dist/styled-jsx/types/css.d.ts","./node_modules/@types/react/global.d.ts","./node_modules/csstype/index.d.ts","./node_modules/@types/prop-types/index.d.ts","./node_modules/@types/react/index.d.ts","./node_modules/next/dist/styled-jsx/types/index.d.ts","./node_modules/next/dist/styled-jsx/types/macro.d.ts","./node_modules/next/dist/styled-jsx/types/style.d.ts","./node_modules/next/dist/styled-jsx/types/global.d.ts","./node_modules/next/dist/shared/lib/amp.d.ts","./node_modules/next/amp.d.ts","./node_modules/@types/node/compatibility/disposable.d.ts","./node_modules/@types/node/compatibility/indexable.d.ts","./node_modules/@types/node/compatibility/iterators.d.ts","./node_modules/@types/node/compatibility/index.d.ts","./node_modules/@types/node/globals.typedarray.d.ts","./node_modules/@types/node/buffer.buffer.d.ts","./node_modules/@types/node/globals.d.ts","./node_modules/@types/node/web-globals/abortcontroller.d.ts","./node_modules/@types/node/web-globals/domexception.d.ts","./node_modules/@types/node/web-globals/events.d.ts","./node_modules/undici-types/header.d.ts","./node_modules/undici-types/readable.d.ts","./node_modules/undici-types/file.d.ts","./node_modules/undici-types/fetch.d.ts","./node_modules/undici-types/formdata.d.ts","./node_modules/undici-types/connector.d.ts","./node_modules/undici-types/client.d.ts","./node_modules/undici-types/errors.d.ts","./node_modules/undici-types/dispatcher.d.ts","./node_modules/undici-types/global-dispatcher.d.ts","./node_modules/undici-types/global-origin.d.ts","./node_modules/undici-types/pool-stats.d.ts","./node_modules/undici-types/pool.d.ts","./node_modules/undici-types/handlers.d.ts","./node_modules/undici-types/balanced-pool.d.ts","./node_modules/undici-types/agent.d.ts","./node_modules/undici-types/mock-interceptor.d.ts","./node_modules/undici-types/mock-agent.d.ts","./node_modules/undici-types/mock-client.d.ts","./node_modules/undici-types/mock-pool.d.ts","./node_modules/undici-types/mock-errors.d.ts","./node_modules/undici-types/proxy-agent.d.ts","./node_modules/undici-types/env-http-proxy-agent.d.ts","./node_modules/undici-types/retry-handler.d.ts","./node_modules/undici-types/retry-agent.d.ts","./node_modules/undici-types/api.d.ts","./node_modules/undici-types/interceptors.d.ts","./node_modules/undici-types/util.d.ts","./node_modules/undici-types/cookies.d.ts","./node_modules/undici-types/patch.d.ts","./node_modules/undici-types/websocket.d.ts","./node_modules/undici-types/eventsource.d.ts","./node_modules/undici-types/filereader.d.ts","./node_modules/undici-types/diagnostics-channel.d.ts","./node_modules/undici-types/content-type.d.ts","./node_modules/undici-types/cache.d.ts","./node_modules/undici-types/index.d.ts","./node_modules/@types/node/web-globals/fetch.d.ts","./node_modules/@types/node/assert.d.ts","./node_modules/@types/node/assert/strict.d.ts","./node_modules/@types/node/async_hooks.d.ts","./node_modules/@types/node/buffer.d.ts","./node_modules/@types/node/child_process.d.ts","./node_modules/@types/node/cluster.d.ts","./node_modules/@types/node/console.d.ts","./node_modules/@types/node/constants.d.ts","./node_modules/@types/node/crypto.d.ts","./node_modules/@types/node/dgram.d.ts","./node_modules/@types/node/diagnostics_channel.d.ts","./node_modules/@types/node/dns.d.ts","./node_modules/@types/node/dns/promises.d.ts","./node_modules/@types/node/domain.d.ts","./node_modules/@types/node/events.d.ts","./node_modules/@types/node/fs.d.ts","./node_modules/@types/node/fs/promises.d.ts","./node_modules/@types/node/http.d.ts","./node_modules/@types/node/http2.d.ts","./node_modules/@types/node/https.d.ts","./node_modules/@types/node/inspector.generated.d.ts","./node_modules/@types/node/module.d.ts","./node_modules/@types/node/net.d.ts","./node_modules/@types/node/os.d.ts","./node_modules/@types/node/path.d.ts","./node_modules/@types/node/perf_hooks.d.ts","./node_modules/@types/node/process.d.ts","./node_modules/@types/node/punycode.d.ts","./node_modules/@types/node/querystring.d.ts","./node_modules/@types/node/readline.d.ts","./node_modules/@types/node/readline/promises.d.ts","./node_modules/@types/node/repl.d.ts","./node_modules/@types/node/sea.d.ts","./node_modules/@types/node/stream.d.ts","./node_modules/@types/node/stream/promises.d.ts","./node_modules/@types/node/stream/consumers.d.ts","./node_modules/@types/node/stream/web.d.ts","./node_modules/@types/node/string_decoder.d.ts","./node_modules/@types/node/test.d.ts","./node_modules/@types/node/timers.d.ts","./node_modules/@types/node/timers/promises.d.ts","./node_modules/@types/node/tls.d.ts","./node_modules/@types/node/trace_events.d.ts","./node_modules/@types/node/tty.d.ts","./node_modules/@types/node/url.d.ts","./node_modules/@types/node/util.d.ts","./node_modules/@types/node/v8.d.ts","./node_modules/@types/node/vm.d.ts","./node_modules/@types/node/wasi.d.ts","./node_modules/@types/node/worker_threads.d.ts","./node_modules/@types/node/zlib.d.ts","./node_modules/@types/node/index.d.ts","./node_modules/next/dist/server/get-page-files.d.ts","./node_modules/@types/react/canary.d.ts","./node_modules/@types/react/experimental.d.ts","./node_modules/@types/react-dom/index.d.ts","./node_modules/@types/react-dom/canary.d.ts","./node_modules/@types/react-dom/experimental.d.ts","./node_modules/next/dist/compiled/webpack/webpack.d.ts","./node_modules/next/dist/server/config.d.ts","./node_modules/next/dist/lib/load-custom-routes.d.ts","./node_modules/next/dist/shared/lib/image-config.d.ts","./node_modules/next/dist/build/webpack/plugins/subresource-integrity-plugin.d.ts","./node_modules/next/dist/server/body-streams.d.ts","./node_modules/next/dist/server/future/route-kind.d.ts","./node_modules/next/dist/server/future/route-definitions/route-definition.d.ts","./node_modules/next/dist/server/future/route-matches/route-match.d.ts","./node_modules/next/dist/client/components/app-router-headers.d.ts","./node_modules/next/dist/server/request-meta.d.ts","./node_modules/next/dist/server/lib/revalidate.d.ts","./node_modules/next/dist/server/config-shared.d.ts","./node_modules/next/dist/server/base-http/index.d.ts","./node_modules/next/dist/server/api-utils/index.d.ts","./node_modules/next/dist/server/node-environment.d.ts","./node_modules/next/dist/server/require-hook.d.ts","./node_modules/next/dist/server/node-polyfill-crypto.d.ts","./node_modules/next/dist/lib/page-types.d.ts","./node_modules/next/dist/build/analysis/get-page-static-info.d.ts","./node_modules/next/dist/build/webpack/loaders/get-module-build-info.d.ts","./node_modules/next/dist/build/webpack/plugins/middleware-plugin.d.ts","./node_modules/next/dist/server/render-result.d.ts","./node_modules/next/dist/server/future/helpers/i18n-provider.d.ts","./node_modules/next/dist/server/web/next-url.d.ts","./node_modules/next/dist/compiled/@edge-runtime/cookies/index.d.ts","./node_modules/next/dist/server/web/spec-extension/cookies.d.ts","./node_modules/next/dist/server/web/spec-extension/request.d.ts","./node_modules/next/dist/server/web/spec-extension/fetch-event.d.ts","./node_modules/next/dist/server/web/spec-extension/response.d.ts","./node_modules/next/dist/server/web/types.d.ts","./node_modules/next/dist/lib/setup-exception-listeners.d.ts","./node_modules/next/dist/lib/constants.d.ts","./node_modules/next/dist/build/index.d.ts","./node_modules/next/dist/build/webpack/plugins/pages-manifest-plugin.d.ts","./node_modules/next/dist/shared/lib/router/utils/route-regex.d.ts","./node_modules/next/dist/shared/lib/router/utils/route-matcher.d.ts","./node_modules/next/dist/shared/lib/router/utils/parse-url.d.ts","./node_modules/next/dist/server/base-http/node.d.ts","./node_modules/next/dist/server/font-utils.d.ts","./node_modules/next/dist/build/webpack/plugins/flight-manifest-plugin.d.ts","./node_modules/next/dist/server/future/route-modules/route-module.d.ts","./node_modules/next/dist/server/load-components.d.ts","./node_modules/next/dist/shared/lib/router/utils/middleware-route-matcher.d.ts","./node_modules/next/dist/build/webpack/plugins/next-font-manifest-plugin.d.ts","./node_modules/next/dist/server/future/route-definitions/locale-route-definition.d.ts","./node_modules/next/dist/server/future/route-definitions/pages-route-definition.d.ts","./node_modules/next/dist/shared/lib/mitt.d.ts","./node_modules/next/dist/client/with-router.d.ts","./node_modules/next/dist/client/router.d.ts","./node_modules/next/dist/client/route-loader.d.ts","./node_modules/next/dist/client/page-loader.d.ts","./node_modules/next/dist/shared/lib/bloom-filter.d.ts","./node_modules/next/dist/shared/lib/router/router.d.ts","./node_modules/next/dist/shared/lib/router-context.shared-runtime.d.ts","./node_modules/next/dist/shared/lib/loadable-context.shared-runtime.d.ts","./node_modules/next/dist/shared/lib/loadable.shared-runtime.d.ts","./node_modules/next/dist/shared/lib/image-config-context.shared-runtime.d.ts","./node_modules/next/dist/shared/lib/hooks-client-context.shared-runtime.d.ts","./node_modules/next/dist/shared/lib/head-manager-context.shared-runtime.d.ts","./node_modules/next/dist/server/future/route-definitions/app-page-route-definition.d.ts","./node_modules/next/dist/shared/lib/modern-browserslist-target.d.ts","./node_modules/next/dist/shared/lib/constants.d.ts","./node_modules/next/dist/build/webpack/loaders/metadata/types.d.ts","./node_modules/next/dist/build/page-extensions-type.d.ts","./node_modules/next/dist/build/webpack/loaders/next-app-loader.d.ts","./node_modules/next/dist/server/lib/app-dir-module.d.ts","./node_modules/next/dist/server/response-cache/types.d.ts","./node_modules/next/dist/server/response-cache/index.d.ts","./node_modules/next/dist/server/lib/incremental-cache/index.d.ts","./node_modules/next/dist/client/components/hooks-server-context.d.ts","./node_modules/next/dist/server/app-render/dynamic-rendering.d.ts","./node_modules/next/dist/client/components/static-generation-async-storage-instance.d.ts","./node_modules/next/dist/client/components/static-generation-async-storage.external.d.ts","./node_modules/next/dist/server/web/spec-extension/adapters/request-cookies.d.ts","./node_modules/next/dist/server/async-storage/draft-mode-provider.d.ts","./node_modules/next/dist/server/web/spec-extension/adapters/headers.d.ts","./node_modules/next/dist/client/components/request-async-storage-instance.d.ts","./node_modules/next/dist/client/components/request-async-storage.external.d.ts","./node_modules/next/dist/server/app-render/create-error-handler.d.ts","./node_modules/next/dist/server/app-render/app-render.d.ts","./node_modules/next/dist/shared/lib/server-inserted-html.shared-runtime.d.ts","./node_modules/next/dist/shared/lib/amp-context.shared-runtime.d.ts","./node_modules/next/dist/server/future/route-modules/app-page/vendored/contexts/entrypoints.d.ts","./node_modules/next/dist/server/future/route-modules/app-page/module.compiled.d.ts","./node_modules/@types/react/jsx-runtime.d.ts","./node_modules/next/dist/client/components/error-boundary.d.ts","./node_modules/next/dist/client/components/router-reducer/create-initial-router-state.d.ts","./node_modules/next/dist/client/components/app-router.d.ts","./node_modules/next/dist/client/components/layout-router.d.ts","./node_modules/next/dist/client/components/render-from-template-context.d.ts","./node_modules/next/dist/client/components/action-async-storage-instance.d.ts","./node_modules/next/dist/client/components/action-async-storage.external.d.ts","./node_modules/next/dist/client/components/client-page.d.ts","./node_modules/next/dist/client/components/search-params.d.ts","./node_modules/next/dist/client/components/not-found-boundary.d.ts","./node_modules/next/dist/server/app-render/rsc/preloads.d.ts","./node_modules/next/dist/server/app-render/rsc/postpone.d.ts","./node_modules/next/dist/server/app-render/rsc/taint.d.ts","./node_modules/next/dist/server/app-render/entry-base.d.ts","./node_modules/next/dist/build/templates/app-page.d.ts","./node_modules/next/dist/server/future/route-modules/app-page/module.d.ts","./node_modules/next/dist/server/app-render/types.d.ts","./node_modules/next/dist/client/components/router-reducer/fetch-server-response.d.ts","./node_modules/next/dist/client/components/router-reducer/router-reducer-types.d.ts","./node_modules/next/dist/shared/lib/app-router-context.shared-runtime.d.ts","./node_modules/next/dist/server/future/route-modules/pages/vendored/contexts/entrypoints.d.ts","./node_modules/next/dist/server/future/route-modules/pages/module.compiled.d.ts","./node_modules/next/dist/build/templates/pages.d.ts","./node_modules/next/dist/server/future/route-modules/pages/module.d.ts","./node_modules/next/dist/server/render.d.ts","./node_modules/next/dist/server/future/route-definitions/pages-api-route-definition.d.ts","./node_modules/next/dist/server/future/route-matches/pages-api-route-match.d.ts","./node_modules/next/dist/server/future/route-matchers/route-matcher.d.ts","./node_modules/next/dist/server/future/route-matcher-providers/route-matcher-provider.d.ts","./node_modules/next/dist/server/future/route-matcher-managers/route-matcher-manager.d.ts","./node_modules/next/dist/server/future/normalizers/normalizer.d.ts","./node_modules/next/dist/server/future/normalizers/locale-route-normalizer.d.ts","./node_modules/next/dist/server/future/normalizers/request/pathname-normalizer.d.ts","./node_modules/next/dist/server/future/normalizers/request/suffix.d.ts","./node_modules/next/dist/server/future/normalizers/request/rsc.d.ts","./node_modules/next/dist/server/future/normalizers/request/prefix.d.ts","./node_modules/next/dist/server/future/normalizers/request/postponed.d.ts","./node_modules/next/dist/server/future/normalizers/request/action.d.ts","./node_modules/next/dist/server/future/normalizers/request/prefetch-rsc.d.ts","./node_modules/next/dist/server/future/normalizers/request/next-data.d.ts","./node_modules/next/dist/server/base-server.d.ts","./node_modules/next/dist/server/image-optimizer.d.ts","./node_modules/next/dist/server/next-server.d.ts","./node_modules/next/dist/lib/coalesced-function.d.ts","./node_modules/next/dist/server/lib/router-utils/types.d.ts","./node_modules/next/dist/trace/types.d.ts","./node_modules/next/dist/trace/trace.d.ts","./node_modules/next/dist/trace/shared.d.ts","./node_modules/next/dist/trace/index.d.ts","./node_modules/next/dist/build/load-jsconfig.d.ts","./node_modules/next/dist/build/webpack-config.d.ts","./node_modules/next/dist/build/webpack/plugins/define-env-plugin.d.ts","./node_modules/next/dist/build/swc/index.d.ts","./node_modules/next/dist/server/dev/parse-version-info.d.ts","./node_modules/next/dist/server/dev/hot-reloader-types.d.ts","./node_modules/next/dist/telemetry/storage.d.ts","./node_modules/next/dist/server/lib/types.d.ts","./node_modules/next/dist/server/lib/render-server.d.ts","./node_modules/next/dist/server/lib/router-server.d.ts","./node_modules/next/dist/shared/lib/router/utils/path-match.d.ts","./node_modules/next/dist/server/lib/router-utils/filesystem.d.ts","./node_modules/next/dist/server/lib/router-utils/setup-dev-bundler.d.ts","./node_modules/next/dist/server/lib/dev-bundler-service.d.ts","./node_modules/next/dist/server/dev/static-paths-worker.d.ts","./node_modules/next/dist/server/dev/next-dev-server.d.ts","./node_modules/next/dist/server/next.d.ts","./node_modules/next/dist/lib/metadata/types/alternative-urls-types.d.ts","./node_modules/next/dist/lib/metadata/types/extra-types.d.ts","./node_modules/next/dist/lib/metadata/types/metadata-types.d.ts","./node_modules/next/dist/lib/metadata/types/manifest-types.d.ts","./node_modules/next/dist/lib/metadata/types/opengraph-types.d.ts","./node_modules/next/dist/lib/metadata/types/twitter-types.d.ts","./node_modules/next/dist/lib/metadata/types/metadata-interface.d.ts","./node_modules/next/types/index.d.ts","./node_modules/next/dist/shared/lib/html-context.shared-runtime.d.ts","./node_modules/@next/env/dist/index.d.ts","./node_modules/next/dist/shared/lib/utils.d.ts","./node_modules/next/dist/pages/_app.d.ts","./node_modules/next/app.d.ts","./node_modules/next/dist/server/web/spec-extension/unstable-cache.d.ts","./node_modules/next/dist/server/web/spec-extension/revalidate.d.ts","./node_modules/next/dist/server/web/spec-extension/unstable-no-store.d.ts","./node_modules/next/cache.d.ts","./node_modules/next/dist/shared/lib/runtime-config.external.d.ts","./node_modules/next/config.d.ts","./node_modules/next/dist/pages/_document.d.ts","./node_modules/next/document.d.ts","./node_modules/next/dist/shared/lib/dynamic.d.ts","./node_modules/next/dynamic.d.ts","./node_modules/next/dist/pages/_error.d.ts","./node_modules/next/error.d.ts","./node_modules/next/dist/shared/lib/head.d.ts","./node_modules/next/head.d.ts","./node_modules/next/dist/client/components/draft-mode.d.ts","./node_modules/next/dist/client/components/headers.d.ts","./node_modules/next/headers.d.ts","./node_modules/next/dist/shared/lib/get-img-props.d.ts","./node_modules/next/dist/client/image-component.d.ts","./node_modules/next/dist/shared/lib/image-external.d.ts","./node_modules/next/image.d.ts","./node_modules/next/dist/client/link.d.ts","./node_modules/next/link.d.ts","./node_modules/next/dist/client/components/redirect-status-code.d.ts","./node_modules/next/dist/client/components/redirect.d.ts","./node_modules/next/dist/client/components/not-found.d.ts","./node_modules/next/dist/client/components/navigation.react-server.d.ts","./node_modules/next/dist/client/components/navigation.d.ts","./node_modules/next/navigation.d.ts","./node_modules/next/router.d.ts","./node_modules/next/dist/client/script.d.ts","./node_modules/next/script.d.ts","./node_modules/next/dist/server/web/spec-extension/user-agent.d.ts","./node_modules/next/dist/compiled/@edge-runtime/primitives/url.d.ts","./node_modules/next/dist/server/web/spec-extension/image-response.d.ts","./node_modules/next/dist/compiled/@vercel/og/satori/index.d.ts","./node_modules/next/dist/compiled/@vercel/og/emoji/index.d.ts","./node_modules/next/dist/compiled/@vercel/og/types.d.ts","./node_modules/next/server.d.ts","./node_modules/next/types/global.d.ts","./node_modules/next/types/compiled.d.ts","./node_modules/next/index.d.ts","./node_modules/next/image-types/global.d.ts","./next-env.d.ts","./node_modules/source-map-js/source-map.d.ts","./node_modules/postcss/lib/previous-map.d.ts","./node_modules/postcss/lib/input.d.ts","./node_modules/postcss/lib/css-syntax-error.d.ts","./node_modules/postcss/lib/declaration.d.ts","./node_modules/postcss/lib/root.d.ts","./node_modules/postcss/lib/warning.d.ts","./node_modules/postcss/lib/lazy-result.d.ts","./node_modules/postcss/lib/no-work-result.d.ts","./node_modules/postcss/lib/processor.d.ts","./node_modules/postcss/lib/result.d.ts","./node_modules/postcss/lib/document.d.ts","./node_modules/postcss/lib/rule.d.ts","./node_modules/postcss/lib/node.d.ts","./node_modules/postcss/lib/comment.d.ts","./node_modules/postcss/lib/container.d.ts","./node_modules/postcss/lib/at-rule.d.ts","./node_modules/postcss/lib/list.d.ts","./node_modules/postcss/lib/postcss.d.ts","./node_modules/postcss/lib/postcss.d.mts","./node_modules/tailwindcss/types/generated/corepluginlist.d.ts","./node_modules/tailwindcss/types/generated/colors.d.ts","./node_modules/tailwindcss/types/config.d.ts","./node_modules/tailwindcss/types/index.d.ts","./tailwind.config.ts","./src/components/splash.tsx","./node_modules/motion-dom/dist/index.d.ts","./node_modules/motion-utils/dist/index.d.ts","./node_modules/framer-motion/dist/index.d.ts","./node_modules/lucide-react/dist/lucide-react.d.ts","./node_modules/zustand/esm/vanilla.d.mts","./node_modules/zustand/esm/react.d.mts","./node_modules/zustand/esm/index.d.mts","./src/types/index.ts","./src/lib/apiclient.ts","./src/stores/actorstore.ts","./src/stores/debatestore.ts","./src/stores/index.ts","./src/components/actorcard.tsx","./src/components/reviewchatview.tsx","./src/lib/reviewdiff.ts","./src/components/diffsidebar.tsx","./src/components/debateview.tsx","./src/components/actormanager.tsx","./src/components/sessionhistory.tsx","./src/components/settingsview.tsx","./src/components/sessiondetailview.tsx","./src/components/consensusview.tsx","./src/components/arena.tsx","./src/components/index.ts","./node_modules/clsx/clsx.d.mts","./node_modules/tailwind-merge/dist/types.d.ts","./src/lib/utils.ts","./src/app/layout.tsx","./src/app/page.tsx","./.next/types/app/layout.ts","./.next/types/app/page.ts","./node_modules/@types/json5/index.d.ts"],"fileIdsList":[[99,145,358,462],[99,145,358,463],[99,145,406,407],[99,145],[99,142,145],[99,144,145],[145],[99,145,150,178],[99,145,146,151,156,164,175,186],[99,145,146,147,156,164],[94,95,96,99,145],[99,145,148,187],[99,145,149,150,157,165],[99,145,150,175,183],[99,145,151,153,156,164],[99,144,145,152],[99,145,153,154],[99,145,155,156],[99,144,145,156],[99,145,156,157,158,175,186],[99,145,156,157,158,171,175,178],[99,145,153,156,159,164,175,186],[99,145,156,157,159,160,164,175,183,186],[99,145,159,161,175,183,186],[97,98,99,100,101,102,103,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192],[99,145,156,162],[99,145,163,186,191],[99,145,153,156,164,175],[99,145,165],[99,145,166],[99,144,145,167],[99,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192],[99,145,169],[99,145,170],[99,145,156,171,172],[99,145,171,173,187,189],[99,145,156,175,176,178],[99,145,177,178],[99,145,175,176],[99,145,178],[99,145,179],[99,142,145,175,180],[99,145,156,181,182],[99,145,181,182],[99,145,150,164,175,183],[99,145,184],[99,145,164,185],[99,145,159,170,186],[99,145,150,187],[99,145,175,188],[99,145,163,189],[99,145,190],[99,140,145],[99,140,145,156,158,167,175,178,186,189,191],[99,145,175,192],[87,99,145,197,198,199],[87,99,145,197,198],[87,99,145],[87,91,99,145,196,359,402],[87,91,99,145,195,359,402],[84,85,86,99,145],[87,99,145,285,435,436],[92,99,145],[99,145,363],[99,145,365,366,367],[99,145,369],[99,145,202,212,218,220,359],[99,145,202,209,211,214,232],[99,145,212],[99,145,212,337],[99,145,266,284,299,405],[99,145,307],[99,145,202,212,219,252,262,334,335,405],[99,145,219,405],[99,145,212,262,263,264,405],[99,145,212,219,252,405],[99,145,405],[99,145,202,219,220,405],[99,145,292],[99,144,145,193,291],[87,99,145,285,286,287,304,305],[87,99,145,285],[99,145,275],[99,145,274,276,379],[87,99,145,285,286,302],[99,145,281,305,391],[99,145,389,390],[99,145,226,388],[99,145,278],[99,144,145,193,226,274,275,276,277],[87,99,145,302,304,305],[99,145,302,304],[99,145,302,303,305],[99,145,170,193],[99,145,273],[99,144,145,193,211,213,269,270,271,272],[87,99,145,203,382],[87,99,145,186,193],[87,99,145,219,250],[87,99,145,219],[99,145,248,253],[87,99,145,249,362],[87,91,99,145,159,193,195,196,359,400,401],[99,145,359],[99,145,201],[99,145,352,353,354,355,356,357],[99,145,354],[87,99,145,249,285,362],[87,99,145,285,360,362],[87,99,145,285,362],[99,145,159,193,213,362],[99,145,159,193,210,211,222,240,273,278,279,301,302],[99,145,270,273,278,286,288,289,290,292,293,294,295,296,297,298,405],[99,145,271],[87,99,145,170,193,211,212,240,242,244,269,301,305,359,405],[99,145,159,193,213,214,226,227,274],[99,145,159,193,212,214],[99,145,159,175,193,210,213,214],[99,145,159,170,186,193,210,211,212,213,214,219,222,223,233,234,236,239,240,242,243,244,268,269,302,310,312,315,317,320,322,323,324,325],[99,145,159,175,193],[99,145,202,203,204,210,211,359,362,405],[99,145,159,175,186,193,207,336,338,339,405],[99,145,170,186,193,207,210,213,230,234,236,237,238,242,269,315,326,328,334,348,349],[99,145,212,216,269],[99,145,210,212],[99,145,223,316],[99,145,318,319],[99,145,318],[99,145,316],[99,145,318,321],[99,145,206,207],[99,145,206,245],[99,145,206],[99,145,208,223,314],[99,145,313],[99,145,207,208],[99,145,208,311],[99,145,207],[99,145,301],[99,145,159,193,210,222,241,260,266,280,283,300,302],[99,145,254,255,256,257,258,259,281,282,305,360],[99,145,309],[99,145,159,193,210,222,241,246,306,308,310,359,362],[99,145,159,186,193,203,210,212,268],[99,145,265],[99,145,159,193,342,347],[99,145,233,268,362],[99,145,330,334,348,351],[99,145,159,216,334,342,343,351],[99,145,202,212,233,243,345],[99,145,159,193,212,219,243,329,330,340,341,344,346],[99,145,194,240,241,359,362],[99,145,159,170,186,193,208,210,211,213,216,221,222,230,233,234,236,237,238,239,242,244,268,269,312,326,327,362],[99,145,159,193,210,212,216,328,350],[99,145,159,193,211,213],[87,99,145,159,170,193,201,203,210,211,214,222,239,240,242,244,309,359,362],[99,145,159,170,186,193,205,208,209,213],[99,145,206,267],[99,145,159,193,206,211,222],[99,145,159,193,212,223],[99,145,159,193],[99,145,226],[99,145,225],[99,145,227],[99,145,212,224,226,230],[99,145,212,224,226],[99,145,159,193,205,212,213,219,227,228,229],[87,99,145,302,303,304],[99,145,261],[87,99,145,203],[87,99,145,236],[87,99,145,194,239,244,359,362],[99,145,203,382,383],[87,99,145,253],[87,99,145,170,186,193,201,247,249,251,252,362],[99,145,213,219,236],[99,145,235],[87,99,145,157,159,170,193,201,253,262,359,360,361],[83,87,88,89,90,99,145,195,196,359,402],[99,145,150],[99,145,331,332,333],[99,145,331],[99,145,371],[99,145,373],[99,145,375],[99,145,377],[99,145,380],[99,145,384],[91,93,99,145,359,364,368,370,372,374,376,378,381,385,387,393,394,396,403,404,405],[99,145,386],[99,145,392],[99,145,249],[99,145,395],[99,144,145,227,228,229,230,397,398,399,402],[99,145,193],[87,91,99,145,159,161,170,193,195,196,197,199,201,214,351,358,362,402],[99,145,424],[99,145,422,424],[99,145,413,421,422,423,425,427],[99,145,411],[99,145,414,419,424,427],[99,145,410,427],[99,145,414,415,418,419,420,427],[99,145,414,415,416,418,419,427],[99,145,411,412,413,414,415,419,420,421,423,424,425,427],[99,145,427],[99,145,409,411,412,413,414,415,416,418,419,420,421,422,423,424,425,426],[99,145,409,427],[99,145,414,416,417,419,420,427],[99,145,418,427],[99,145,419,420,424,427],[99,145,412,422],[99,145,429,430],[99,145,428,431],[99,112,116,145,186],[99,112,145,175,186],[99,107,145],[99,109,112,145,183,186],[99,145,164,183],[99,107,145,193],[99,109,112,145,164,186],[99,104,105,108,111,145,156,175,186],[99,112,119,145],[99,104,110,145],[99,112,133,134,145],[99,108,112,145,178,186,193],[99,133,145,193],[99,106,107,145,193],[99,112,145],[99,106,107,108,109,110,111,112,113,114,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,134,135,136,137,138,139,145],[99,112,127,145],[99,112,119,120,145],[99,110,112,120,121,145],[99,111,145],[99,104,107,112,145],[99,112,116,120,121,145],[99,116,145],[99,110,112,115,145,186],[99,104,109,112,119,145],[99,145,175],[99,107,112,133,145,191,193],[99,145,439,440],[99,145,439],[99,145,406],[87,99,145,434,457],[99,145,437,438,442],[87,99,145,437,438,442,443,446],[87,99,145,437,438,442,443,446,447,451,452,453,454,455,456],[87,99,145,437,442,448,450],[87,99,145,442,449],[99,145,434,447,448,450,451,452,453,454,455,456,457],[87,99,145,437,442],[87,99,145,437,438,442,443],[87,99,145,437,438,442,446],[87,99,145,437,438,443],[99,145,442],[99,145,459,460],[99,145,441,442,443],[99,145,444,445],[99,145,432]],"fileInfos":[{"version":"c430d44666289dae81f30fa7b2edebf186ecc91a2d4c71266ea6ae76388792e1","affectsGlobalScope":true,"impliedFormat":1},{"version":"45b7ab580deca34ae9729e97c13cfd999df04416a79116c3bfb483804f85ded4","impliedFormat":1},{"version":"3facaf05f0c5fc569c5649dd359892c98a85557e3e0c847964caeb67076f4d75","impliedFormat":1},{"version":"e44bb8bbac7f10ecc786703fe0a6a4b952189f908707980ba8f3c8975a760962","impliedFormat":1},{"version":"5e1c4c362065a6b95ff952c0eab010f04dcd2c3494e813b493ecfd4fcb9fc0d8","impliedFormat":1},{"version":"68d73b4a11549f9c0b7d352d10e91e5dca8faa3322bfb77b661839c42b1ddec7","impliedFormat":1},{"version":"5efce4fc3c29ea84e8928f97adec086e3dc876365e0982cc8479a07954a3efd4","impliedFormat":1},{"version":"feecb1be483ed332fad555aff858affd90a48ab19ba7272ee084704eb7167569","impliedFormat":1},{"version":"ee7bad0c15b58988daa84371e0b89d313b762ab83cb5b31b8a2d1162e8eb41c2","impliedFormat":1},{"version":"27bdc30a0e32783366a5abeda841bc22757c1797de8681bbe81fbc735eeb1c10","impliedFormat":1},{"version":"8fd575e12870e9944c7e1d62e1f5a73fcf23dd8d3a321f2a2c74c20d022283fe","impliedFormat":1},{"version":"2ab096661c711e4a81cc464fa1e6feb929a54f5340b46b0a07ac6bbf857471f0","impliedFormat":1},{"version":"080941d9f9ff9307f7e27a83bcd888b7c8270716c39af943532438932ec1d0b9","affectsGlobalScope":true,"impliedFormat":1},{"version":"2e80ee7a49e8ac312cc11b77f1475804bee36b3b2bc896bead8b6e1266befb43","affectsGlobalScope":true,"impliedFormat":1},{"version":"c57796738e7f83dbc4b8e65132f11a377649c00dd3eee333f672b8f0a6bea671","affectsGlobalScope":true,"impliedFormat":1},{"version":"dc2df20b1bcdc8c2d34af4926e2c3ab15ffe1160a63e58b7e09833f616efff44","affectsGlobalScope":true,"impliedFormat":1},{"version":"515d0b7b9bea2e31ea4ec968e9edd2c39d3eebf4a2d5cbd04e88639819ae3b71","affectsGlobalScope":true,"impliedFormat":1},{"version":"0559b1f683ac7505ae451f9a96ce4c3c92bdc71411651ca6ddb0e88baaaad6a3","affectsGlobalScope":true,"impliedFormat":1},{"version":"0dc1e7ceda9b8b9b455c3a2d67b0412feab00bd2f66656cd8850e8831b08b537","affectsGlobalScope":true,"impliedFormat":1},{"version":"ce691fb9e5c64efb9547083e4a34091bcbe5bdb41027e310ebba8f7d96a98671","affectsGlobalScope":true,"impliedFormat":1},{"version":"8d697a2a929a5fcb38b7a65594020fcef05ec1630804a33748829c5ff53640d0","affectsGlobalScope":true,"impliedFormat":1},{"version":"4ff2a353abf8a80ee399af572debb8faab2d33ad38c4b4474cff7f26e7653b8d","affectsGlobalScope":true,"impliedFormat":1},{"version":"fb0f136d372979348d59b3f5020b4cdb81b5504192b1cacff5d1fbba29378aa1","affectsGlobalScope":true,"impliedFormat":1},{"version":"d15bea3d62cbbdb9797079416b8ac375ae99162a7fba5de2c6c505446486ac0a","affectsGlobalScope":true,"impliedFormat":1},{"version":"68d18b664c9d32a7336a70235958b8997ebc1c3b8505f4f1ae2b7e7753b87618","affectsGlobalScope":true,"impliedFormat":1},{"version":"eb3d66c8327153d8fa7dd03f9c58d351107fe824c79e9b56b462935176cdf12a","affectsGlobalScope":true,"impliedFormat":1},{"version":"38f0219c9e23c915ef9790ab1d680440d95419ad264816fa15009a8851e79119","affectsGlobalScope":true,"impliedFormat":1},{"version":"69ab18c3b76cd9b1be3d188eaf8bba06112ebbe2f47f6c322b5105a6fbc45a2e","affectsGlobalScope":true,"impliedFormat":1},{"version":"a680117f487a4d2f30ea46f1b4b7f58bef1480456e18ba53ee85c2746eeca012","affectsGlobalScope":true,"impliedFormat":1},{"version":"2f11ff796926e0832f9ae148008138ad583bd181899ab7dd768a2666700b1893","affectsGlobalScope":true,"impliedFormat":1},{"version":"4de680d5bb41c17f7f68e0419412ca23c98d5749dcaaea1896172f06435891fc","affectsGlobalScope":true,"impliedFormat":1},{"version":"954296b30da6d508a104a3a0b5d96b76495c709785c1d11610908e63481ee667","affectsGlobalScope":true,"impliedFormat":1},{"version":"ac9538681b19688c8eae65811b329d3744af679e0bdfa5d842d0e32524c73e1c","affectsGlobalScope":true,"impliedFormat":1},{"version":"0a969edff4bd52585473d24995c5ef223f6652d6ef46193309b3921d65dd4376","affectsGlobalScope":true,"impliedFormat":1},{"version":"9e9fbd7030c440b33d021da145d3232984c8bb7916f277e8ffd3dc2e3eae2bdb","affectsGlobalScope":true,"impliedFormat":1},{"version":"811ec78f7fefcabbda4bfa93b3eb67d9ae166ef95f9bff989d964061cbf81a0c","affectsGlobalScope":true,"impliedFormat":1},{"version":"717937616a17072082152a2ef351cb51f98802fb4b2fdabd32399843875974ca","affectsGlobalScope":true,"impliedFormat":1},{"version":"d7e7d9b7b50e5f22c915b525acc5a49a7a6584cf8f62d0569e557c5cfc4b2ac2","affectsGlobalScope":true,"impliedFormat":1},{"version":"71c37f4c9543f31dfced6c7840e068c5a5aacb7b89111a4364b1d5276b852557","affectsGlobalScope":true,"impliedFormat":1},{"version":"576711e016cf4f1804676043e6a0a5414252560eb57de9faceee34d79798c850","affectsGlobalScope":true,"impliedFormat":1},{"version":"89c1b1281ba7b8a96efc676b11b264de7a8374c5ea1e6617f11880a13fc56dc6","affectsGlobalScope":true,"impliedFormat":1},{"version":"74f7fa2d027d5b33eb0471c8e82a6c87216223181ec31247c357a3e8e2fddc5b","affectsGlobalScope":true,"impliedFormat":1},{"version":"d6d7ae4d1f1f3772e2a3cde568ed08991a8ae34a080ff1151af28b7f798e22ca","affectsGlobalScope":true,"impliedFormat":1},{"version":"063600664504610fe3e99b717a1223f8b1900087fab0b4cad1496a114744f8df","affectsGlobalScope":true,"impliedFormat":1},{"version":"934019d7e3c81950f9a8426d093458b65d5aff2c7c1511233c0fd5b941e608ab","affectsGlobalScope":true,"impliedFormat":1},{"version":"52ada8e0b6e0482b728070b7639ee42e83a9b1c22d205992756fe020fd9f4a47","affectsGlobalScope":true,"impliedFormat":1},{"version":"3bdefe1bfd4d6dee0e26f928f93ccc128f1b64d5d501ff4a8cf3c6371200e5e6","affectsGlobalScope":true,"impliedFormat":1},{"version":"59fb2c069260b4ba00b5643b907ef5d5341b167e7d1dbf58dfd895658bda2867","affectsGlobalScope":true,"impliedFormat":1},{"version":"639e512c0dfc3fad96a84caad71b8834d66329a1f28dc95e3946c9b58176c73a","affectsGlobalScope":true,"impliedFormat":1},{"version":"368af93f74c9c932edd84c58883e736c9e3d53cec1fe24c0b0ff451f529ceab1","affectsGlobalScope":true,"impliedFormat":1},{"version":"af3dd424cf267428f30ccfc376f47a2c0114546b55c44d8c0f1d57d841e28d74","affectsGlobalScope":true,"impliedFormat":1},{"version":"995c005ab91a498455ea8dfb63aa9f83fa2ea793c3d8aa344be4a1678d06d399","affectsGlobalScope":true,"impliedFormat":1},{"version":"959d36cddf5e7d572a65045b876f2956c973a586da58e5d26cde519184fd9b8a","affectsGlobalScope":true,"impliedFormat":1},{"version":"965f36eae237dd74e6cca203a43e9ca801ce38824ead814728a2807b1910117d","affectsGlobalScope":true,"impliedFormat":1},{"version":"3925a6c820dcb1a06506c90b1577db1fdbf7705d65b62b99dce4be75c637e26b","affectsGlobalScope":true,"impliedFormat":1},{"version":"0a3d63ef2b853447ec4f749d3f368ce642264246e02911fcb1590d8c161b8005","affectsGlobalScope":true,"impliedFormat":1},{"version":"8cdf8847677ac7d20486e54dd3fcf09eda95812ac8ace44b4418da1bbbab6eb8","affectsGlobalScope":true,"impliedFormat":1},{"version":"8444af78980e3b20b49324f4a16ba35024fef3ee069a0eb67616ea6ca821c47a","affectsGlobalScope":true,"impliedFormat":1},{"version":"3287d9d085fbd618c3971944b65b4be57859f5415f495b33a6adc994edd2f004","affectsGlobalScope":true,"impliedFormat":1},{"version":"b4b67b1a91182421f5df999988c690f14d813b9850b40acd06ed44691f6727ad","affectsGlobalScope":true,"impliedFormat":1},{"version":"df83c2a6c73228b625b0beb6669c7ee2a09c914637e2d35170723ad49c0f5cd4","affectsGlobalScope":true,"impliedFormat":1},{"version":"436aaf437562f276ec2ddbee2f2cdedac7664c1e4c1d2c36839ddd582eeb3d0a","affectsGlobalScope":true,"impliedFormat":1},{"version":"8e3c06ea092138bf9fa5e874a1fdbc9d54805d074bee1de31b99a11e2fec239d","affectsGlobalScope":true,"impliedFormat":1},{"version":"87dc0f382502f5bbce5129bdc0aea21e19a3abbc19259e0b43ae038a9fc4e326","affectsGlobalScope":true,"impliedFormat":1},{"version":"b1cb28af0c891c8c96b2d6b7be76bd394fddcfdb4709a20ba05a7c1605eea0f9","affectsGlobalScope":true,"impliedFormat":1},{"version":"2fef54945a13095fdb9b84f705f2b5994597640c46afeb2ce78352fab4cb3279","affectsGlobalScope":true,"impliedFormat":1},{"version":"ac77cb3e8c6d3565793eb90a8373ee8033146315a3dbead3bde8db5eaf5e5ec6","affectsGlobalScope":true,"impliedFormat":1},{"version":"56e4ed5aab5f5920980066a9409bfaf53e6d21d3f8d020c17e4de584d29600ad","affectsGlobalScope":true,"impliedFormat":1},{"version":"4ece9f17b3866cc077099c73f4983bddbcb1dc7ddb943227f1ec070f529dedd1","affectsGlobalScope":true,"impliedFormat":1},{"version":"0a6282c8827e4b9a95f4bf4f5c205673ada31b982f50572d27103df8ceb8013c","affectsGlobalScope":true,"impliedFormat":1},{"version":"1c9319a09485199c1f7b0498f2988d6d2249793ef67edda49d1e584746be9032","affectsGlobalScope":true,"impliedFormat":1},{"version":"e3a2a0cee0f03ffdde24d89660eba2685bfbdeae955a6c67e8c4c9fd28928eeb","affectsGlobalScope":true,"impliedFormat":1},{"version":"811c71eee4aa0ac5f7adf713323a5c41b0cf6c4e17367a34fbce379e12bbf0a4","affectsGlobalScope":true,"impliedFormat":1},{"version":"51ad4c928303041605b4d7ae32e0c1ee387d43a24cd6f1ebf4a2699e1076d4fa","affectsGlobalScope":true,"impliedFormat":1},{"version":"60037901da1a425516449b9a20073aa03386cce92f7a1fd902d7602be3a7c2e9","affectsGlobalScope":true,"impliedFormat":1},{"version":"d4b1d2c51d058fc21ec2629fff7a76249dec2e36e12960ea056e3ef89174080f","affectsGlobalScope":true,"impliedFormat":1},{"version":"22adec94ef7047a6c9d1af3cb96be87a335908bf9ef386ae9fd50eeb37f44c47","affectsGlobalScope":true,"impliedFormat":1},{"version":"196cb558a13d4533a5163286f30b0509ce0210e4b316c56c38d4c0fd2fb38405","affectsGlobalScope":true,"impliedFormat":1},{"version":"73f78680d4c08509933daf80947902f6ff41b6230f94dd002ae372620adb0f60","affectsGlobalScope":true,"impliedFormat":1},{"version":"c5239f5c01bcfa9cd32f37c496cf19c61d69d37e48be9de612b541aac915805b","affectsGlobalScope":true,"impliedFormat":1},{"version":"8e7f8264d0fb4c5339605a15daadb037bf238c10b654bb3eee14208f860a32ea","affectsGlobalScope":true,"impliedFormat":1},{"version":"782dec38049b92d4e85c1585fbea5474a219c6984a35b004963b00beb1aab538","affectsGlobalScope":true,"impliedFormat":1},{"version":"0990a7576222f248f0a3b888adcb7389f957928ce2afb1cd5128169086ff4d29","impliedFormat":1},{"version":"eb5b19b86227ace1d29ea4cf81387279d04bb34051e944bc53df69f58914b788","affectsGlobalScope":true,"impliedFormat":1},{"version":"ac51dd7d31333793807a6abaa5ae168512b6131bd41d9c5b98477fc3b7800f9f","impliedFormat":1},{"version":"87d9d29dbc745f182683f63187bf3d53fd8673e5fca38ad5eaab69798ed29fbc","impliedFormat":1},{"version":"035312d4945d13efa134ae482f6dc56a1a9346f7ac3be7ccbad5741058ce87f3","affectsGlobalScope":true,"impliedFormat":1},{"version":"cc69795d9954ee4ad57545b10c7bf1a7260d990231b1685c147ea71a6faa265c","impliedFormat":1},{"version":"8bc6c94ff4f2af1f4023b7bb2379b08d3d7dd80c698c9f0b07431ea16101f05f","impliedFormat":1},{"version":"1b61d259de5350f8b1e5db06290d31eaebebc6baafd5f79d314b5af9256d7153","impliedFormat":1},{"version":"57194e1f007f3f2cbef26fa299d4c6b21f4623a2eddc63dfeef79e38e187a36e","impliedFormat":1},{"version":"0f6666b58e9276ac3a38fdc80993d19208442d6027ab885580d93aec76b4ef00","impliedFormat":1},{"version":"05fd364b8ef02fb1e174fbac8b825bdb1e5a36a016997c8e421f5fab0a6da0a0","impliedFormat":1},{"version":"70521b6ab0dcba37539e5303104f29b721bfb2940b2776da4cc818c07e1fefc1","affectsGlobalScope":true,"impliedFormat":1},{"version":"ab41ef1f2cdafb8df48be20cd969d875602483859dc194e9c97c8a576892c052","affectsGlobalScope":true,"impliedFormat":1},{"version":"d153a11543fd884b596587ccd97aebbeed950b26933ee000f94009f1ab142848","affectsGlobalScope":true,"impliedFormat":1},{"version":"21d819c173c0cf7cc3ce57c3276e77fd9a8a01d35a06ad87158781515c9a438a","impliedFormat":1},{"version":"98cffbf06d6bab333473c70a893770dbe990783904002c4f1a960447b4b53dca","affectsGlobalScope":true,"impliedFormat":1},{"version":"ba481bca06f37d3f2c137ce343c7d5937029b2468f8e26111f3c9d9963d6568d","affectsGlobalScope":true,"impliedFormat":1},{"version":"6d9ef24f9a22a88e3e9b3b3d8c40ab1ddb0853f1bfbd5c843c37800138437b61","affectsGlobalScope":true,"impliedFormat":1},{"version":"1db0b7dca579049ca4193d034d835f6bfe73096c73663e5ef9a0b5779939f3d0","affectsGlobalScope":true,"impliedFormat":1},{"version":"9798340ffb0d067d69b1ae5b32faa17ab31b82466a3fc00d8f2f2df0c8554aaa","affectsGlobalScope":true,"impliedFormat":1},{"version":"f26b11d8d8e4b8028f1c7d618b22274c892e4b0ef5b3678a8ccbad85419aef43","affectsGlobalScope":true,"impliedFormat":1},{"version":"5929864ce17fba74232584d90cb721a89b7ad277220627cc97054ba15a98ea8f","impliedFormat":1},{"version":"763fe0f42b3d79b440a9b6e51e9ba3f3f91352469c1e4b3b67bfa4ff6352f3f4","impliedFormat":1},{"version":"25c8056edf4314820382a5fdb4bb7816999acdcb929c8f75e3f39473b87e85bc","impliedFormat":1},{"version":"c464d66b20788266e5353b48dc4aa6bc0dc4a707276df1e7152ab0c9ae21fad8","impliedFormat":1},{"version":"78d0d27c130d35c60b5e5566c9f1e5be77caf39804636bc1a40133919a949f21","impliedFormat":1},{"version":"c6fd2c5a395f2432786c9cb8deb870b9b0e8ff7e22c029954fabdd692bff6195","impliedFormat":1},{"version":"1d6e127068ea8e104a912e42fc0a110e2aa5a66a356a917a163e8cf9a65e4a75","impliedFormat":1},{"version":"5ded6427296cdf3b9542de4471d2aa8d3983671d4cac0f4bf9c637208d1ced43","impliedFormat":1},{"version":"7f182617db458e98fc18dfb272d40aa2fff3a353c44a89b2c0ccb3937709bfb5","impliedFormat":1},{"version":"cadc8aced301244057c4e7e73fbcae534b0f5b12a37b150d80e5a45aa4bebcbd","impliedFormat":1},{"version":"385aab901643aa54e1c36f5ef3107913b10d1b5bb8cbcd933d4263b80a0d7f20","impliedFormat":1},{"version":"9670d44354bab9d9982eca21945686b5c24a3f893db73c0dae0fd74217a4c219","impliedFormat":1},{"version":"0b8a9268adaf4da35e7fa830c8981cfa22adbbe5b3f6f5ab91f6658899e657a7","impliedFormat":1},{"version":"11396ed8a44c02ab9798b7dca436009f866e8dae3c9c25e8c1fbc396880bf1bb","impliedFormat":1},{"version":"ba7bc87d01492633cb5a0e5da8a4a42a1c86270e7b3d2dea5d156828a84e4882","impliedFormat":1},{"version":"4893a895ea92c85345017a04ed427cbd6a1710453338df26881a6019432febdd","impliedFormat":1},{"version":"c21dc52e277bcfc75fac0436ccb75c204f9e1b3fa5e12729670910639f27343e","impliedFormat":1},{"version":"13f6f39e12b1518c6650bbb220c8985999020fe0f21d818e28f512b7771d00f9","impliedFormat":1},{"version":"9b5369969f6e7175740bf51223112ff209f94ba43ecd3bb09eefff9fd675624a","impliedFormat":1},{"version":"4fe9e626e7164748e8769bbf74b538e09607f07ed17c2f20af8d680ee49fc1da","impliedFormat":1},{"version":"24515859bc0b836719105bb6cc3d68255042a9f02a6022b3187948b204946bd2","impliedFormat":1},{"version":"ea0148f897b45a76544ae179784c95af1bd6721b8610af9ffa467a518a086a43","impliedFormat":1},{"version":"24c6a117721e606c9984335f71711877293a9651e44f59f3d21c1ea0856f9cc9","impliedFormat":1},{"version":"dd3273ead9fbde62a72949c97dbec2247ea08e0c6952e701a483d74ef92d6a17","impliedFormat":1},{"version":"405822be75ad3e4d162e07439bac80c6bcc6dbae1929e179cf467ec0b9ee4e2e","impliedFormat":1},{"version":"0db18c6e78ea846316c012478888f33c11ffadab9efd1cc8bcc12daded7a60b6","impliedFormat":1},{"version":"e61be3f894b41b7baa1fbd6a66893f2579bfad01d208b4ff61daef21493ef0a8","impliedFormat":1},{"version":"bd0532fd6556073727d28da0edfd1736417a3f9f394877b6d5ef6ad88fba1d1a","impliedFormat":1},{"version":"89167d696a849fce5ca508032aabfe901c0868f833a8625d5a9c6e861ef935d2","impliedFormat":1},{"version":"615ba88d0128ed16bf83ef8ccbb6aff05c3ee2db1cc0f89ab50a4939bfc1943f","impliedFormat":1},{"version":"a4d551dbf8746780194d550c88f26cf937caf8d56f102969a110cfaed4b06656","impliedFormat":1},{"version":"8bd86b8e8f6a6aa6c49b71e14c4ffe1211a0e97c80f08d2c8cc98838006e4b88","impliedFormat":1},{"version":"317e63deeb21ac07f3992f5b50cdca8338f10acd4fbb7257ebf56735bf52ab00","impliedFormat":1},{"version":"4732aec92b20fb28c5fe9ad99521fb59974289ed1e45aecb282616202184064f","impliedFormat":1},{"version":"2e85db9e6fd73cfa3d7f28e0ab6b55417ea18931423bd47b409a96e4a169e8e6","impliedFormat":1},{"version":"c46e079fe54c76f95c67fb89081b3e399da2c7d109e7dca8e4b58d83e332e605","impliedFormat":1},{"version":"bf67d53d168abc1298888693338cb82854bdb2e69ef83f8a0092093c2d562107","impliedFormat":1},{"version":"b52476feb4a0cbcb25e5931b930fc73cb6643fb1a5060bf8a3dda0eeae5b4b68","affectsGlobalScope":true,"impliedFormat":1},{"version":"e2677634fe27e87348825bb041651e22d50a613e2fdf6a4a3ade971d71bac37e","impliedFormat":1},{"version":"7394959e5a741b185456e1ef5d64599c36c60a323207450991e7a42e08911419","impliedFormat":1},{"version":"8c0bcd6c6b67b4b503c11e91a1fb91522ed585900eab2ab1f61bba7d7caa9d6f","impliedFormat":1},{"version":"8cd19276b6590b3ebbeeb030ac271871b9ed0afc3074ac88a94ed2449174b776","affectsGlobalScope":true,"impliedFormat":1},{"version":"696eb8d28f5949b87d894b26dc97318ef944c794a9a4e4f62360cd1d1958014b","impliedFormat":1},{"version":"3f8fa3061bd7402970b399300880d55257953ee6d3cd408722cb9ac20126460c","impliedFormat":1},{"version":"35ec8b6760fd7138bbf5809b84551e31028fb2ba7b6dc91d95d098bf212ca8b4","affectsGlobalScope":true,"impliedFormat":1},{"version":"5524481e56c48ff486f42926778c0a3cce1cc85dc46683b92b1271865bcf015a","impliedFormat":1},{"version":"68bd56c92c2bd7d2339457eb84d63e7de3bd56a69b25f3576e1568d21a162398","affectsGlobalScope":true,"impliedFormat":1},{"version":"3e93b123f7c2944969d291b35fed2af79a6e9e27fdd5faa99748a51c07c02d28","impliedFormat":1},{"version":"9d19808c8c291a9010a6c788e8532a2da70f811adb431c97520803e0ec649991","impliedFormat":1},{"version":"87aad3dd9752067dc875cfaa466fc44246451c0c560b820796bdd528e29bef40","impliedFormat":1},{"version":"4aacb0dd020eeaef65426153686cc639a78ec2885dc72ad220be1d25f1a439df","impliedFormat":1},{"version":"f0bd7e6d931657b59605c44112eaf8b980ba7f957a5051ed21cb93d978cf2f45","impliedFormat":1},{"version":"8db0ae9cb14d9955b14c214f34dae1b9ef2baee2fe4ce794a4cd3ac2531e3255","affectsGlobalScope":true,"impliedFormat":1},{"version":"15fc6f7512c86810273af28f224251a5a879e4261b4d4c7e532abfbfc3983134","impliedFormat":1},{"version":"58adba1a8ab2d10b54dc1dced4e41f4e7c9772cbbac40939c0dc8ce2cdb1d442","impliedFormat":1},{"version":"641942a78f9063caa5d6b777c99304b7d1dc7328076038c6d94d8a0b81fc95c1","impliedFormat":1},{"version":"714435130b9015fae551788df2a88038471a5a11eb471f27c4ede86552842bc9","impliedFormat":1},{"version":"855cd5f7eb396f5f1ab1bc0f8580339bff77b68a770f84c6b254e319bbfd1ac7","impliedFormat":1},{"version":"5650cf3dace09e7c25d384e3e6b818b938f68f4e8de96f52d9c5a1b3db068e86","impliedFormat":1},{"version":"1354ca5c38bd3fd3836a68e0f7c9f91f172582ba30ab15bb8c075891b91502b7","affectsGlobalScope":true,"impliedFormat":1},{"version":"27fdb0da0daf3b337c5530c5f266efe046a6ceb606e395b346974e4360c36419","impliedFormat":1},{"version":"2d2fcaab481b31a5882065c7951255703ddbe1c0e507af56ea42d79ac3911201","impliedFormat":1},{"version":"a192fe8ec33f75edbc8d8f3ed79f768dfae11ff5735e7fe52bfa69956e46d78d","impliedFormat":1},{"version":"ca867399f7db82df981d6915bcbb2d81131d7d1ef683bc782b59f71dda59bc85","affectsGlobalScope":true,"impliedFormat":1},{"version":"372413016d17d804e1d139418aca0c68e47a83fb6669490857f4b318de8cccb3","affectsGlobalScope":true,"impliedFormat":1},{"version":"9e043a1bc8fbf2a255bccf9bf27e0f1caf916c3b0518ea34aa72357c0afd42ec","impliedFormat":1},{"version":"b4f70ec656a11d570e1a9edce07d118cd58d9760239e2ece99306ee9dfe61d02","impliedFormat":1},{"version":"3bc2f1e2c95c04048212c569ed38e338873f6a8593930cf5a7ef24ffb38fc3b6","impliedFormat":1},{"version":"6e70e9570e98aae2b825b533aa6292b6abd542e8d9f6e9475e88e1d7ba17c866","impliedFormat":1},{"version":"f9d9d753d430ed050dc1bf2667a1bab711ccbb1c1507183d794cc195a5b085cc","impliedFormat":1},{"version":"9eece5e586312581ccd106d4853e861aaaa1a39f8e3ea672b8c3847eedd12f6e","impliedFormat":1},{"version":"47ab634529c5955b6ad793474ae188fce3e6163e3a3fb5edd7e0e48f14435333","impliedFormat":1},{"version":"37ba7b45141a45ce6e80e66f2a96c8a5ab1bcef0fc2d0f56bb58df96ec67e972","impliedFormat":1},{"version":"45650f47bfb376c8a8ed39d4bcda5902ab899a3150029684ee4c10676d9fbaee","impliedFormat":1},{"version":"fad4e3c207fe23922d0b2d06b01acbfb9714c4f2685cf80fd384c8a100c82fd0","affectsGlobalScope":true,"impliedFormat":1},{"version":"74cf591a0f63db318651e0e04cb55f8791385f86e987a67fd4d2eaab8191f730","impliedFormat":1},{"version":"5eab9b3dc9b34f185417342436ec3f106898da5f4801992d8ff38ab3aff346b5","impliedFormat":1},{"version":"12ed4559eba17cd977aa0db658d25c4047067444b51acfdcbf38470630642b23","affectsGlobalScope":true,"impliedFormat":1},{"version":"f3ffabc95802521e1e4bcba4c88d8615176dc6e09111d920c7a213bdda6e1d65","impliedFormat":1},{"version":"809821b8a065e3234a55b3a9d7846231ed18d66dd749f2494c66288d890daf7f","impliedFormat":1},{"version":"ae56f65caf3be91108707bd8dfbccc2a57a91feb5daabf7165a06a945545ed26","impliedFormat":1},{"version":"a136d5de521da20f31631a0a96bf712370779d1c05b7015d7019a9b2a0446ca9","impliedFormat":1},{"version":"c3b41e74b9a84b88b1dca61ec39eee25c0dbc8e7d519ba11bb070918cfacf656","affectsGlobalScope":true,"impliedFormat":1},{"version":"4737a9dc24d0e68b734e6cfbcea0c15a2cfafeb493485e27905f7856988c6b29","affectsGlobalScope":true,"impliedFormat":1},{"version":"36d8d3e7506b631c9582c251a2c0b8a28855af3f76719b12b534c6edf952748d","impliedFormat":1},{"version":"1ca69210cc42729e7ca97d3a9ad48f2e9cb0042bada4075b588ae5387debd318","impliedFormat":1},{"version":"f5ebe66baaf7c552cfa59d75f2bfba679f329204847db3cec385acda245e574e","impliedFormat":1},{"version":"ed59add13139f84da271cafd32e2171876b0a0af2f798d0c663e8eeb867732cf","affectsGlobalScope":true,"impliedFormat":1},{"version":"b7c5e2ea4a9749097c347454805e933844ed207b6eefec6b7cfd418b5f5f7b28","impliedFormat":1},{"version":"b1810689b76fd473bd12cc9ee219f8e62f54a7d08019a235d07424afbf074d25","impliedFormat":1},{"version":"8caa5c86be1b793cd5f599e27ecb34252c41e011980f7d61ae4989a149ff6ccc","impliedFormat":1},{"version":"f9fd93190acb1ffe0bc0fb395df979452f8d625071e9ffc8636e4dfb86ab2508","impliedFormat":1},{"version":"5f41fd8732a89e940c58ce22206e3df85745feb8983e2b4c6257fb8cbb118493","impliedFormat":1},{"version":"17ed71200119e86ccef2d96b73b02ce8854b76ad6bd21b5021d4269bec527b5f","impliedFormat":1},{"version":"1cfa8647d7d71cb03847d616bd79320abfc01ddea082a49569fda71ac5ece66b","impliedFormat":1},{"version":"bb7a61dd55dc4b9422d13da3a6bb9cc5e89be888ef23bbcf6558aa9726b89a1c","impliedFormat":1},{"version":"db6d2d9daad8a6d83f281af12ce4355a20b9a3e71b82b9f57cddcca0a8964a96","impliedFormat":1},{"version":"cfe4ef4710c3786b6e23dae7c086c70b4f4835a2e4d77b75d39f9046106e83d3","impliedFormat":1},{"version":"cbea99888785d49bb630dcbb1613c73727f2b5a2cf02e1abcaab7bcf8d6bf3c5","impliedFormat":1},{"version":"98817124fd6c4f60e0b935978c207309459fb71ab112cf514f26f333bf30830e","impliedFormat":1},{"version":"a86f82d646a739041d6702101afa82dcb935c416dd93cbca7fd754fd0282ce1f","impliedFormat":1},{"version":"2dad084c67e649f0f354739ec7df7c7df0779a28a4f55c97c6b6883ae850d1ce","impliedFormat":1},{"version":"fa5bbc7ab4130dd8cdc55ea294ec39f76f2bc507a0f75f4f873e38631a836ca7","impliedFormat":1},{"version":"df45ca1176e6ac211eae7ddf51336dc075c5314bc5c253651bae639defd5eec5","impliedFormat":1},{"version":"cf86de1054b843e484a3c9300d62fbc8c97e77f168bbffb131d560ca0474d4a8","impliedFormat":1},{"version":"196c960b12253fde69b204aa4fbf69470b26daf7a430855d7f94107a16495ab0","impliedFormat":1},{"version":"528637e771ee2e808390d46a591eaef375fa4b9c99b03749e22b1d2e868b1b7c","impliedFormat":1},{"version":"bf24f6d35f7318e246010ffe9924395893c4e96d34324cde77151a73f078b9ad","impliedFormat":1},{"version":"596ccf4070268c4f5a8c459d762d8a934fa9b9317c7bf7a953e921bc9d78ce3c","impliedFormat":1},{"version":"10595c7ff5094dd5b6a959ccb1c00e6a06441b4e10a87bc09c15f23755d34439","impliedFormat":1},{"version":"9620c1ff645afb4a9ab4044c85c26676f0a93e8c0e4b593aea03a89ccb47b6d0","impliedFormat":1},{"version":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","impliedFormat":1},{"version":"a9af0e608929aaf9ce96bd7a7b99c9360636c31d73670e4af09a09950df97841","impliedFormat":1},{"version":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","impliedFormat":1},{"version":"c86fe861cf1b4c46a0fb7d74dffe596cf679a2e5e8b1456881313170f092e3fa","impliedFormat":1},{"version":"08ed0b3f0166787f84a6606f80aa3b1388c7518d78912571b203817406e471da","impliedFormat":1},{"version":"47e5af2a841356a961f815e7c55d72554db0c11b4cba4d0caab91f8717846a94","impliedFormat":1},{"version":"9a1a0dc84fecc111e83281743f003e1ae9048e0f83c2ae2028d17bc58fd93cc7","impliedFormat":1},{"version":"f5f541902bf7ae0512a177295de9b6bcd6809ea38307a2c0a18bfca72212f368","impliedFormat":1},{"version":"e8da637cbd6ed1cf6c36e9424f6bcee4515ca2c677534d4006cbd9a05f930f0c","impliedFormat":1},{"version":"ca1b882a105a1972f82cc58e3be491e7d750a1eb074ffd13b198269f57ed9e1b","impliedFormat":1},{"version":"fc3e1c87b39e5ba1142f27ec089d1966da168c04a859a4f6aab64dceae162c2b","impliedFormat":1},{"version":"3867ca0e9757cc41e04248574f4f07b8f9e3c0c2a796a5eb091c65bfd2fc8bdb","impliedFormat":1},{"version":"61888522cec948102eba94d831c873200aa97d00d8989fdfd2a3e0ee75ec65a2","impliedFormat":1},{"version":"4e10622f89fea7b05dd9b52fb65e1e2b5cbd96d4cca3d9e1a60bb7f8a9cb86a1","impliedFormat":1},{"version":"74b2a5e5197bd0f2e0077a1ea7c07455bbea67b87b0869d9786d55104006784f","impliedFormat":1},{"version":"59bf32919de37809e101acffc120596a9e45fdbab1a99de5087f31fdc36e2f11","impliedFormat":1},{"version":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","impliedFormat":1},{"version":"3df3abb3e7c1a74ab419f95500a998b55dd9bc985e295de96ff315dd94c7446f","impliedFormat":1},{"version":"c40c848daad198266370c1c72a7a8c3d18d2f50727c7859fcfefd3ff69a7f288","impliedFormat":1},{"version":"ac60bbee0d4235643cc52b57768b22de8c257c12bd8c2039860540cab1fa1d82","impliedFormat":1},{"version":"973b59a17aaa817eb205baf6c132b83475a5c0a44e8294a472af7793b1817e89","impliedFormat":1},{"version":"ada39cbb2748ab2873b7835c90c8d4620723aedf323550e8489f08220e477c7f","impliedFormat":1},{"version":"6e5f5cee603d67ee1ba6120815497909b73399842254fc1e77a0d5cdc51d8c9c","impliedFormat":1},{"version":"8dba67056cbb27628e9b9a1cba8e57036d359dceded0725c72a3abe4b6c79cd4","impliedFormat":1},{"version":"70f3814c457f54a7efe2d9ce9d2686de9250bb42eb7f4c539bd2280a42e52d33","impliedFormat":1},{"version":"5cbd32af037805215112472e35773bad9d4e03f0e72b1129a0d0c12d9cd63cc7","impliedFormat":1},{"version":"ef61792acbfa8c27c9bd113f02731e66229f7d3a169e3c1993b508134f1a58e0","impliedFormat":1},{"version":"afcb759e8e3ad6549d5798820697002bc07bdd039899fad0bf522e7e8a9f5866","impliedFormat":1},{"version":"f6404e7837b96da3ea4d38c4f1a3812c96c9dcdf264e93d5bdb199f983a3ef4b","impliedFormat":1},{"version":"c5426dbfc1cf90532f66965a7aa8c1136a78d4d0f96d8180ecbfc11d7722f1a5","impliedFormat":1},{"version":"65a15fc47900787c0bd18b603afb98d33ede930bed1798fc984d5ebb78b26cf9","impliedFormat":1},{"version":"9d202701f6e0744adb6314d03d2eb8fc994798fc83d91b691b75b07626a69801","impliedFormat":1},{"version":"de9d2df7663e64e3a91bf495f315a7577e23ba088f2949d5ce9ec96f44fba37d","impliedFormat":1},{"version":"c7af78a2ea7cb1cd009cfb5bdb48cd0b03dad3b54f6da7aab615c2e9e9d570c5","impliedFormat":1},{"version":"1ee45496b5f8bdee6f7abc233355898e5bf9bd51255db65f5ff7ede617ca0027","impliedFormat":1},{"version":"566e5fb812082f8cf929c6727d40924843246cf19ee4e8b9437a6315c4792b03","affectsGlobalScope":true,"impliedFormat":1},{"version":"db01d18853469bcb5601b9fc9826931cc84cc1a1944b33cad76fd6f1e3d8c544","affectsGlobalScope":true,"impliedFormat":1},{"version":"dba114fb6a32b355a9cfc26ca2276834d72fe0e94cd2c3494005547025015369","impliedFormat":1},{"version":"903e299a28282fa7b714586e28409ed73c3b63f5365519776bf78e8cf173db36","affectsGlobalScope":true,"impliedFormat":1},{"version":"fa6c12a7c0f6b84d512f200690bfc74819e99efae69e4c95c4cd30f6884c526e","impliedFormat":1},{"version":"f1c32f9ce9c497da4dc215c3bc84b722ea02497d35f9134db3bb40a8d918b92b","impliedFormat":1},{"version":"b73c319af2cc3ef8f6421308a250f328836531ea3761823b4cabbd133047aefa","affectsGlobalScope":true,"impliedFormat":1},{"version":"e433b0337b8106909e7953015e8fa3f2d30797cea27141d1c5b135365bb975a6","impliedFormat":1},{"version":"dd3900b24a6a8745efeb7ad27629c0f8a626470ac229c1d73f1fe29d67e44dca","impliedFormat":1},{"version":"ddff7fc6edbdc5163a09e22bf8df7bef75f75369ebd7ecea95ba55c4386e2441","impliedFormat":1},{"version":"106c6025f1d99fd468fd8bf6e5bda724e11e5905a4076c5d29790b6c3745e50c","impliedFormat":1},{"version":"ec29be0737d39268696edcec4f5e97ce26f449fa9b7afc2f0f99a86def34a418","impliedFormat":1},{"version":"68a06fb972b2c7e671bf090dc5a5328d22ba07d771376c3d9acd9e7ed786a9db","impliedFormat":1},{"version":"ec6cba1c02c675e4dd173251b156792e8d3b0c816af6d6ad93f1a55d674591aa","impliedFormat":1},{"version":"b620391fe8060cf9bedc176a4d01366e6574d7a71e0ac0ab344a4e76576fcbb8","impliedFormat":1},{"version":"d729408dfde75b451530bcae944cf89ee8277e2a9df04d1f62f2abfd8b03c1e1","impliedFormat":1},{"version":"e15d3c84d5077bb4a3adee4c791022967b764dc41cb8fa3cfa44d4379b2c95f5","impliedFormat":1},{"version":"78244a2a8ab1080e0dd8fc3633c204c9a4be61611d19912f4b157f7ef7367049","impliedFormat":1},{"version":"e1fc1a1045db5aa09366be2b330e4ce391550041fc3e925f60998ca0b647aa97","impliedFormat":1},{"version":"d3f5861c48322adc023d3277e592635402ac008c5beae2e447b335fbf0da56c2","impliedFormat":1},{"version":"43ba4f2fa8c698f5c304d21a3ef596741e8e85a810b7c1f9b692653791d8d97a","impliedFormat":1},{"version":"31fb49ef3aa3d76f0beb644984e01eab0ea222372ea9b49bb6533be5722d756c","impliedFormat":1},{"version":"33cd131e1461157e3e06b06916b5176e7a8ec3fce15a5cfe145e56de744e07d2","impliedFormat":1},{"version":"889ef863f90f4917221703781d9723278db4122d75596b01c429f7c363562b86","impliedFormat":1},{"version":"3556cfbab7b43da96d15a442ddbb970e1f2fc97876d055b6555d86d7ac57dae5","impliedFormat":1},{"version":"437751e0352c6e924ddf30e90849f1d9eb00ca78c94d58d6a37202ec84eb8393","impliedFormat":1},{"version":"48e8af7fdb2677a44522fd185d8c87deff4d36ee701ea003c6c780b1407a1397","impliedFormat":1},{"version":"d11308de5a36c7015bb73adb5ad1c1bdaac2baede4cc831a05cf85efa3cc7f2f","impliedFormat":1},{"version":"8c9f19c480c747b6d8067c53fcc3cef641619029afb0a903672daed3f5acaed2","impliedFormat":1},{"version":"f9812cfc220ecf7557183379531fa409acd249b9e5b9a145d0d52b76c20862de","affectsGlobalScope":true,"impliedFormat":1},{"version":"7b068371563d0396a065ed64b049cffeb4eed89ad433ae7730fc31fb1e00ebf3","impliedFormat":1},{"version":"2e4f37ffe8862b14d8e24ae8763daaa8340c0df0b859d9a9733def0eee7562d9","impliedFormat":1},{"version":"13283350547389802aa35d9f2188effaeac805499169a06ef5cd77ce2a0bd63f","impliedFormat":1},{"version":"680793958f6a70a44c8d9ae7d46b7a385361c69ac29dcab3ed761edce1c14ab8","impliedFormat":1},{"version":"6ac6715916fa75a1f7ebdfeacac09513b4d904b667d827b7535e84ff59679aff","impliedFormat":1},{"version":"42c169fb8c2d42f4f668c624a9a11e719d5d07dacbebb63cbcf7ef365b0a75b3","impliedFormat":1},{"version":"913ddbba170240070bd5921b8f33ea780021bdf42fbdfcd4fcb2691b1884ddde","impliedFormat":1},{"version":"74c105214ddd747037d2a75da6588ec8aa1882f914e1f8a312c528f86feca2b9","impliedFormat":1},{"version":"5fe23bd829e6be57d41929ac374ee9551ccc3c44cee893167b7b5b77be708014","impliedFormat":1},{"version":"4d85f80132e24d9a5b5c5e0734e4ecd6878d8c657cc990ecc70845ef384ca96f","impliedFormat":1},{"version":"438c7513b1df91dcef49b13cd7a1c4720f91a36e88c1df731661608b7c055f10","impliedFormat":1},{"version":"cf185cc4a9a6d397f416dd28cca95c227b29f0f27b160060a95c0e5e36cda865","impliedFormat":1},{"version":"0086f3e4ad898fd7ca56bb223098acfacf3fa065595182aaf0f6c4a6a95e6fbd","impliedFormat":1},{"version":"efaa078e392f9abda3ee8ade3f3762ab77f9c50b184e6883063a911742a4c96a","impliedFormat":1},{"version":"54a8bb487e1dc04591a280e7a673cdfb272c83f61e28d8a64cf1ac2e63c35c51","impliedFormat":1},{"version":"021a9498000497497fd693dd315325484c58a71b5929e2bbb91f419b04b24cea","impliedFormat":1},{"version":"9385cdc09850950bc9b59cca445a3ceb6fcca32b54e7b626e746912e489e535e","impliedFormat":1},{"version":"2894c56cad581928bb37607810af011764a2f511f575d28c9f4af0f2ef02d1ab","impliedFormat":1},{"version":"0a72186f94215d020cb386f7dca81d7495ab6c17066eb07d0f44a5bf33c1b21a","impliedFormat":1},{"version":"84124384abae2f6f66b7fbfc03862d0c2c0b71b826f7dbf42c8085d31f1d3f95","impliedFormat":1},{"version":"63a8e96f65a22604eae82737e409d1536e69a467bb738bec505f4f97cce9d878","impliedFormat":1},{"version":"3fd78152a7031315478f159c6a5872c712ece6f01212c78ea82aef21cb0726e2","impliedFormat":1},{"version":"3a6ed8e1d630cfa1f7edf0dc46a6e20ca6c714dbe754409699008571dfe473a6","impliedFormat":1},{"version":"512fc15cca3a35b8dbbf6e23fe9d07e6f87ad03c895acffd3087ce09f352aad0","impliedFormat":1},{"version":"9a0946d15a005832e432ea0cd4da71b57797efb25b755cc07f32274296d62355","impliedFormat":1},{"version":"a52ff6c0a149e9f370372fc3c715d7f2beee1f3bab7980e271a7ab7d313ec677","impliedFormat":1},{"version":"fd933f824347f9edd919618a76cdb6a0c0085c538115d9a287fa0c7f59957ab3","impliedFormat":1},{"version":"6ac6715916fa75a1f7ebdfeacac09513b4d904b667d827b7535e84ff59679aff","impliedFormat":1},{"version":"6a1aa3e55bdc50503956c5cd09ae4cd72e3072692d742816f65c66ca14f4dfdd","impliedFormat":1},{"version":"ab75cfd9c4f93ffd601f7ca1753d6a9d953bbedfbd7a5b3f0436ac8a1de60dfa","impliedFormat":1},{"version":"59c68235df3905989afa0399381c1198313aaaf1ed387f57937eb616625dff15","impliedFormat":1},{"version":"b73cbf0a72c8800cf8f96a9acfe94f3ad32ca71342a8908b8ae484d61113f647","impliedFormat":1},{"version":"bae6dd176832f6423966647382c0d7ba9e63f8c167522f09a982f086cd4e8b23","impliedFormat":1},{"version":"1364f64d2fb03bbb514edc42224abd576c064f89be6a990136774ecdd881a1da","impliedFormat":1},{"version":"c9958eb32126a3843deedda8c22fb97024aa5d6dd588b90af2d7f2bfac540f23","impliedFormat":1},{"version":"950fb67a59be4c2dbe69a5786292e60a5cb0e8612e0e223537784c731af55db1","impliedFormat":1},{"version":"e927c2c13c4eaf0a7f17e6022eee8519eb29ef42c4c13a31e81a611ab8c95577","impliedFormat":1},{"version":"07ca44e8d8288e69afdec7a31fa408ce6ab90d4f3d620006701d5544646da6aa","impliedFormat":1},{"version":"70246ad95ad8a22bdfe806cb5d383a26c0c6e58e7207ab9c431f1cb175aca657","impliedFormat":1},{"version":"f00f3aa5d64ff46e600648b55a79dcd1333458f7a10da2ed594d9f0a44b76d0b","impliedFormat":1},{"version":"772d8d5eb158b6c92412c03228bd9902ccb1457d7a705b8129814a5d1a6308fc","impliedFormat":1},{"version":"4e4475fba4ed93a72f167b061cd94a2e171b82695c56de9899275e880e06ba41","impliedFormat":1},{"version":"97c5f5d580ab2e4decd0a3135204050f9b97cd7908c5a8fbc041eadede79b2fa","impliedFormat":1},{"version":"c99a3a5f2215d5b9d735aa04cec6e61ed079d8c0263248e298ffe4604d4d0624","impliedFormat":1},{"version":"49b2375c586882c3ac7f57eba86680ff9742a8d8cb2fe25fe54d1b9673690d41","impliedFormat":1},{"version":"802e797bcab5663b2c9f63f51bdf67eff7c41bc64c0fd65e6da3e7941359e2f7","impliedFormat":1},{"version":"b98ce74c2bc49a9b79408f049c49909190c747b0462e78f91c09618da86bae53","impliedFormat":1},{"version":"3ecfccf916fea7c6c34394413b55eb70e817a73e39b4417d6573e523784e3f8e","impliedFormat":1},{"version":"c05bc82af01e673afc99bdffd4ebafde22ab027d63e45be9e1f1db3bc39e2fc0","impliedFormat":1},{"version":"6459054aabb306821a043e02b89d54da508e3a6966601a41e71c166e4ea1474f","impliedFormat":1},{"version":"f416c9c3eee9d47ff49132c34f96b9180e50485d435d5748f0e8b72521d28d2e","impliedFormat":1},{"version":"05c97cddbaf99978f83d96de2d8af86aded9332592f08ce4a284d72d0952c391","impliedFormat":1},{"version":"14e5cdec6f8ae82dfd0694e64903a0a54abdfe37e1d966de3d4128362acbf35f","impliedFormat":1},{"version":"bbc183d2d69f4b59fd4dd8799ffdf4eb91173d1c4ad71cce91a3811c021bf80c","impliedFormat":1},{"version":"7b6ff760c8a240b40dab6e4419b989f06a5b782f4710d2967e67c695ef3e93c4","impliedFormat":1},{"version":"8dbc4134a4b3623fc476be5f36de35c40f2768e2e3d9ed437e0d5f1c4cd850f6","impliedFormat":1},{"version":"4e06330a84dec7287f7ebdd64978f41a9f70a668d3b5edc69d5d4a50b9b376bb","impliedFormat":1},{"version":"65bfa72967fbe9fc33353e1ac03f0480aa2e2ea346d61ff3ea997dfd850f641a","impliedFormat":1},{"version":"8f88c6be9803fe5aaa80b00b27f230c824d4b8a33856b865bea5793cb52bb797","impliedFormat":1},{"version":"f974e4a06953682a2c15d5bd5114c0284d5abf8bc0fe4da25cb9159427b70072","impliedFormat":1},{"version":"872caaa31423f4345983d643e4649fb30f548e9883a334d6d1c5fff68ede22d4","impliedFormat":1},{"version":"94404c4a878fe291e7578a2a80264c6f18e9f1933fbb57e48f0eb368672e389c","impliedFormat":1},{"version":"5c1b7f03aa88be854bc15810bfd5bd5a1943c5a7620e1c53eddd2a013996343e","impliedFormat":1},{"version":"09dfc64fcd6a2785867f2368419859a6cc5a8d4e73cbe2538f205b1642eb0f51","impliedFormat":1},{"version":"bcf6f0a323653e72199105a9316d91463ad4744c546d1271310818b8cef7c608","impliedFormat":1},{"version":"01aa917531e116485beca44a14970834687b857757159769c16b228eb1e49c5f","impliedFormat":1},{"version":"351475f9c874c62f9b45b1f0dc7e2704e80dfd5f1af83a3a9f841f9dfe5b2912","impliedFormat":1},{"version":"ac457ad39e531b7649e7b40ee5847606eac64e236efd76c5d12db95bf4eacd17","impliedFormat":1},{"version":"187a6fdbdecb972510b7555f3caacb44b58415da8d5825d03a583c4b73fde4cf","impliedFormat":1},{"version":"d4c3250105a612202289b3a266bb7e323db144f6b9414f9dea85c531c098b811","impliedFormat":1},{"version":"95b444b8c311f2084f0fb51c616163f950fb2e35f4eaa07878f313a2d36c98a4","impliedFormat":1},{"version":"741067675daa6d4334a2dc80a4452ca3850e89d5852e330db7cb2b5f867173b1","impliedFormat":1},{"version":"f8acecec1114f11690956e007d920044799aefeb3cece9e7f4b1f8a1d542b2c9","impliedFormat":1},{"version":"131b1475d2045f20fb9f43b7aa6b7cb51f25250b5e4c6a1d4aa3cf4dd1a68793","impliedFormat":1},{"version":"3a17f09634c50cce884721f54fd9e7b98e03ac505889c560876291fcf8a09e90","impliedFormat":1},{"version":"32531dfbb0cdc4525296648f53b2b5c39b64282791e2a8c765712e49e6461046","impliedFormat":1},{"version":"0ce1b2237c1c3df49748d61568160d780d7b26693bd9feb3acb0744a152cd86d","impliedFormat":1},{"version":"e489985388e2c71d3542612685b4a7db326922b57ac880f299da7026a4e8a117","impliedFormat":1},{"version":"e1437c5f191edb7a494f7bbbc033b97d72d42e054d521402ee194ac5b6b7bf49","impliedFormat":1},{"version":"04d3aad777b6af5bd000bfc409907a159fe77e190b9d368da4ba649cdc28d39e","affectsGlobalScope":true,"impliedFormat":1},{"version":"fd1b9d883b9446f1e1da1e1033a6a98995c25fbf3c10818a78960e2f2917d10c","impliedFormat":1},{"version":"19252079538942a69be1645e153f7dbbc1ef56b4f983c633bf31fe26aeac32cd","impliedFormat":1},{"version":"bc11f3ac00ac060462597add171220aed628c393f2782ac75dd29ff1e0db871c","impliedFormat":1},{"version":"616775f16134fa9d01fc677ad3f76e68c051a056c22ab552c64cc281a9686790","impliedFormat":1},{"version":"65c24a8baa2cca1de069a0ba9fba82a173690f52d7e2d0f1f7542d59d5eb4db0","impliedFormat":1},{"version":"313c85c332bb6892d5f7c624dc39107ca7a6b2f1b3212db86dbbefbe7f8ddd5a","impliedFormat":1},{"version":"3b0b1d352b8d2e47f1c4df4fb0678702aee071155b12ef0185fce9eb4fa4af1e","impliedFormat":1},{"version":"77e71242e71ebf8528c5802993697878f0533db8f2299b4d36aa015bae08a79c","impliedFormat":1},{"version":"a344403e7a7384e0e7093942533d309194ad0a53eca2a3100c0b0ab4d3932773","impliedFormat":1},{"version":"b7fff2d004c5879cae335db8f954eb1d61242d9f2d28515e67902032723caeab","impliedFormat":1},{"version":"5f3dc10ae646f375776b4e028d2bed039a93eebbba105694d8b910feebbe8b9c","impliedFormat":1},{"version":"bb18bf4a61a17b4a6199eb3938ecfa4a59eb7c40843ad4a82b975ab6f7e3d925","impliedFormat":1},{"version":"4545c1a1ceca170d5d83452dd7c4994644c35cf676a671412601689d9a62da35","impliedFormat":1},{"version":"e9b6fc05f536dfddcdc65dbcf04e09391b1c968ab967382e48924f5cb90d88e1","impliedFormat":1},{"version":"a2d648d333cf67b9aeac5d81a1a379d563a8ffa91ddd61c6179f68de724260ff","impliedFormat":1},{"version":"2b664c3cc544d0e35276e1fb2d4989f7d4b4027ffc64da34ec83a6ccf2e5c528","impliedFormat":1},{"version":"a3f41ed1b4f2fc3049394b945a68ae4fdefd49fa1739c32f149d32c0545d67f5","impliedFormat":1},{"version":"3cd8f0464e0939b47bfccbb9bb474a6d87d57210e304029cd8eb59c63a81935d","impliedFormat":1},{"version":"47699512e6d8bebf7be488182427189f999affe3addc1c87c882d36b7f2d0b0e","impliedFormat":1},{"version":"3026abd48e5e312f2328629ede6e0f770d21c3cd32cee705c450e589d015ee09","impliedFormat":1},{"version":"8b140b398a6afbd17cc97c38aea5274b2f7f39b1ae5b62952cfe65bf493e3e75","impliedFormat":1},{"version":"7663d2c19ce5ef8288c790edba3d45af54e58c84f1b37b1249f6d49d962f3d91","impliedFormat":1},{"version":"30112425b2cf042fca1c79c19e35f88f44bfb2e97454527528cd639dd1a460ca","impliedFormat":1},{"version":"00bd6ebe607246b45296aa2b805bd6a58c859acecda154bfa91f5334d7c175c6","impliedFormat":1},{"version":"ad036a85efcd9e5b4f7dd5c1a7362c8478f9a3b6c3554654ca24a29aa850a9c5","impliedFormat":1},{"version":"fedebeae32c5cdd1a85b4e0504a01996e4a8adf3dfa72876920d3dd6e42978e7","impliedFormat":1},{"version":"504f37ba38bfea8394ec4f397c9a2ade7c78055e41ef5a600073b515c4fd0fc9","impliedFormat":1},{"version":"cdf21eee8007e339b1b9945abf4a7b44930b1d695cc528459e68a3adc39a622e","impliedFormat":1},{"version":"db036c56f79186da50af66511d37d9fe77fa6793381927292d17f81f787bb195","impliedFormat":1},{"version":"87ac2fb61e629e777f4d161dff534c2023ee15afd9cb3b1589b9b1f014e75c58","impliedFormat":1},{"version":"13c8b4348db91e2f7d694adc17e7438e6776bc506d5c8f5de9ad9989707fa3fe","impliedFormat":1},{"version":"3c1051617aa50b38e9efaabce25e10a5dd9b1f42e372ef0e8a674076a68742ed","impliedFormat":1},{"version":"07a3e20cdcb0f1182f452c0410606711fbea922ca76929a41aacb01104bc0d27","impliedFormat":1},{"version":"1de80059b8078ea5749941c9f863aa970b4735bdbb003be4925c853a8b6b4450","impliedFormat":1},{"version":"1d079c37fa53e3c21ed3fa214a27507bda9991f2a41458705b19ed8c2b61173d","impliedFormat":1},{"version":"4cd4b6b1279e9d744a3825cbd7757bbefe7f0708f3f1069179ad535f19e8ed2c","impliedFormat":1},{"version":"5835a6e0d7cd2738e56b671af0e561e7c1b4fb77751383672f4b009f4e161d70","impliedFormat":1},{"version":"c0eeaaa67c85c3bb6c52b629ebbfd3b2292dc67e8c0ffda2fc6cd2f78dc471e6","impliedFormat":1},{"version":"4b7f74b772140395e7af67c4841be1ab867c11b3b82a51b1aeb692822b76c872","impliedFormat":1},{"version":"27be6622e2922a1b412eb057faa854831b95db9db5035c3f6d4b677b902ab3b7","impliedFormat":1},{"version":"b95a6f019095dd1d48fd04965b50dfd63e5743a6e75478343c46d2582a5132bf","impliedFormat":99},{"version":"c2008605e78208cfa9cd70bd29856b72dda7ad89df5dc895920f8e10bcb9cd0a","impliedFormat":99},{"version":"b97cb5616d2ab82a98ec9ada7b9e9cabb1f5da880ec50ea2b8dc5baa4cbf3c16","impliedFormat":99},{"version":"d23df9ff06ae8bf1dcb7cc933e97ae7da418ac77749fecee758bb43a8d69f840","affectsGlobalScope":true,"impliedFormat":1},{"version":"040c71dde2c406f869ad2f41e8d4ce579cc60c8dbe5aa0dd8962ac943b846572","affectsGlobalScope":true,"impliedFormat":1},{"version":"3586f5ea3cc27083a17bd5c9059ede9421d587286d5a47f4341a4c2d00e4fa91","impliedFormat":1},{"version":"a6df929821e62f4719551f7955b9f42c0cd53c1370aec2dd322e24196a7dfe33","impliedFormat":1},{"version":"b789bf89eb19c777ed1e956dbad0925ca795701552d22e68fd130a032008b9f9","impliedFormat":1},"9269d492817e359123ac64c8205e5d05dab63d71a3a7a229e68b5d9a0e8150bf",{"version":"402e5c534fb2b85fa771170595db3ac0dd532112c8fa44fc23f233bc6967488b","impliedFormat":1},{"version":"7965dc3c7648e2a7a586d11781cabb43d4859920716bc2fdc523da912b06570d","impliedFormat":1},{"version":"90c2bd9a3e72fe08b8fa5982e78cb8dc855a1157b26e11e37a793283c52bf64b","impliedFormat":1},{"version":"a8122fe390a2a987079e06c573b1471296114677923c1c094c24a53ddd7344a2","impliedFormat":1},{"version":"70c2cb19c0c42061a39351156653aa0cf5ba1ecdc8a07424dd38e3a1f1e3c7f4","impliedFormat":1},{"version":"a8fb10fd8c7bc7d9b8f546d4d186d1027f8a9002a639bec689b5000dab68e35c","impliedFormat":1},{"version":"c9b467ea59b86bd27714a879b9ad43c16f186012a26d0f7110b1322025ceaa83","impliedFormat":1},{"version":"57ea19c2e6ba094d8087c721bac30ff1c681081dbd8b167ac068590ef633e7a5","impliedFormat":1},{"version":"cba81ec9ae7bc31a4dc56f33c054131e037649d6b9a2cfa245124c67e23e4721","impliedFormat":1},{"version":"ad193f61ba708e01218496f093c23626aa3808c296844a99189be7108a9c8343","impliedFormat":1},{"version":"a0544b3c8b70b2f319a99ea380b55ab5394ede9188cdee452a5d0ce264f258b2","impliedFormat":1},{"version":"8c654c17c334c7c168c1c36e5336896dc2c892de940886c1639bebd9fc7b9be4","impliedFormat":1},{"version":"6a4da742485d5c2eb6bcb322ae96993999ffecbd5660b0219a5f5678d8225bb0","impliedFormat":1},{"version":"c65ca21d7002bdb431f9ab3c7a6e765a489aa5196e7e0ef00aed55b1294df599","impliedFormat":1},{"version":"c8fc655c2c4bafc155ceee01c84ab3d6c03192ced5d3f2de82e20f3d1bd7f9fa","impliedFormat":1},{"version":"be5a7ff3b47f7e553565e9483bdcadb0ca2040ac9e5ec7b81c7e115a81059882","impliedFormat":1},{"version":"1a93f36ecdb60a95e3a3621b561763e2952da81962fae217ab5441ac1d77ffc5","impliedFormat":1},{"version":"2a771d907aebf9391ac1f50e4ad37952943515eeea0dcc7e78aa08f508294668","impliedFormat":1},{"version":"0146fd6262c3fd3da51cb0254bb6b9a4e42931eb2f56329edd4c199cb9aaf804","impliedFormat":1},{"version":"183f480885db5caa5a8acb833c2be04f98056bdcc5fb29e969ff86e07efe57ab","impliedFormat":99},{"version":"b558c9a18ea4e6e4157124465c3ef1063e64640da139e67be5edb22f534f2f08","impliedFormat":1},{"version":"01374379f82be05d25c08d2f30779fa4a4c41895a18b93b33f14aeef51768692","impliedFormat":1},{"version":"b0dee183d4e65cf938242efaf3d833c6b645afb35039d058496965014f158141","impliedFormat":1},{"version":"c0bbbf84d3fbd85dd60d040c81e8964cc00e38124a52e9c5dcdedf45fea3f213","impliedFormat":1},"c30fc9805b445db974a288c3276a0a206b4497e5c2eafe4a477f5c0af069c491","c87bb03b72e47cb63f2d2c96b498a368a0de85733a200dd2c71ca410fced3db6",{"version":"38479e9851ea5f43f60baaa6bc894a49dba0a74dd706ce592d32bcb8b59e3be9","affectsGlobalScope":true,"impliedFormat":1},{"version":"9592f843d45105b9335c4cd364b9b2562ce4904e0895152206ac4f5b2d1bb212","impliedFormat":1},{"version":"f9ff719608ace88cae7cb823f159d5fb82c9550f2f7e6e7d0f4c6e41d4e4edb4","affectsGlobalScope":true,"impliedFormat":1},{"version":"9727eb7b07f1fd14d891412e0a0484a8f01819babcfe2eae9b3b3655f779f5c4","impliedFormat":1},{"version":"41f45ed6b4cd7b8aec2e4888a47d5061ee1020f89375b57d388cfe1f05313991","impliedFormat":99},{"version":"98bb67aa18a720c471e2739441d8bdecdae17c40361914c1ccffab0573356a85","impliedFormat":99},{"version":"8258b4ec62cf9f136f1613e1602156fdd0852bb8715dde963d217ad4d61d8d09","impliedFormat":99},"ce55b5a5ce5e675abf61d5430bfd8eb3dcac3c4121565d8c6255ceb4b74925e1","4de30b20ba9d810b001396e41ea9457585924465c22c1b3c597cd6df99c524ff","d79f92203c7efa24d513ce39358b52f89338b5cf2aca8772b45eb79329d7d1ba","75d49bea7da06ffb459e02b328fc4832ef7c6c393cc957719a3ab870f20b51da","4906f4ef56a0dc1a3caa5115c3199c98c33553277cbcfc1d399716f3b0443bbc","204f55ec5c6fb7228bf7df9af6d8ef67d8861f35dcfba2122ef109504c61a34f","c5bdb4da5b9cefd887ce10ddc8109bd67a6a0bfd1924b31c738e9954401cb4c9","b21a83beb3b028e4341fe8a3919635434abc346c188390fed346505ca7e47583","79dc85b7081875bc3ee3a11053df1839c48f660e9099da9882ce40fd2f4cb999","99f293c5cd322a520d86f83a9c61477855c1b220c79525b901e8618f665f34a4","87c0bd1e525191665ee84e1af459afd13f73a1578ff3be80e5893677b02c47b2","e393cc835b05831ab14c3932876afc70ce23b904ae98af7542a841b7c6fd9f8f","ff797ce29470af35d95ff6a83cd07f45c1842df3426fca71954e51670f063198","a2344ee65b0f2f18db92e9f639f78dfcf3645d8d4c18d5299b0e3f51f51f5b8d","7c44a6d0b911d6fde868261157286640d442689eb60a91b883586cb0daf0026e","77a655d121739afc8162e5530e25bdb4800c9de8c0341a414abdbcdaa4959400","684cb292d39fed9dac15e56a7004ae0436dc8a6cdfd9461e5827550867c70160",{"version":"c57b441e0c0a9cbdfa7d850dae1f8a387d6f81cbffbc3cd0465d530084c2417d","impliedFormat":99},{"version":"26c57c9f839e6d2048d6c25e81f805ba0ca32a28fd4d824399fd5456c9b0575b","impliedFormat":1},"d710fb226c17467f0cdb0d971f64bf2a35e96465dde92e1599a9baa27a3a02dc","40672f62c09b18e49a9a5b1188b5c8ae38f1e7bfe4855c20eac9cf1c1db35c21","81241a38b21114808f4048984b6ce61e83942db8007c19f8d542d10037f4a2a5","c7dec05b0077853ef4ed1d303e059f3664e62cff3fee29835fe646ae0cb25090","3b851874ecd011cb7643163513be1c7367bbc2075fb90432a7254632da29400d",{"version":"96d14f21b7652903852eef49379d04dbda28c16ed36468f8c9fa08f7c14c9538","impliedFormat":1}],"root":[408,433,434,[442,458],[461,465]],"options":{"allowJs":true,"esModuleInterop":true,"jsx":1,"module":99,"skipLibCheck":true,"strict":true},"referencedMap":[[464,1],[465,2],[408,3],[361,4],[466,4],[142,5],[143,5],[144,6],[99,7],[145,8],[146,9],[147,10],[94,4],[97,11],[95,4],[96,4],[148,12],[149,13],[150,14],[151,15],[152,16],[153,17],[154,17],[155,18],[156,19],[157,20],[158,21],[100,4],[98,4],[159,22],[160,23],[161,24],[193,25],[162,26],[163,27],[164,28],[165,29],[166,30],[167,31],[168,32],[169,33],[170,34],[171,35],[172,35],[173,36],[174,4],[175,37],[177,38],[176,39],[178,40],[179,41],[180,42],[181,43],[182,44],[183,45],[184,46],[185,47],[186,48],[187,49],[188,50],[189,51],[190,52],[101,4],[102,4],[103,4],[141,53],[191,54],[192,55],[86,4],[198,56],[199,57],[197,58],[195,59],[196,60],[84,4],[87,61],[285,58],[459,4],[85,4],[437,62],[438,58],[435,4],[436,4],[93,63],[364,64],[368,65],[370,66],[219,67],[233,68],[335,69],[264,4],[338,70],[300,71],[308,72],[336,73],[220,74],[263,4],[265,75],[337,76],[240,77],[221,78],[244,77],[234,77],[204,77],[291,79],[292,80],[209,4],[288,81],[293,82],[379,83],[286,82],[380,84],[270,4],[289,85],[392,86],[391,87],[295,82],[390,4],[388,4],[389,88],[290,58],[277,89],[278,90],[287,91],[303,92],[304,93],[294,94],[272,95],[273,96],[383,97],[386,98],[251,99],[250,100],[249,101],[395,58],[248,102],[225,4],[398,4],[401,4],[400,58],[402,103],[200,4],[329,4],[232,104],[202,105],[352,4],[353,4],[355,4],[358,106],[354,4],[356,107],[357,107],[218,4],[231,4],[363,108],[371,109],[375,110],[214,111],[280,112],[279,4],[271,95],[299,113],[297,114],[296,4],[298,4],[302,115],[275,116],[213,117],[238,118],[326,119],[205,120],[212,121],[201,69],[340,122],[350,123],[339,4],[349,124],[239,4],[223,125],[317,126],[316,4],[323,127],[325,128],[318,129],[322,130],[324,127],[321,129],[320,127],[319,129],[260,131],[245,131],[311,132],[246,132],[207,133],[206,4],[315,134],[314,135],[313,136],[312,137],[208,138],[284,139],[301,140],[283,141],[307,142],[309,143],[306,141],[241,138],[194,4],[327,144],[266,145],[348,146],[269,147],[343,148],[211,4],[344,149],[346,150],[347,151],[330,4],[342,120],[242,152],[328,153],[351,154],[215,4],[217,4],[222,155],[310,156],[210,157],[216,4],[268,158],[267,159],[224,160],[276,161],[274,162],[226,163],[228,164],[399,4],[227,165],[229,166],[366,4],[365,4],[367,4],[397,4],[230,167],[282,58],[92,4],[305,168],[252,4],[262,169],[373,58],[382,170],[259,58],[377,82],[258,171],[360,172],[257,170],[203,4],[384,173],[255,58],[256,58],[247,4],[261,4],[254,174],[253,175],[243,176],[237,94],[345,4],[236,177],[235,4],[369,4],[281,58],[362,178],[83,4],[91,179],[88,58],[89,4],[90,4],[341,180],[334,181],[333,4],[332,182],[331,4],[372,183],[374,184],[376,185],[378,186],[381,187],[407,188],[385,188],[406,189],[387,190],[393,191],[394,192],[396,193],[403,194],[405,4],[404,195],[359,196],[425,197],[423,198],[424,199],[412,200],[413,198],[420,201],[411,202],[416,203],[426,4],[417,204],[422,205],[428,206],[427,207],[410,208],[418,209],[419,210],[414,211],[421,197],[415,212],[409,4],[460,4],[431,213],[430,4],[429,4],[432,214],[81,4],[82,4],[13,4],[14,4],[16,4],[15,4],[2,4],[17,4],[18,4],[19,4],[20,4],[21,4],[22,4],[23,4],[24,4],[3,4],[25,4],[26,4],[4,4],[27,4],[31,4],[28,4],[29,4],[30,4],[32,4],[33,4],[34,4],[5,4],[35,4],[36,4],[37,4],[38,4],[6,4],[42,4],[39,4],[40,4],[41,4],[43,4],[7,4],[44,4],[49,4],[50,4],[45,4],[46,4],[47,4],[48,4],[8,4],[54,4],[51,4],[52,4],[53,4],[55,4],[9,4],[56,4],[57,4],[58,4],[60,4],[59,4],[61,4],[62,4],[10,4],[63,4],[64,4],[65,4],[11,4],[66,4],[67,4],[68,4],[69,4],[70,4],[1,4],[71,4],[72,4],[12,4],[76,4],[74,4],[79,4],[78,4],[73,4],[77,4],[75,4],[80,4],[119,215],[129,216],[118,215],[139,217],[110,218],[109,219],[138,195],[132,220],[137,221],[112,222],[126,223],[111,224],[135,225],[107,226],[106,195],[136,227],[108,228],[113,229],[114,4],[117,229],[104,4],[140,230],[130,231],[121,232],[122,233],[124,234],[120,235],[123,236],[133,195],[115,237],[116,238],[125,239],[105,240],[128,231],[127,229],[131,4],[134,241],[441,242],[440,243],[439,4],[462,244],[463,245],[447,246],[452,247],[457,248],[456,246],[451,249],[450,250],[458,251],[448,252],[455,253],[453,254],[454,255],[434,58],[443,256],[449,4],[461,257],[444,258],[445,258],[446,259],[442,4],[433,260]],"semanticDiagnosticsPerFile":[[444,[{"start":3781,"length":174,"code":2345,"category":1,"messageText":{"messageText":"Argument of type '(state: ActorState) => { actors: Actor[]; actorDetails: { [x: string]: ActorDetail | undefined; }; }' is not assignable to parameter of type 'ActorState | Partial<ActorState> | ((state: ActorState) => ActorState | Partial<ActorState>)'.","category":1,"code":2345,"next":[{"messageText":"Type '(state: ActorState) => { actors: Actor[]; actorDetails: { [x: string]: ActorDetail | undefined; }; }' is not assignable to type '(state: ActorState) => ActorState | Partial<ActorState>'.","category":1,"code":2322,"next":[{"messageText":"Type '{ actors: Actor[]; actorDetails: { [x: string]: ActorDetail | undefined; }; }' is not assignable to type 'ActorState | Partial<ActorState>'.","category":1,"code":2322,"next":[{"messageText":"Type '{ actors: Actor[]; actorDetails: { [x: string]: ActorDetail | undefined; }; }' is not assignable to type 'Partial<ActorState>'.","category":1,"code":2322,"next":[{"messageText":"Types of property 'actorDetails' are incompatible.","category":1,"code":2326,"next":[{"messageText":"Type '{ [x: string]: ActorDetail | undefined; }' is not assignable to type 'Record<string, ActorDetail>'.","category":1,"code":2322,"next":[{"messageText":"'string' index signatures are incompatible.","category":1,"code":2634,"next":[{"messageText":"Type 'ActorDetail | undefined' is not assignable to type 'ActorDetail'.","category":1,"code":2322,"next":[{"messageText":"Type 'undefined' is not assignable to type 'ActorDetail'.","category":1,"code":2322}]}]}],"canonicalHead":{"code":2322,"messageText":"Type '{ actors: Actor[]; actorDetails: { [x: string]: ActorDetail | undefined; }; }' is not assignable to type 'Partial<ActorState>'."}}]}]}],"canonicalHead":{"code":2322,"messageText":"Type '(state: ActorState) => { actors: Actor[]; actorDetails: { [x: string]: ActorDetail | undefined; }; }' is not assignable to type '(state: ActorState) => ActorState | Partial<ActorState>'."}}]}]}}]]],"affectedFilesPendingEmit":[464,465,462,463,447,452,457,456,451,450,458,448,455,453,454,434,443,449,461,444,445,446,442,433],"version":"5.9.3"}
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
