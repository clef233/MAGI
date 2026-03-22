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
  key_uncertainties?: string[]
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
  status: 'pending' | 'streaming' | 'done'
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

// ========== Semantic Model Config Types ==========

export interface SemanticModelConfig {
  id: string
  provider: ProviderType
  api_format: string
  base_url?: string
  model: string
  max_tokens: number
  temperature: number
  question_intent_timeout: number
  topic_extraction_timeout: number
  cross_compare_timeout: number
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface SemanticModelConfigCreate {
  provider: ProviderType
  api_format: string
  base_url?: string
  api_key: string
  model: string
  max_tokens?: number
  temperature?: number
  question_intent_timeout?: number
  topic_extraction_timeout?: number
  cross_compare_timeout?: number
}