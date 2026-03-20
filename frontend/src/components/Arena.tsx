'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Settings, Users, History, Loader2, AlertCircle } from 'lucide-react'
import { useActorStore, useDebateStore } from '@/stores'
import { Actor } from '@/types'
import ActorCard from './ActorCard'
import DebateView from './DebateView'
import ActorManager from './ActorManager'
import SessionHistory from './SessionHistory'
import ConsensusView from './ConsensusView'

type View = 'arena' | 'debate' | 'actors' | 'history'

export default function Arena() {
  const [view, setView] = useState<View>('arena')
  const [question, setQuestion] = useState('')

  const {
    actors,
    selectedActors,
    judgeActorId,
    fetchActors,
    selectActor,
    deselectActor,
    setJudgeActor,
  } = useActorStore()

  const {
    status,
    currentRound,
    currentPhase,
    streamingContent,
    currentSession,
    startDebate,
    streamDebate,
    stopDebate,
    reset,
    error,
  } = useDebateStore()

  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchActors()
  }, [fetchActors])

  const handleStartDebate = async () => {
    if (!question.trim() || selectedActors.length < 2 || !judgeActorId) return

    try {
      const sessionId = await startDebate(question, selectedActors, judgeActorId)
      setView('debate')
      streamDebate(sessionId)
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
  }

  const selectedActorObjects = actors.filter((a) => selectedActors.includes(a.id))
  const judgeActor = actors.find((a) => a.id === judgeActorId)
  const nonJudgeActors = actors.filter((a) => !a.is_meta_judge)
  const judgeActors = actors.filter((a) => a.is_meta_judge)

  if (view === 'actors') {
    return <ActorManager onBack={() => setView('arena')} />
  }

  if (view === 'history') {
    return <SessionHistory onBack={() => setView('arena')} onSelect={(id) => console.log(id)} />
  }

  if (view === 'debate') {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
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

        {/* Debate content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto py-8 px-6">
            {/* Question */}
            <div className="mb-8">
              <h2 className="text-xl text-text-secondary mb-2">Question</h2>
              <p className="text-2xl font-medium">{question}</p>
            </div>

            {/* Status */}
            <div className="mb-6 flex items-center gap-4">
              {status === 'connecting' && (
                <div className="flex items-center gap-2 text-text-secondary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </div>
              )}
              {status === 'streaming' && (
                <div className="flex items-center gap-2">
                  <span className="text-accent-blue">Round {currentRound}</span>
                  <span className="text-text-tertiary">•</span>
                  <span className="text-text-secondary capitalize">{currentPhase}</span>
                </div>
              )}
              {status === 'completed' && (
                <div className="text-accent-green">Debate Complete</div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-accent-red">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}
            </div>

            {/* Debate view */}
            {status !== 'idle' && (
              <DebateView
                actors={selectedActorObjects}
                judgeActor={judgeActor}
                streamingContent={streamingContent}
                currentRound={currentRound}
                currentPhase={currentPhase}
                status={status}
              />
            )}

            {/* Consensus */}
            {currentSession?.consensus && status === 'completed' && (
              <ConsensusView consensus={currentSession.consensus} />
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
          <button className="text-text-secondary hover:text-text-primary transition-colors">
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
              placeholder="输入你的问题，让多个 AI 辩论求解..."
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
            <label className="text-text-secondary text-sm mb-3 block">参与辩论的 Actor:</label>
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
            <label className="text-text-secondary text-sm mb-3 block">裁决者:</label>
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
            <div className="text-text-secondary">
              轮次: <span className="text-text-primary">3 轮</span>
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
              开始辩论
            </button>
          </motion.div>

          {/* Recent sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12"
          >
            <h3 className="text-text-secondary text-sm mb-3">最近辩论</h3>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-bg-secondary border border-border rounded-xl px-4 py-3 flex items-center justify-between"
                >
                  <span className="text-text-primary truncate">示例辩论问题 #{i}</span>
                  <span className="text-accent-green text-sm">✓ 87% 共识</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}