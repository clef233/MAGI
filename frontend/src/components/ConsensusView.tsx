'use client'

import { motion } from 'framer-motion'
import { Consensus } from '@/types'
import { Check, X, Lightbulb, HelpCircle } from 'lucide-react'
import MarkdownBlock from './MarkdownBlock'

/**
 * Safely convert a value to string for rendering.
 * Handles cases where LLM returns structured objects instead of plain strings.
 */
function safeString(val: unknown): string {
  if (typeof val === 'string') return val
  if (val && typeof val === 'object') {
    // Handle dict-like objects from malformed LLM output
    const values = Object.values(val).filter(Boolean)
    if (values.length > 0) return values.join(' — ')
    return JSON.stringify(val)
  }
  return String(val ?? '')
}

interface ConsensusViewProps {
  consensus: Consensus
}

export default function ConsensusView({ consensus }: ConsensusViewProps) {
  const confidencePercent = consensus.confidence !== null && consensus.confidence !== undefined
    ? Math.round(consensus.confidence * 100)
    : null

  // Only show summary if it's a meaningful standalone text (not just a copy of recommendation)
  const showSummary = consensus.summary
    && consensus.summary.length > 0
    && consensus.summary.length < 300
    && consensus.summary !== consensus.recommendation

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 bg-bg-secondary border border-accent-purple/30 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 bg-accent-purple/10 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-medium text-accent-purple">共识裁决</h3>
        <div className="flex items-center gap-2">
          {confidencePercent !== null ? (
            <>
              <div className="w-24 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidencePercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-accent-green"
                />
              </div>
              <span className="text-sm text-text-secondary">{confidencePercent}%</span>
            </>
          ) : (
            <span className="text-sm text-text-tertiary">置信度暂不可用</span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Recommendation - always show if present */}
        {consensus.recommendation && (
          <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-4">
            <h4 className="text-text-secondary text-sm mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-accent-blue" />
              核心建议
            </h4>
            <MarkdownBlock content={consensus.recommendation} />
          </div>
        )}

        {/* Summary - only if it's a meaningful separate text */}
        {showSummary && (
          <div>
            <h4 className="text-text-secondary text-sm mb-2">概要</h4>
            <MarkdownBlock content={consensus.summary} />
          </div>
        )}

        {/* Agreements */}
        {consensus.agreements.length > 0 && (
          <div>
            <h4 className="text-text-secondary text-sm mb-2 flex items-center gap-2">
              <Check className="w-4 h-4 text-accent-green" />
              共识观点
            </h4>
            <ul className="space-y-2">
              {consensus.agreements.map((agreement, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent-green mt-1">•</span>
                  <MarkdownBlock content={safeString(agreement)} className="flex-1" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disagreements */}
        {consensus.disagreements.length > 0 && (
          <div>
            <h4 className="text-text-secondary text-sm mb-2 flex items-center gap-2">
              <X className="w-4 h-4 text-accent-orange" />
              仍存分歧
            </h4>
            <ul className="space-y-2">
              {consensus.disagreements.map((disagreement, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent-orange mt-1">•</span>
                  <MarkdownBlock content={safeString(disagreement)} className="flex-1" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Uncertainties - new section */}
        {consensus.key_uncertainties && consensus.key_uncertainties.length > 0 && (
          <div>
            <h4 className="text-text-secondary text-sm mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-accent-purple" />
              关键不确定性
            </h4>
            <ul className="space-y-2">
              {consensus.key_uncertainties.map((uncertainty, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent-purple mt-1">•</span>
                  <MarkdownBlock content={safeString(uncertainty)} className="flex-1" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  )
}