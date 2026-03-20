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