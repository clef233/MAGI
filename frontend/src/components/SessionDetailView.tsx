'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, AlertCircle, Square } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { DebateSession, SemanticAnalysisResult, Consensus } from '@/types'
import {
  hydrateSessionToPhaseHistory,
  hydrateSemanticToMap,
  hydrateConsensus,
} from '@/lib/sessionHydrator'
import { useDebateStore } from '@/stores/debateStore'
import DebateView from './DebateView'
import QuestionBox from './QuestionBox'

/**
 * Safely convert a value to string for rendering.
 * Handles cases where LLM returns structured objects instead of plain strings.
 */
function safeString(val: unknown): string {
  if (typeof val === 'string') return val
  if (val && typeof val === 'object') {
    const values = Object.values(val).filter(Boolean)
    if (values.length > 0) return values.join(' — ')
    return JSON.stringify(val)
  }
  return String(val ?? '')
}

/**
 * Sanitize consensus data to ensure all array fields contain strings.
 * This handles legacy data where arrays may contain dict objects.
 */
function sanitizeConsensus(consensus: Consensus | null): Consensus | null {
  if (!consensus) return null
  return {
    ...consensus,
    agreements: (consensus.agreements || []).map(safeString),
    disagreements: (consensus.disagreements || []).map(safeString),
    key_uncertainties: (consensus.key_uncertainties || []).map(safeString),
  }
}

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
  const [stopping, setStopping] = useState(false)

  // Get live state from store
  const resumeDebate = useDebateStore((s) => s.resumeDebate)
  const disconnectStream = useDebateStore((s) => s.disconnectStream)
  const storeSessionId = useDebateStore((s) => s.currentSessionId)
  const storeSession = useDebateStore((s) => s.currentSession)
  const storePhaseHistory = useDebateStore((s) => s.phaseHistory)
  const storeCurrentPhaseRecord = useDebateStore((s) => s.currentPhaseRecord)
  const storeStatus = useDebateStore((s) => s.status)
  const storeCurrentPhase = useDebateStore((s) => s.currentPhase)
  const storeSemanticComparisons = useDebateStore((s) => s.semanticComparisons)
  const storeSemanticSkipped = useDebateStore((s) => s.semanticSkipped)
  const storeSemanticSkipReason = useDebateStore((s) => s.semanticSkipReason)

  // Check if session is active (in progress)
  const isActiveSession = useMemo(() => {
    return session && ['initializing', 'debating', 'judging'].includes(session.status)
  }, [session])

  // Check if store is attached to this session
  const isStoreAttached = storeSessionId === sessionId

  // Resume debate if active and not yet attached
  useEffect(() => {
    if (session && isActiveSession && !isStoreAttached) {
      resumeDebate(session)
    }
  }, [session, isActiveSession, isStoreAttached, resumeDebate])

  // Auto-refresh when live session completes
  useEffect(() => {
    if (isStoreAttached && storeStatus === 'completed') {
      loadSession()
    }
  }, [isStoreAttached, storeStatus])

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

  const handleStop = async () => {
    if (!session || stopping) return
    if (!confirm('确定要终止这个任务吗？')) return

    setStopping(true)
    try {
      await apiClient.stopDebate(sessionId)
      if (isStoreAttached) {
        disconnectStream()
      }
      await loadSession()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setStopping(false)
    }
  }

  // Effective values - use store data if attached, otherwise use local data
  const effectiveSession = isStoreAttached && storeSession ? storeSession : session

  // Convert historical data to live format
  const localPhaseHistory = useMemo(() => {
    if (!session) return []
    return hydrateSessionToPhaseHistory(session)
  }, [session])

  const effectivePhaseHistory = isStoreAttached ? storePhaseHistory : localPhaseHistory

  // Convert semantic data to comparisons map
  const localSemanticComparisons = useMemo(() => {
    return hydrateSemanticToMap(semantic)
  }, [semantic])

  const effectiveSemanticComparisons = isStoreAttached ? storeSemanticComparisons : localSemanticComparisons

  // Get consensus
  const localConsensus = useMemo(() => {
    if (!session) return null
    return hydrateConsensus(session)
  }, [session])

  // Sanitize consensus to ensure string arrays (handles legacy data with dict objects)
  const sanitizedConsensus = useMemo(() => {
    const c = effectiveSession?.consensus || localConsensus
    return sanitizeConsensus(c)
  }, [effectiveSession, localConsensus])

  // Get effective status and phase
  const effectiveStatus = isStoreAttached ? storeStatus : (session?.status === 'completed' ? 'completed' : 'idle')
  const effectiveCurrentPhase = isStoreAttached ? storeCurrentPhase : 'completed'
  const effectiveCurrentPhaseRecord = isStoreAttached ? storeCurrentPhaseRecord : null
  const effectiveSemanticSkipped = isStoreAttached ? storeSemanticSkipped : false
  const effectiveSemanticSkipReason = isStoreAttached ? storeSemanticSkipReason : null

  // Get actors (non-judge for debate view)
  const debateActors = useMemo(() => {
    if (!effectiveSession) return []
    return effectiveSession.actors.filter(a => !a.is_meta_judge)
  }, [effectiveSession])

  // Get judge actor
  const judgeActor = useMemo(() => {
    if (!effectiveSession) return undefined
    return effectiveSession.judge_actor
  }, [effectiveSession])

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
          <div className="w-16 flex justify-end">
            {isActiveSession && (
              <button
                onClick={handleStop}
                disabled={stopping}
                className="flex items-center gap-2 px-3 py-1.5 bg-accent-red/20 text-accent-red rounded-lg hover:bg-accent-red/30 transition-colors text-sm disabled:opacity-50"
              >
                <Square className="w-4 h-4" />
                {stopping ? '终止中...' : '终止任务'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - uses unified DebateView */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-[1600px] mx-auto px-6 py-4 flex flex-col">
          {/* Question */}
          <div className="mb-4 shrink-0">
            <QuestionBox question={effectiveSession?.question || ''} className="mb-0" />
            <p className="text-text-tertiary text-sm mt-2">{effectiveSession ? formatDate(effectiveSession.created_at) : ''}</p>
          </div>

          {/* Status */}
          <div className="mb-4 shrink-0">
            <span className={`px-3 py-1 rounded-full text-sm ${
              effectiveSession?.status === 'completed' ? 'bg-accent-green/20 text-accent-green' :
              effectiveSession?.status === 'debating' ? 'bg-accent-blue/20 text-accent-blue' :
              'bg-text-tertiary/20 text-text-tertiary'
            }`}>
              {effectiveSession?.status === 'completed' ? '已完成' : effectiveSession?.status || ''}
            </span>
          </div>

          {/* Debate view - uses the same component as live mode */}
          <div className="flex-1 min-h-0">
            <DebateView
              actors={debateActors}
              judgeActor={judgeActor}
              phaseHistory={effectivePhaseHistory}
              currentPhaseRecord={effectiveCurrentPhaseRecord}
              selectedDiffPhaseId={selectedDiffPhaseId}
              onSelectDiffPhase={setSelectedDiffPhaseId}
              status={effectiveStatus}
              currentPhase={effectiveCurrentPhase}
              question={effectiveSession?.question || ''}
              semanticComparisons={effectiveSemanticComparisons}
              selectedTopicId={selectedTopicId}
              onSelectTopic={setSelectedTopicId}
              consensus={sanitizedConsensus}
              semanticSkipped={effectiveSemanticSkipped}
              semanticSkipReason={effectiveSemanticSkipReason}
            />
          </div>
        </div>
      </main>
    </div>
  )
}