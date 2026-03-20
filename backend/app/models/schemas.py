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