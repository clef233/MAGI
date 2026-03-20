'use client'

import { motion } from 'framer-motion'
import { Consensus } from '@/types'
import { Check, X, Lightbulb } from 'lucide-react'
import MarkdownBlock from './MarkdownBlock'

interface ConsensusViewProps {
  consensus: Consensus
}

export default function ConsensusView({ consensus }: ConsensusViewProps) {
  const confidencePercent = consensus.confidence !== null && consensus.confidence !== undefined
    ? Math.round(consensus.confidence * 100)
    : null

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
        {/* Summary */}
        <div>
          <h4 className="text-text-secondary text-sm mb-2">Summary</h4>
          <MarkdownBlock content={consensus.summary} />
        </div>

        {/* Agreements */}
        {consensus.agreements.length > 0 && (
          <div>
            <h4 className="text-text-secondary text-sm mb-2 flex items-center gap-2">
              <Check className="w-4 h-4 text-accent-green" />
              Agreements
            </h4>
            <ul className="space-y-2">
              {consensus.agreements.map((agreement, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent-green mt-1">•</span>
                  <MarkdownBlock content={agreement} className="flex-1" />
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
              Disagreements
            </h4>
            <ul className="space-y-2">
              {consensus.disagreements.map((disagreement, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent-orange mt-1">•</span>
                  <MarkdownBlock content={disagreement} className="flex-1" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendation */}
        {consensus.recommendation && (
          <div className="bg-bg-tertiary rounded-xl p-4">
            <h4 className="text-text-secondary text-sm mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-accent-blue" />
              Recommendation
            </h4>
            <MarkdownBlock content={consensus.recommendation} />
          </div>
        )}
      </div>
    </motion.div>
  )
}