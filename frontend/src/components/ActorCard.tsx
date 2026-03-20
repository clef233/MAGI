'use client'

import { motion } from 'framer-motion'
import { Check, Crown } from 'lucide-react'
import { Actor } from '@/types'

interface ActorCardProps {
  actor: Actor
  selected: boolean
  onSelect: () => void
  showJudgeBadge?: boolean
}

export default function ActorCard({ actor, selected, onSelect, showJudgeBadge }: ActorCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`relative h-20 px-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-accent-blue bg-accent-blue/10'
          : 'border-border bg-bg-secondary hover:border-text-tertiary'
      }`}
    >
      {/* Color indicator */}
      <div
        className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
        style={{ backgroundColor: actor.display_color }}
      />

      {/* Content */}
      <div className="pl-4 flex flex-col items-start justify-center h-full">
        <div className="flex items-center gap-2">
          <span className="text-lg">{actor.icon}</span>
          <span className="font-medium">{actor.name}</span>
          {showJudgeBadge && actor.is_meta_judge && (
            <Crown className="w-4 h-4 text-accent-purple" />
          )}
        </div>
        <span className="text-sm text-text-tertiary">{actor.model}</span>
      </div>

      {/* Selected indicator */}
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-accent-blue rounded-full flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-white" />
        </motion.div>
      )}
    </motion.button>
  )
}