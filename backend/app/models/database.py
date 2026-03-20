from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, Float, Enum as SQLEnum, JSON
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
    GOOGLE = "google"
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

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("debate_sessions.id"), nullable=False)
    actor_id = Column(String(36), ForeignKey("actors.id"), nullable=False)

    # Relationships
    session = relationship("DebateSession", back_populates="actors")
    actor = relationship("Actor", back_populates="sessions")


class Round(Base):
    __tablename__ = "rounds"

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

    role = Column(String(20), nullable=False)  # answer, review, revision, final
    content = Column(Text, nullable=False)

    # Token tracking
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    round = relationship("Round", back_populates="messages")