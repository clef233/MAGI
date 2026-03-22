'use client'

import { memo, useMemo, useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Actor, LivePhaseRecord, LiveMessage, ConvergenceData, Consensus } from '@/types'
import ConsensusView from './ConsensusView'
import MarkdownBlock from './MarkdownBlock'

interface ReviewChatViewProps {
  question: string
  actors: Actor[]
  phaseHistory: LivePhaseRecord[]
  currentPhaseRecord?: LivePhaseRecord | null
  status: string
  onMessageClick?: (actorId: string, phase: string) => void
  consensus?: Consensus | null  // Add consensus prop
}

const phaseLabels: Record<string, string> = {
  initial: '初始回答',
  review: '互评',
  revision: '修订',
  final_answer: '最终回答',
  summary: '共识总结',
  judging: '总结中',
}

function getPhaseTitle(record: LivePhaseRecord): string {
  const base = phaseLabels[record.phase] || record.phase
  if (record.cycle) {
    return `第 ${record.step} 步 · 第 ${record.cycle} 轮${base}`
  }
  return `第 ${record.step} 步 · ${base}`
}

// Memoized MessageCard to prevent re-renders when unrelated state changes
const MessageCard = memo(function MessageCard({
  message,
  onMessageClick,
}: {
  message: LiveMessage
  onMessageClick?: (actorId: string, phase: string) => void
}) {
  // Don't render Markdown during streaming - use plain text for performance
  const isStreaming = message.status === 'streaming'
  const isPending = message.status === 'pending'

  return (
    <motion.div
      key={`${message.actorId}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onMessageClick?.(message.actorId, message.phase)}
      className="bg-bg-secondary border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-accent-blue/50 transition-colors"
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3 border-b border-border"
        style={{ backgroundColor: `${message.actorColor}10` }}
      >
        <span className="text-xl">{message.actorIcon}</span>
        <span className="font-medium" style={{ color: message.actorColor }}>
          {message.actorName}
        </span>
        <span className="px-2 py-0.5 bg-text-tertiary/20 text-text-tertiary text-xs rounded">
          {phaseLabels[message.phase] || message.phase}
        </span>
        {isStreaming && (
          <span className="text-xs text-accent-blue animate-pulse">streaming...</span>
        )}
        {isPending && (
          <span className="text-xs text-text-tertiary">等待中</span>
        )}
      </div>

      {/* Content - plain text during streaming, Markdown when done, placeholder for pending */}
      <div className="px-4 py-4">
        {isPending ? (
          // Placeholder for pending actors
          <div className="text-text-tertiary text-sm">等待开始...</div>
        ) : isStreaming ? (
          // Plain text during streaming for performance
          <div className="whitespace-pre-wrap break-words text-text-primary">
            {message.content}
            <span className="inline-block w-2 h-4 bg-text-primary animate-pulse ml-1" />
          </div>
        ) : (
          // Full Markdown rendering only when message is complete
          <MarkdownBlock content={message.content} />
        )}
      </div>
    </motion.div>
  )
})

// Memoized ConvergenceCard
const ConvergenceCard = memo(function ConvergenceCard({ convergence }: { convergence: ConvergenceData }) {
  const scorePercent = Math.round(convergence.score * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bg-secondary border border-accent-purple/30 rounded-2xl overflow-hidden"
    >
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border bg-accent-purple/10">
        <span className="text-xl">📊</span>
        <span className="font-medium text-accent-purple">收敛分析</span>
        <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold ${
          convergence.converged
            ? 'bg-accent-green/20 text-accent-green'
            : 'bg-accent-orange/20 text-accent-orange'
        }`}>
          {convergence.converged ? '已收敛' : '继续讨论'}
        </span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Score */}
        <div className="flex items-center gap-3">
          <span className="text-text-tertiary text-sm">共识度</span>
          <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                convergence.converged ? 'bg-accent-green' : 'bg-accent-blue'
              }`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <span className="text-text-primary font-mono text-sm">{scorePercent}%</span>
        </div>

        {/* Reason */}
        {convergence.reason && (
          <div className="text-text-secondary text-sm">
            {convergence.reason}
          </div>
        )}

        {/* Agreements */}
        {convergence.agreements && convergence.agreements.length > 0 && (
          <div>
            <div className="text-accent-green text-xs mb-1">✓ 已达成共识</div>
            <ul className="text-text-tertiary text-xs space-y-1 list-disc list-inside">
              {convergence.agreements.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Disagreements */}
        {convergence.disagreements && convergence.disagreements.length > 0 && (
          <div>
            <div className="text-accent-orange text-xs mb-1">⚡ 仍存分歧</div>
            <ul className="text-text-tertiary text-xs space-y-1 list-disc list-inside">
              {convergence.disagreements.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  )
})

export default function ReviewChatView({
  question,
  actors,
  phaseHistory,
  currentPhaseRecord = null,
  status,
  onMessageClick,
  consensus,
}: ReviewChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)
  const lastScrollTop = useRef(0)

  // Track which phases are expanded (for collapse/expand after completion)
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())

  // Extract the final answer message for pinning at top
  const finalAnswerPhase = useMemo(() => {
    if (status !== 'completed') return null
    for (let i = phaseHistory.length - 1; i >= 0; i--) {
      const record = phaseHistory[i]
      if (record.phase === 'final_answer') {
        const messages = Object.values(record.messages) as LiveMessage[]
        if (messages.length > 0) {
          return messages[0]  // Judge's final answer
        }
      }
    }
    return null
  }, [phaseHistory, status])

  const togglePhaseExpand = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phaseId)) {
        next.delete(phaseId)
      } else {
        next.add(phaseId)
      }
      return next
    })
  }

  // Intermediate phases (initial, review, revision) - collapsed by default when completed
  const isIntermediatePhase = (phase: string) => {
    return ['initial', 'review', 'revision'].includes(phase)
  }

  // Track user scroll intent
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      const shouldBeScrolledUp = distanceFromBottom > 80
      // Only update state when value actually changes to avoid unnecessary re-renders
      setUserHasScrolledUp(prev => prev === shouldBeScrolledUp ? prev : shouldBeScrolledUp)
      lastScrollTop.current = scrollTop
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-scroll only when user is near bottom
  useEffect(() => {
    if (scrollRef.current && status === 'streaming' && !userHasScrolledUp) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [phaseHistory, status, userHasScrolledUp])

  // Reset scroll lock when status changes to non-streaming
  useEffect(() => {
    if (status !== 'streaming') {
      setUserHasScrolledUp(false)
    }
  }, [status])

  // Build ordered messages from phase history
  // Merge phaseHistory (stable, updated on phase_end/actor_end) with
  // currentPhaseRecord (live, updated every 100ms during streaming)
  // This avoids re-computing the full list every token flush
  // Filter out summary phase - it should only show via ConsensusView, not in chat stream
  const phases = useMemo(() => {
    // Build list: use phaseHistory for completed phases, overlay currentPhaseRecord for active phase
    let allRecords: LivePhaseRecord[]
    if (currentPhaseRecord) {
      const historicalRecords = phaseHistory.filter(r => r.id !== currentPhaseRecord.id)
      allRecords = [...historicalRecords, currentPhaseRecord]
    } else {
      allRecords = phaseHistory
    }

    return allRecords
      .filter((record) => record.phase !== 'summary')
      .map((record) => {
        let messages = Object.values(record.messages) as LiveMessage[]

        // For current streaming phase in initial/review/revision, add placeholder cards for pending actors
        const isCurrentStreamingPhase =
          status === 'streaming' &&
          currentPhaseRecord?.id === record.id &&
          ['initial', 'review', 'revision'].includes(record.phase)

        if (isCurrentStreamingPhase) {
          // Get existing actor IDs
          const existingActorIds = new Set(messages.map(m => m.actorId))

          // Create placeholder messages for actors not yet started
          const placeholders: LiveMessage[] = actors
            .filter(a => !existingActorIds.has(a.id))
            .map(actor => ({
              actorId: actor.id,
              actorName: actor.name,
              actorIcon: actor.icon,
              actorColor: actor.display_color,
              phase: record.phase,
              step: record.step,
              cycle: record.cycle,
              content: '',
              status: 'pending' as const,
            }))

          messages = [...messages, ...placeholders]
        }

        const sortedMessages = messages.sort((a, b) => {
          const aIndex = actors.findIndex((act) => act.id === a.actorId)
          const bIndex = actors.findIndex((act) => act.id === b.actorId)
          return aIndex - bIndex
        })

        return {
          record,
          messages: sortedMessages,
        }
      })
  }, [phaseHistory, currentPhaseRecord, actors, status])

  return (
    <div ref={scrollRef} className="space-y-6 overflow-y-auto h-full pb-8 pr-2">
      {/* Question */}
      <div className="bg-bg-secondary border border-border rounded-2xl p-4">
        <div className="text-text-tertiary text-xs mb-2">问题</div>
        <div className="text-text-primary font-medium">{question}</div>
      </div>

      {/* Final Answer - pinned at top when completed */}
      {status === 'completed' && finalAnswerPhase && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent-blue/5 border-2 border-accent-blue/30 rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-3 flex items-center gap-3 border-b border-accent-blue/20 bg-accent-blue/10">
            <span className="text-lg">📋</span>
            <span className="font-semibold text-accent-blue">最终回答</span>
            <span className="text-xs text-text-tertiary ml-auto">
              by {finalAnswerPhase.actorName}
            </span>
          </div>
          <div className="px-5 py-4">
            <MarkdownBlock content={finalAnswerPhase.content} />
          </div>
        </motion.div>
      )}

      {/* All phases (summary is filtered out - shows via ConsensusView instead) */}
      <AnimatePresence mode="popLayout">
        {phases.map(({ record, messages }) => {
          // When completed, intermediate phases are collapsed by default
          const isCollapsible = status === 'completed' && isIntermediatePhase(record.phase)
          const isExpanded = !isCollapsible || expandedPhases.has(record.id)

          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {/* Phase separator - clickable when collapsible */}
              <div
                className={`flex items-center gap-4 py-2 sticky top-0 bg-bg-primary z-10 ${isCollapsible ? 'cursor-pointer hover:bg-bg-secondary/50 rounded-lg px-2 -mx-2 transition-colors' : ''}`}
                onClick={isCollapsible ? () => togglePhaseExpand(record.id) : undefined}
              >
                {isCollapsible && (
                  isExpanded
                    ? <ChevronDown className="w-4 h-4 text-text-tertiary shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0" />
                )}
                <div className="text-text-secondary text-sm font-medium">
                  {getPhaseTitle(record)}
                </div>
                {isCollapsible && !isExpanded && (
                  <span className="text-text-tertiary text-xs">
                    {messages.length} 条消息
                  </span>
                )}
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Messages - hidden when collapsed */}
              {isExpanded && messages.map((msg) => (
                <MessageCard
                  key={msg.actorId}
                  message={msg}
                  onMessageClick={onMessageClick}
                />
              ))}

              {/* Convergence result for revision phases */}
              {isExpanded && record.phase === 'revision' && record.convergence && (
                <ConvergenceCard convergence={record.convergence} />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Waiting state */}
      {phases.length === 0 && status === 'streaming' && (
        <div className="text-center text-text-tertiary py-8">
          <div className="animate-pulse">等待响应...</div>
        </div>
      )}

      {/* Jump to bottom button - only shows when user has scrolled up during streaming */}
      {status === 'streaming' && userHasScrolledUp && (
        <div className="sticky bottom-4 flex justify-center pointer-events-none">
          <button
            onClick={() => {
              setUserHasScrolledUp(false)
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
              }
            }}
            className="pointer-events-auto px-4 py-2 bg-accent-blue/90 text-white text-sm rounded-full shadow-lg hover:bg-accent-blue transition-colors"
          >
            ↓ 跳到最新
          </button>
        </div>
      )}

      {/* Consensus - rendered inside scrollable area */}
      {consensus && status === 'completed' && (
        <ConsensusView consensus={consensus} />
      )}
    </div>
  )
}