// Actor types
export type ProviderType = 'openai' | 'anthropic' | 'google' | 'custom'

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
  role: 'answer' | 'review' | 'revision' | 'final'
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
  confidence: number
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

// SSE Event types
export type SSEEventType =
  | 'round_start'
  | 'actor_start'
  | 'token'
  | 'actor_end'
  | 'round_end'
  | 'judge_start'
  | 'judge_token'
  | 'consensus'
  | 'complete'
  | 'error'

export interface SSEEvent {
  event: SSEEventType
  data: Record<string, unknown>
}