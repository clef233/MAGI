'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { DebateSession, Actor, Round, Message } from '@/types'

interface SessionDetailViewProps {
  sessionId: string
  onBack: () => void
}

// Diff utility for comparing texts
function computeDiff(oldText: string, newText: string): { type: 'add' | 'remove' | 'same'; text: string }[] {
  const oldLines = oldText.split(/[。！？\n]/).filter(l => l.trim())
  const newLines = newText.split(/[。！？\n]/).filter(l => l.trim())

  const result: { type: 'add' | 'remove' | 'same'; text: string }[] = []
  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)

  // Simple line-based diff
  for (const line of oldLines) {
    if (!newSet.has(line)) {
      result.push({ type: 'remove', text: line })
    }
  }
  for (const line of newLines) {
    if (!oldSet.has(line)) {
      result.push({ type: 'add', text: line })
    } else {
      result.push({ type: 'same', text: line })
    }
  }

  return result
}

export default function SessionDetailView({ sessionId, onBack }: SessionDetailViewProps) {
  const [session, setSession] = useState<DebateSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhase, setSelectedPhase] = useState<string>('initial')
  const [baseActorId, setBaseActorId] = useState<string | null>(null)
  const [compareActorId, setCompareActorId] = useState<string | null>(null)

  useEffect(() => {
    loadSession()
  }, [sessionId])

  const loadSession = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getDebate(sessionId)
      setSession(data)
      // Set default actor selection for diff
      const actors = data.actors.filter(a => !a.is_meta_judge)
      if (actors.length >= 2) {
        setBaseActorId(actors[0].id)
        setCompareActorId(actors[1].id)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Get messages grouped by phase for chat timeline
  // Filter out summary phase - it should only show via ConsensusView, not in chat
  const chatMessages = useMemo(() => {
    if (!session) return []

    const messages: {
      actor_id: string
      actor_name: string
      actor_color: string
      actor_icon: string
      round_number: number
      phase: string
      role: string
      content: string
      created_at: string
    }[] = []

    // Build actor lookup including judge_actor
    const allActors: Actor[] = [...session.actors]
    if (session.judge_actor) {
      allActors.push(session.judge_actor)
    }

    for (const round of session.rounds) {
      // Skip summary phase - only show via ConsensusView
      if (round.phase === 'summary') continue

      for (const msg of round.messages) {
        // Skip summary role messages as well
        if (msg.role === 'summary') continue

        // First try to find actor in allActors (including judge)
        let actor = allActors.find(a => a.id === msg.actor_id)
        // If not found and we have actor_name from API, use it
        if (!actor && msg.actor_name) {
          // Create a synthetic actor from message data
          actor = {
            id: msg.actor_id,
            name: msg.actor_name,
            display_color: '#9333EA', // Default purple for judge
            icon: '⚖️',
            is_meta_judge: true,
            provider: 'openai' as const,
            model: '',
            created_at: '',
          }
        }
        if (actor) {
          messages.push({
            actor_id: msg.actor_id,
            actor_name: actor.name,
            actor_color: actor.display_color,
            actor_icon: actor.icon,
            round_number: round.round_number,
            phase: round.phase,
            role: msg.role,
            content: msg.content,
            created_at: msg.created_at,
          })
        }
      }
    }

    return messages
  }, [session])

  // Get unique phases from rounds (excluding summary for diff)
  const phases = useMemo(() => {
    if (!session) return []
    const phaseSet = new Set<string>()
    for (const round of session.rounds) {
      // Exclude summary from phase selector
      if (round.phase !== 'summary') {
        phaseSet.add(round.phase)
      }
    }
    return Array.from(phaseSet)
  }, [session])

  // Get messages for selected phase (for diff view)
  const phaseMessages = useMemo(() => {
    if (!session || !selectedPhase) return []
    return session.rounds
      .filter(r => r.phase === selectedPhase)
      .flatMap(r => r.messages)
  }, [session, selectedPhase])

  // Compute diff between two actors
  const diffResult = useMemo(() => {
    if (!baseActorId || !compareActorId) return null

    const baseMsg = phaseMessages.find(m => m.actor_id === baseActorId)
    const compareMsg = phaseMessages.find(m => m.actor_id === compareActorId)

    if (!baseMsg || !compareMsg) return null

    return computeDiff(baseMsg.content, compareMsg.content)
  }, [phaseMessages, baseActorId, compareActorId])

  // Phase labels for display
  const phaseLabels: Record<string, string> = {
    initial: '初始回答',
    review: '互评',
    revision: '修订',
    final_answer: '最终回答',
    summary: '共识总结',
  }

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
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <button onClick={onBack} className="text-text-secondary hover:text-text-primary transition-colors">
              ← Back
            </button>
            <h1 className="text-lg font-semibold tracking-wider text-accent-orange">Session Detail</h1>
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
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <button onClick={onBack} className="text-text-secondary hover:text-text-primary transition-colors">
              ← Back
            </button>
            <h1 className="text-lg font-semibold tracking-wider text-accent-orange">Session Detail</h1>
            <div className="w-16" />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-accent-red">{error || 'Session not found'}</div>
        </main>
      </div>
    )
  }

  const nonJudgeActors = session.actors.filter(a => !a.is_meta_judge)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
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

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Chat Timeline (left 2/3) */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto">
            {/* Question */}
            <div className="mb-8">
              <h2 className="text-xl text-text-secondary mb-2">问题</h2>
              <p className="text-2xl font-medium">{session.question}</p>
              <p className="text-text-tertiary text-sm mt-2">{formatDate(session.created_at)}</p>
            </div>

            {/* Status */}
            <div className="mb-6">
              <span className={`px-3 py-1 rounded-full text-sm ${
                session.status === 'completed' ? 'bg-accent-green/20 text-accent-green' :
                session.status === 'debating' ? 'bg-accent-blue/20 text-accent-blue' :
                'bg-text-tertiary/20 text-text-tertiary'
              }`}>
                {session.status === 'completed' ? '已完成' : session.status}
              </span>
            </div>

            {/* Chat Messages */}
            <div className="space-y-4">
              {chatMessages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-bg-secondary border border-border rounded-2xl overflow-hidden"
                >
                  {/* Header */}
                  <div
                    className="px-4 py-3 flex items-center gap-3 border-b border-border"
                    style={{ backgroundColor: `${msg.actor_color}15` }}
                  >
                    <span className="text-xl">{msg.actor_icon}</span>
                    <span className="font-medium" style={{ color: msg.actor_color }}>
                      {msg.actor_name}
                    </span>
                    <span className="px-2 py-0.5 bg-text-tertiary/20 text-text-tertiary text-xs rounded">
                      {phaseLabels[msg.phase] || msg.phase}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="px-4 py-4">
                    <div className="text-text-primary whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Consensus */}
            {session.consensus && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 bg-accent-purple/10 border border-accent-purple/30 rounded-2xl p-6"
              >
                <h3 className="text-lg font-semibold text-accent-purple mb-4">综合结论</h3>
                <div className="text-text-primary mb-4">{session.consensus.summary}</div>

                {session.consensus.agreements.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm text-accent-green mb-2">共识点：</h4>
                    <ul className="list-disc list-inside text-text-secondary text-sm">
                      {session.consensus.agreements.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {session.consensus.disagreements.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm text-accent-orange mb-2">分歧点：</h4>
                    <ul className="list-disc list-inside text-text-secondary text-sm">
                      {session.consensus.disagreements.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text-tertiary">置信度：</span>
                  {session.consensus.confidence !== null && session.consensus.confidence !== undefined ? (
                    <span className="text-accent-blue">{Math.round(session.consensus.confidence * 100)}%</span>
                  ) : (
                    <span className="text-text-tertiary">暂不可用</span>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Diff Sidebar (right 1/3) */}
        <div className="w-96 border-l border-border overflow-auto p-4 bg-bg-secondary">
          <h3 className="text-text-secondary text-sm font-medium mb-4">差异对比</h3>

          {/* Phase selector */}
          <div className="mb-4">
            <label className="text-text-tertiary text-xs block mb-1">阶段</label>
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm focus:outline-none focus:border-accent-blue"
            >
              {phases.map((p) => (
                <option key={p} value={p}>{phaseLabels[p] || p}</option>
              ))}
            </select>
          </div>

          {/* Actor selectors */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="text-text-tertiary text-xs block mb-1">Base</label>
              <select
                value={baseActorId || ''}
                onChange={(e) => setBaseActorId(e.target.value)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm focus:outline-none focus:border-accent-blue"
              >
                {nonJudgeActors.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-text-tertiary text-xs block mb-1">Compare</label>
              <select
                value={compareActorId || ''}
                onChange={(e) => setCompareActorId(e.target.value)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm focus:outline-none focus:border-accent-blue"
              >
                {nonJudgeActors.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Diff display */}
          <div className="bg-bg-tertiary rounded-lg p-3 font-mono text-xs">
            {diffResult ? (
              <div className="space-y-1">
                {diffResult.map((item, idx) => (
                  <div
                    key={idx}
                    className={`${
                      item.type === 'add' ? 'text-accent-green bg-accent-green/10' :
                      item.type === 'remove' ? 'text-accent-red bg-accent-red/10' :
                      'text-text-tertiary'
                    } px-2 py-1 rounded`}
                  >
                    {item.type === 'add' && '+ '}
                    {item.type === 'remove' && '- '}
                    {item.text}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-text-tertiary text-center py-4">
                选择两个 Actor 进行比较
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}