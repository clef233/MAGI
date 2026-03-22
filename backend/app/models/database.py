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
    consensus_key_uncertainties = Column(JSON, default=list)

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


class SemanticModelConfig(Base):
    """
    语义分析专用模型配置 - 全局单例。
    独立于 judge/debate actors，使用独立的 API 配置，
    避免与主流程竞争 API 限速。
    """
    __tablename__ = "semantic_model_configs"

    id = Column(String(36), primary_key=True, default=generate_uuid)

    # API Configuration - 与 Actor 表结构对齐
    provider = Column(SQLEnum(ProviderType), nullable=False)
    api_format = Column(String(50), default="openai_compatible")
    base_url = Column(String(255))
    api_key = Column(String(255), nullable=False)
    model = Column(String(100), nullable=False)
    max_tokens = Column(Integer, default=2048)
    temperature = Column(Float, default=0.3)

    # Timeout 配置（秒）
    question_intent_timeout = Column(Integer, default=60)
    topic_extraction_timeout = Column(Integer, default=90)
    cross_compare_timeout = Column(Integer, default=90)

    # Meta
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())