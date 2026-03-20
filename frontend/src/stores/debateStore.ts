import { create } from 'zustand'
import { DebateSession, SessionListItem, Message, Consensus } from '@/types'

interface DebateState {
  currentSession: DebateSession | null
  sessions: SessionListItem[]
  streamingContent: Map<string, string> // actor_id -> content
  currentRound: number
  currentPhase: string
  status: 'idle' | 'connecting' | 'streaming' | 'completed' | 'error'
  error: string | null

  // Actions
  fetchSessions: () => Promise<void>
  startDebate: (question: string, actorIds: string[], judgeActorId: string) => Promise<string>
  streamDebate: (sessionId: string) => void
  stopDebate: () => void

  // Internal state updates
  setSession: (session: DebateSession) => void
  addToken: (actorId: string, content: string) => void
  clearStreaming: (actorId: string) => void
  setRound: (round: number, phase: string) => void
  setConsensus: (consensus: Consensus) => void
  setStatus: (status: 'idle' | 'connecting' | 'streaming' | 'completed' | 'error') => void
  setError: (error: string | null) => void
  reset: () => void
}

let eventSource: EventSource | null = null

export const useDebateStore = create<DebateState>((set, get) => ({
  currentSession: null,
  sessions: [],
  streamingContent: new Map(),
  currentRound: 0,
  currentPhase: '',
  status: 'idle',
  error: null,

  fetchSessions: async () => {
    try {
      const res = await fetch('/api/sessions')
      if (!res.ok) throw new Error('Failed to fetch sessions')
      const sessions = await res.json()
      set({ sessions })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  startDebate: async (question, actorIds, judgeActorId) => {
    const res = await fetch('/api/debate/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        actor_ids: actorIds,
        judge_actor_id: judgeActorId,
        config: { max_rounds: 3 },
      }),
    })
    if (!res.ok) throw new Error('Failed to start debate')
    const data = await res.json()
    return data.session_id
  },

  streamDebate: (sessionId) => {
    set({ status: 'connecting', error: null, streamingContent: new Map() })

    // Close existing connection
    if (eventSource) {
      eventSource.close()
    }

    eventSource = new EventSource(`/api/debate/${sessionId}/stream`)

    eventSource.onopen = () => {
      set({ status: 'streaming' })
    }

    eventSource.onerror = () => {
      set({ status: 'error', error: 'Connection lost' })
      eventSource?.close()
    }

    eventSource.addEventListener('round_start', (e) => {
      const data = JSON.parse(e.data)
      set({ currentRound: data.round, currentPhase: data.phase })
    })

    eventSource.addEventListener('actor_start', (e) => {
      const data = JSON.parse(e.data)
      set((state) => {
        const newMap = new Map(state.streamingContent)
        newMap.set(data.actor_id, '')
        return { streamingContent: newMap }
      })
    })

    eventSource.addEventListener('token', (e) => {
      const data = JSON.parse(e.data)
      set((state) => {
        const newMap = new Map(state.streamingContent)
        const existing = newMap.get(data.actor_id) || ''
        newMap.set(data.actor_id, existing + data.content)
        return { streamingContent: newMap }
      })
    })

    eventSource.addEventListener('actor_end', (e) => {
      const data = JSON.parse(e.data)
      // Token usage info available if needed
    })

    eventSource.addEventListener('round_end', () => {
      // Round ended
    })

    eventSource.addEventListener('judge_start', () => {
      set({ currentPhase: 'judging' })
    })

    eventSource.addEventListener('judge_token', (e) => {
      const data = JSON.parse(e.data)
      set((state) => {
        const newMap = new Map(state.streamingContent)
        const existing = newMap.get('judge') || ''
        newMap.set('judge', existing + data.content)
        return { streamingContent: newMap }
      })
    })

    eventSource.addEventListener('consensus', (e) => {
      const data = JSON.parse(e.data)
      set({
        currentSession: {
          ...get().currentSession!,
          consensus: data,
        },
      })
    })

    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data)
      set({ status: 'completed' })
      eventSource?.close()
    })

    eventSource.addEventListener('error', (e) => {
      const data = JSON.parse(e.data)
      set({ status: 'error', error: data.message })
      eventSource?.close()
    })
  },

  stopDebate: async () => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    const session = get().currentSession
    if (session) {
      await fetch(`/api/debate/${session.id}/stop`, { method: 'POST' })
    }
    set({ status: 'idle' })
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
      return { streamingContent: newMap }
    })
  },
  setRound: (round, phase) => set({ currentRound: round, currentPhase: phase }),
  setConsensus: (consensus) => {
    set((state) => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, consensus }
        : null,
    }))
  },
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  reset: () => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    set({
      currentSession: null,
      streamingContent: new Map(),
      currentRound: 0,
      currentPhase: '',
      status: 'idle',
      error: null,
    })
  },
}))