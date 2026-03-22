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