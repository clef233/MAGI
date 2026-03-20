'use client'

import { motion } from 'framer-motion'
import { Actor, SessionStatus } from '@/types'

interface DebateViewProps {
  actors: Actor[]
  judgeActor?: Actor
  streamingContent: Map<string, string>
  currentRound: number
  currentPhase: string
  status: SessionStatus | 'idle' | 'connecting' | 'streaming' | 'completed' | 'error'
}

export default function DebateView({
  actors,
  judgeActor,
  streamingContent,
  currentRound,
  currentPhase,
  status,
}: DebateViewProps) {
  const phaseLabels: Record<string, string> = {
    initial: '初始回答',
    review: '交叉评审',
    revision: '修正回答',
    judging: '共识裁决',
  }

  return (
    <div className="space-y-6">
      {/* Round indicator */}
      {currentRound > 0 && (
        <div className="flex items-center gap-4 mb-6">
          <div className="text-text-secondary text-sm">
            Round {currentRound}
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className="text-text-tertiary text-sm">
            {phaseLabels[currentPhase] || currentPhase}
          </div>
        </div>
      )}

      {/* Actor messages */}
      {currentPhase !== 'judging' ? (
        <div className="grid gap-4">
          {actors.map((actor) => (
            <motion.div
              key={actor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-secondary border border-border rounded-2xl overflow-hidden"
            >
              {/* Header */}
              <div
                className="px-4 py-3 flex items-center gap-3 border-b border-border"
                style={{
                  backgroundColor: `${actor.display_color}15`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: actor.display_color }}
                />
                <span className="font-medium">{actor.name}</span>
                {streamingContent.has(actor.id) && (
                  <span className="text-xs text-accent-blue animate-pulse">streaming...</span>
                )}
              </div>

              {/* Content */}
              <div className="px-4 py-4">
                {streamingContent.has(actor.id) ? (
                  <div className="text-text-primary whitespace-pre-wrap">
                    {streamingContent.get(actor.id)}
                    <span className="inline-block w-2 h-4 bg-text-primary animate-pulse ml-1" />
                  </div>
                ) : (
                  <div className="text-text-tertiary">等待响应...</div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Judge view */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-secondary border border-accent-purple/30 rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3 border-b border-border bg-accent-purple/10">
            <div className="w-2 h-2 rounded-full bg-accent-purple" />
            <span className="font-medium">{judgeActor?.name || 'Meta Judge'}</span>
            <span className="text-xs text-accent-purple">共识裁决中</span>
          </div>

          {/* Content */}
          <div className="px-4 py-4">
            {streamingContent.has('judge') ? (
              <div className="text-text-primary whitespace-pre-wrap">
                {streamingContent.get('judge')}
                <span className="inline-block w-2 h-4 bg-text-primary animate-pulse ml-1" />
              </div>
            ) : (
              <div className="text-text-tertiary">分析辩论内容...</div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}