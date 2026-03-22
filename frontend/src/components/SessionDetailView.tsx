'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { DebateSession, Actor, SemanticAnalysisResult, TopicComparison } from '@/types'
import {
  hydrateSessionToPhaseHistory,
  hydrateSemanticToMap,
  hydrateConsensus,
} from '@/lib/sessionHydrator'
import DebateView from './DebateView'
import QuestionBox from './QuestionBox'

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

  // Convert historical data to live format
  const phaseHistory = useMemo(() => {
    if (!session) return []
    return hydrateSessionToPhaseHistory(session)
  }, [session])

  // Convert semantic data to comparisons map
  const semanticComparisons = useMemo(() => {
    return hydrateSemanticToMap(semantic)
  }, [semantic])

  // Get consensus
  const consensus = useMemo(() => {
    if (!session) return null
    return hydrateConsensus(session)
  }, [session])

  // Get actors (non-judge for debate view)
  const debateActors = useMemo(() => {
    if (!session) return []
    return session.actors.filter(a => !a.is_meta_judge)
  }, [session])

  // Get judge actor
  const judgeActor = useMemo(() => {
    if (!session) return undefined
    return session.judge_actor
  }, [session])

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
          <div className="w-16" />
        </div>
      </header>

      {/* Main Content - uses unified DebateView */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-[1600px] mx-auto px-6 py-4 flex flex-col">
          {/* Question */}
          <div className="mb-4 shrink-0">
            <QuestionBox question={session.question} className="mb-0" />
            <p className="text-text-tertiary text-sm mt-2">{formatDate(session.created_at)}</p>
          </div>

          {/* Status */}
          <div className="mb-4 shrink-0">
            <span className={`px-3 py-1 rounded-full text-sm ${
              session.status === 'completed' ? 'bg-accent-green/20 text-accent-green' :
              session.status === 'debating' ? 'bg-accent-blue/20 text-accent-blue' :
              'bg-text-tertiary/20 text-text-tertiary'
            }`}>
              {session.status === 'completed' ? '已完成' : session.status}
            </span>
          </div>

          {/* Debate view - uses the same component as live mode */}
          <div className="flex-1 min-h-0">
            <DebateView
              actors={debateActors}
              judgeActor={judgeActor}
              phaseHistory={phaseHistory}
              selectedDiffPhaseId={selectedDiffPhaseId}
              onSelectDiffPhase={setSelectedDiffPhaseId}
              status="completed"
              question={session.question}
              semanticComparisons={semanticComparisons}
              selectedTopicId={selectedTopicId}
              onSelectTopic={setSelectedTopicId}
              consensus={consensus}
            />
          </div>
        </div>
      </main>
    </div>
  )
}