'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Settings, Users, History, Loader2, AlertCircle } from 'lucide-react'
import { useActorStore, useDebateStore } from '@/stores'
import { Actor, SessionListItem } from '@/types'
import ActorCard from './ActorCard'
import DebateView from './DebateView'
import ActorManager from './ActorManager'
import SessionHistory from './SessionHistory'
import SettingsView from './SettingsView'
import SessionDetailView from './SessionDetailView'
import ProgressBar from './ProgressBar'
import QuestionBox from './QuestionBox'
import { apiClient } from '@/lib/apiClient'

type View = 'arena' | 'debate' | 'actors' | 'history' | 'settings' | 'sessionDetail'

export default function Arena() {
  const [view, setView] = useState<View>('arena')
  const [question, setQuestion] = useState('')
  const [maxRounds, setMaxRounds] = useState(3)
  const [recentSessions, setRecentSessions] = useState<SessionListItem[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  // Actor store - separate selectors for different data
  const actors = useActorStore((state) => state.actors)
  const selectedActors = useActorStore((state) => state.selectedActors)
  const judgeActorId = useActorStore((state) => state.judgeActorId)
  const fetchActors = useActorStore((state) => state.fetchActors)
  const selectActor = useActorStore((state) => state.selectActor)
  const deselectActor = useActorStore((state) => state.deselectActor)
  const setJudgeActor = useActorStore((state) => state.setJudgeActor)

  // Debate store - use individual selectors to minimize re-renders
  // Status and error are frequently checked but change less often during streaming
  const status = useDebateStore((state) => state.status)
  const error = useDebateStore((state) => state.error)
  const currentPhase = useDebateStore((state) => state.currentPhase)

  // Session-related state - only changes at start/end
  const currentSession = useDebateStore((state) => state.currentSession)

  // Phase history - changes frequently during streaming
  const phaseHistory = useDebateStore((state) => state.phaseHistory)
  const currentPhaseRecord = useDebateStore((state) => state.currentPhaseRecord)

  // Diff selection - changes when user interacts with diff sidebar
  const selectedDiffPhaseId = useDebateStore((state) => state.selectedDiffPhaseId)
  const selectDiffPhase = useDebateStore((state) => state.selectDiffPhase)

  // Semantic state
  const semanticComparisons = useDebateStore((state) => state.semanticComparisons)
  const selectedTopicId = useDebateStore((state) => state.selectedTopicId)
  const selectTopic = useDebateStore((state) => state.selectTopic)

  // Progress state
  const progress = useDebateStore((state) => state.progress)

  // Actions - stable references
  const startDebate = useDebateStore((state) => state.startDebate)
  const stopDebate = useDebateStore((state) => state.stopDebate)
  const reset = useDebateStore((state) => state.reset)

  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchActors()
    loadRecentSessions()
  }, [fetchActors])

  const loadRecentSessions = async () => {
    try {
      const sessions = await apiClient.listSessions()
      setRecentSessions(sessions.slice(0, 5))
    } catch (err) {
      console.error('Failed to load recent sessions:', err)
    }
  }

  const handleStartDebate = async () => {
    if (!question.trim() || selectedActors.length < 2 || !judgeActorId) return

    try {
      // startDebate already calls streamDebate internally
      await startDebate(question, selectedActors, judgeActorId, { max_rounds: maxRounds })
      setView('debate')
    } catch (err) {
      console.error('Failed to start debate:', err)
    }
  }

  const handleBackToArena = () => {
    if (status === 'streaming') {
      stopDebate()
    }
    reset()
    setView('arena')
    loadRecentSessions()
  }

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setView('sessionDetail')
  }

  const selectedActorObjects = actors.filter((a) => selectedActors.includes(a.id))
  const judgeActor = actors.find((a) => a.id === judgeActorId)
  const nonJudgeActors = actors.filter((a) => !a.is_meta_judge)
  const judgeActors = actors.filter((a) => a.is_meta_judge)

  if (view === 'actors') {
    return <ActorManager onBack={() => setView('arena')} />
  }

  if (view === 'history') {
    return <SessionHistory onBack={() => setView('arena')} onSelect={handleSelectSession} />
  }

  if (view === 'settings') {
    return <SettingsView onBack={() => setView('arena')} />
  }

  if (view === 'sessionDetail' && selectedSessionId) {
    return <SessionDetailView sessionId={selectedSessionId} onBack={() => setView('arena')} />
  }

  if (view === 'debate') {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center justify-between max-w-[1600px] mx-auto">
            <button
              onClick={handleBackToArena}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-lg font-semibold tracking-wider text-accent-orange">MAGI</h1>
            <div className="w-16" />
          </div>
        </header>

        {/* Debate content - main area with fixed height */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full max-w-[1600px] mx-auto px-6 py-4 flex flex-col">
            {/* Question - collapsible for long questions */}
            <QuestionBox question={question} />

            {/* Status - fixed */}
            <div className="mb-4 flex items-center gap-4 shrink-0">
              {status === 'connecting' && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  连接中...
                </div>
              )}
              {status === 'streaming' && (
                <ProgressBar
                  startedAt={progress.startedAt}
                  currentPhaseStartedAt={progress.currentPhaseStartedAt}
                  completedSteps={progress.completedSteps}
                  estimatedTotalSteps={progress.estimatedTotalSteps}
                  currentStepProgress={progress.currentStepProgress}
                  currentPhase={currentPhase}
                  status={status}
                />
              )}
              {status === 'completed' && (
                <div className="text-accent-green">互评完成</div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-accent-red">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}
            </div>

            {/* Debate view - scrollable area with consensus inside */}
            {status !== 'idle' && (
              <div className="flex-1 min-h-0">
                <DebateView
                  actors={selectedActorObjects}
                  judgeActor={judgeActor}
                  phaseHistory={phaseHistory}
                  currentPhaseRecord={currentPhaseRecord}
                  selectedDiffPhaseId={selectedDiffPhaseId}
                  onSelectDiffPhase={selectDiffPhase}
                  status={status}
                  currentPhase={currentPhase}
                  question={question}
                  semanticComparisons={semanticComparisons}
                  selectedTopicId={selectedTopicId}
                  onSelectTopic={selectTopic}
                  consensus={currentSession?.consensus}  // Pass consensus to DebateView
                />
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  // Arena view
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-semibold tracking-wider text-accent-orange">MAGI</h1>
            <nav className="flex items-center gap-6">
              <button
                onClick={() => setView('arena')}
                className="text-text-primary hover:text-accent-blue transition-colors"
              >
                Arena
              </button>
              <button
                onClick={() => setView('actors')}
                className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
              >
                <Users className="w-4 h-4" />
                Actors
              </button>
              <button
                onClick={() => setView('history')}
                className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
              >
                <History className="w-4 h-4" />
                History
              </button>
            </nav>
          </div>
          <button
            onClick={() => setView('settings')}
            className="text-text-secondary hover:text-text-primary transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-5xl font-serif tracking-widest text-accent-orange mb-4">MAGI</h2>
            <p className="text-xl text-text-secondary tracking-wide">
              Multi-Agent Guided Intelligence
            </p>
          </motion.div>

          {/* Question input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="输入你的问题，让多个 AI 互评求解..."
              className="w-full h-32 bg-bg-secondary border border-border rounded-2xl px-6 py-4 text-lg placeholder:text-text-tertiary focus:outline-none focus:border-accent-blue transition-colors resize-none"
            />
          </motion.div>

          {/* Actor selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <label className="text-text-secondary text-sm mb-3 block">参与互评的 Actor:</label>
            <div className="flex flex-wrap gap-3">
              {nonJudgeActors.map((actor) => (
                <ActorCard
                  key={actor.id}
                  actor={actor}
                  selected={selectedActors.includes(actor.id)}
                  onSelect={() => {
                    if (selectedActors.includes(actor.id)) {
                      deselectActor(actor.id)
                    } else if (selectedActors.length < 3) {
                      selectActor(actor.id)
                    }
                  }}
                />
              ))}
              <button
                onClick={() => setView('actors')}
                className="h-20 px-4 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-text-tertiary hover:border-accent-blue hover:text-accent-blue transition-colors"
              >
                <span className="text-2xl">+</span>
                <span className="text-xs">添加 Actor</span>
              </button>
            </div>
          </motion.div>

          {/* Judge selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <label className="text-text-secondary text-sm mb-3 block">总结模型:</label>
            <div className="flex gap-3">
              {judgeActors.map((actor) => (
                <ActorCard
                  key={actor.id}
                  actor={actor}
                  selected={judgeActorId === actor.id}
                  onSelect={() => setJudgeActor(actor.id)}
                  showJudgeBadge
                />
              ))}
            </div>
          </motion.div>

          {/* Config */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8 flex items-center gap-6"
          >
            <div className="flex items-center gap-3">
              <label className="text-text-secondary">最大互评轮数:</label>
              <select
                value={maxRounds}
                onChange={(e) => setMaxRounds(Number(e.target.value))}
                className="px-3 py-2 bg-bg-secondary border border-border rounded-lg focus:outline-none focus:border-accent-blue"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} 轮</option>
                ))}
              </select>
            </div>
          </motion.div>

          {/* Start button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={handleStartDebate}
              disabled={!question.trim() || selectedActors.length < 2 || !judgeActorId}
              className="w-full py-4 bg-accent-blue hover:bg-blue-600 disabled:bg-bg-tertiary disabled:text-text-tertiary text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              开始互评
            </button>
          </motion.div>

          {/* Recent sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12"
          >
            <h3 className="text-text-secondary text-sm mb-3">最近互评</h3>
            <div className="space-y-2">
              {recentSessions.length === 0 ? (
                <div className="text-text-tertiary text-sm">暂无历史记录</div>
              ) : (
                recentSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 flex items-center justify-between hover:border-accent-blue transition-colors text-left"
                  >
                    <span className="text-text-primary truncate">{session.question}</span>
                    {session.consensus_confidence && (
                      <span className="text-accent-green text-sm ml-2">
                        {Math.round(session.consensus_confidence * 100)}% 共识
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}