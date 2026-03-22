'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TopicComparison, ActorPosition, LivePhaseRecord } from '@/types'

interface SemanticSidebarProps {
  phaseHistory: LivePhaseRecord[]
  semanticComparisons: Map<string, TopicComparison[]>
  selectedDiffPhaseId: string | null
  onSelectDiffPhase: (phaseId: string | null) => void
  selectedTopicId: string | null
  onSelectTopic: (topicId: string | null) => void
  onShowRawDiff?: () => void
  onSwitchToDiffTab?: () => void  // Callback to switch to diff tab
  status?: string
  currentPhase?: string
  currentPhaseRecord?: LivePhaseRecord | null
  semanticSkipped?: boolean
  semanticSkipReason?: string | null
}

const phaseLabels: Record<string, string> = {
  initial: '初始回答',
  review: '互评',
  revision: '修订',
  final_answer: '最终回答',
  summary: '总结',
}

function getPhaseLabel(record: LivePhaseRecord): string {
  const base = phaseLabels[record.phase] || record.phase
  if (record.cycle) {
    return `第 ${record.cycle} 轮 ${base}`
  }
  return base
}

function getDisagreementColor(score: number): string {
  if (score <= 0.3) return 'bg-green-500'
  if (score <= 0.6) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getDisagreementBorderColor(score: number): string {
  if (score <= 0.3) return 'border-green-400'
  if (score <= 0.6) return 'border-yellow-400'
  return 'border-red-400'
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'converged': return '已共识'
    case 'divergent': return '有分歧'
    default: return '部分一致'
  }
}

export default function SemanticSidebar({
  phaseHistory,
  semanticComparisons,
  selectedDiffPhaseId,
  onSelectDiffPhase,
  selectedTopicId,
  onSelectTopic,
  onShowRawDiff,
  onSwitchToDiffTab,
  status = 'idle',
  currentPhase = '',
  currentPhaseRecord = null,
  semanticSkipped = false,
  semanticSkipReason = null,
}: SemanticSidebarProps) {
  const [showRawDiff, setShowRawDiff] = useState(false)
  const [hasUserSelectedPhase, setHasUserSelectedPhase] = useState(false)
  const [hasUserSelectedTopic, setHasUserSelectedTopic] = useState(false)

  // Get comparable phases - phases that have semantic comparison data
  const comparablePhases = useMemo(() => {
    return phaseHistory.filter((record) => {
      // Only initial and revision phases have semantic comparisons
      if (!['initial', 'revision'].includes(record.phase)) {
        return false
      }
      // Check exact match first, then prefix match for cycle variants
      // This handles the case where hydrated records don't have cycle info
      // but live SSE events include cycle in the phase_id
      if (semanticComparisons.has(record.id)) return true
      // Check if any key starts with the base phase id (handles cycle mismatch)
      const baseId = `${record.step}:${record.phase}`
      for (const key of semanticComparisons.keys()) {
        if (key === baseId || key.startsWith(baseId + ':')) return true
      }
      return false
    })
  }, [phaseHistory, semanticComparisons])

  // Auto-select the most recent phase with semantic data (only if user hasn't selected)
  useEffect(() => {
    if (!hasUserSelectedPhase && comparablePhases.length > 0 && !selectedDiffPhaseId) {
      // Select the most recent phase with semantic data
      const lastPhase = comparablePhases[comparablePhases.length - 1]
      onSelectDiffPhase(lastPhase.id)
    }
  }, [comparablePhases, hasUserSelectedPhase, selectedDiffPhaseId, onSelectDiffPhase])

  // Get the selected phase comparisons
  const selectedComparisons = useMemo(() => {
    // Helper to find comparisons by phase_id with prefix matching
    const findComparisons = (phaseId: string): TopicComparison[] => {
      // Try exact match first
      if (semanticComparisons.has(phaseId)) {
        return semanticComparisons.get(phaseId) || []
      }
      // Try prefix match for cycle variants
      // e.g., "4:revision" matches "4:revision:1"
      const baseId = phaseId.split(':').slice(0, 2).join(':')
      for (const [key, value] of semanticComparisons.entries()) {
        if (key === baseId || key.startsWith(baseId + ':')) {
          return value
        }
      }
      return []
    }

    if (!selectedDiffPhaseId) {
      // Default to the most recent phase with comparisons
      for (let i = phaseHistory.length - 1; i >= 0; i--) {
        const record = phaseHistory[i]
        const comparisons = findComparisons(record.id)
        if (comparisons.length > 0) {
          return comparisons
        }
      }
      return []
    }

    // Use the phase_id (record.id) with prefix matching
    return findComparisons(selectedDiffPhaseId)
  }, [phaseHistory, selectedDiffPhaseId, semanticComparisons])

  // Auto-select the highest salience topic (only if user hasn't selected)
  useEffect(() => {
    if (!hasUserSelectedTopic && selectedComparisons.length > 0 && !selectedTopicId) {
      // Select the topic with highest salience
      const topTopic = selectedComparisons.reduce((prev, curr) =>
        curr.salience > prev.salience ? curr : prev
      )
      onSelectTopic(topTopic.topic_id)
    }
  }, [selectedComparisons, hasUserSelectedTopic, selectedTopicId, onSelectTopic])

  // Get selected topic
  const selectedTopic = useMemo(() => {
    if (!selectedTopicId || !selectedComparisons.length) return null
    return selectedComparisons.find((c) => c.topic_id === selectedTopicId) || null
  }, [selectedTopicId, selectedComparisons])

  // Calculate stats
  const stats = useMemo(() => {
    if (!selectedComparisons.length) return null

    const converged = selectedComparisons.filter((c) => c.status === 'converged').length
    const divergent = selectedComparisons.filter((c) => c.status === 'divergent').length
    const avgDisagreement = selectedComparisons.reduce((sum, c) => sum + c.disagreement_score, 0) / selectedComparisons.length

    return {
      total: selectedComparisons.length,
      converged,
      divergent,
      avgDisagreement,
    }
  }, [selectedComparisons])

  // Check if we're in a live session waiting for semantic data
  const isLiveWaiting = useMemo(() => {
    // Live session is streaming and current phase is one that should have semantic data
    const isRelevantPhase = ['initial', 'revision'].includes(currentPhase)
    const isStreaming = status === 'streaming'
    const hasPhaseData = currentPhaseRecord && Object.keys(currentPhaseRecord.messages).length > 0
    const allActorsDone = hasPhaseData && Object.values(currentPhaseRecord.messages).every(m => m.status === 'done')
    const noSemanticData = comparablePhases.length === 0 || !semanticComparisons.has(selectedDiffPhaseId || '')

    return isStreaming && isRelevantPhase && allActorsDone && noSemanticData
  }, [status, currentPhase, currentPhaseRecord, comparablePhases, semanticComparisons, selectedDiffPhaseId])

  // Check if this is a completed session with no semantic data
  const isCompletedNoData = useMemo(() => {
    return (status === 'completed' || status === 'idle') && comparablePhases.length === 0
  }, [status, comparablePhases])

  // Handle phase selection
  const handlePhaseSelect = (phaseId: string) => {
    setHasUserSelectedPhase(true)
    setHasUserSelectedTopic(false) // Reset topic selection when phase changes
    onSelectDiffPhase(phaseId || null)
  }

  // Handle topic selection
  const handleTopicSelect = (topicId: string | null) => {
    setHasUserSelectedTopic(true)
    onSelectTopic(topicId)
  }

  return (
    <div className="h-full flex flex-col bg-bg-secondary overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-text-secondary text-sm font-medium">语义分歧图谱</h3>
      </div>

      {/* Phase selector */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <label className="text-text-tertiary text-xs block mb-1">选择阶段</label>
        <select
          value={selectedDiffPhaseId || ''}
          onChange={(e) => handlePhaseSelect(e.target.value)}
          className="w-full px-2 py-1.5 bg-bg-tertiary border border-border rounded-lg text-xs focus:outline-none focus:border-accent-blue"
        >
          {comparablePhases.length === 0 ? (
            <option value="">暂无语义分析结果</option>
          ) : (
            comparablePhases.map((record) => (
              <option key={record.id} value={record.id}>
                第 {record.step} 步 · {getPhaseLabel(record)}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Stats */}
      {stats && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-4 text-xs shrink-0">
          <span className="text-accent-green">{stats.converged} 共识</span>
          <span className="text-accent-red">{stats.divergent} 分歧</span>
          <span className="text-text-tertiary">
            平均分歧度 {Math.round(stats.avgDisagreement * 100)}%
          </span>
        </div>
      )}

      {/* Topic list with labels - not just bubbles - scrollable */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {!selectedComparisons.length ? (
          <div className="text-text-tertiary text-xs text-center py-8 space-y-4">
            {semanticSkipped ? (
              <>
                <div className="text-accent-orange text-sm">⚠️ 语义分析已跳过</div>
                <div className="text-text-tertiary text-xs mt-2">
                  {semanticSkipReason || '语义分析模型未配置'}
                </div>
                <div className="mt-4 p-3 bg-accent-orange/10 border border-accent-orange/20 rounded-lg">
                  <p className="text-xs text-text-secondary">
                    请前往 <span className="text-accent-blue">设置 → 语义分析模型</span> 配置专用模型，
                    即可在下次互评中启用语义图谱功能。
                  </p>
                </div>
                {onSwitchToDiffTab && (
                  <button
                    onClick={onSwitchToDiffTab}
                    className="px-4 py-2 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors mt-4"
                  >
                    查看原文差异对比
                  </button>
                )}
              </>
            ) : isLiveWaiting ? (
              <>
                {/* Live waiting state - show skeleton */}
                <div className="text-text-secondary">语义图谱构建中...</div>
                <div className="text-text-tertiary text-xs">系统会在本轮回答完成后提炼共识与分歧维度</div>

                {/* Skeleton placeholder */}
                <div className="space-y-2 mt-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-10 bg-bg-tertiary rounded-lg animate-pulse"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>

                {/* CTA to switch to diff */}
                {phaseHistory.some(r => ['initial', 'review', 'revision'].includes(r.phase) && Object.keys(r.messages).length >= 2) && onSwitchToDiffTab && (
                  <button
                    onClick={onSwitchToDiffTab}
                    className="px-4 py-2 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors mt-4"
                  >
                    先查看原文差异对比
                  </button>
                )}
              </>
            ) : isCompletedNoData ? (
              <>
                {/* Completed session with no data */}
                <div className="text-text-secondary">本次记录没有可用的语义图谱数据</div>
                <div className="text-text-tertiary text-xs">可能是会话未能正常完成</div>
                {onSwitchToDiffTab && (
                  <button
                    onClick={onSwitchToDiffTab}
                    className="px-4 py-2 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors mt-4"
                  >
                    查看原文差异对比
                  </button>
                )}
              </>
            ) : comparablePhases.length === 0 ? (
              <>
                {/* No comparable phases yet */}
                <div className="text-text-secondary">当前阶段的语义图谱尚未生成</div>
                <div className="text-text-tertiary text-xs">语义分析会在本轮回答完成后自动生成</div>
                {phaseHistory.some(r => ['initial', 'review', 'revision'].includes(r.phase) && Object.keys(r.messages).length >= 2) && onSwitchToDiffTab && (
                  <button
                    onClick={onSwitchToDiffTab}
                    className="px-4 py-2 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors mt-4"
                  >
                    查看原文差异对比
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Selected phase has no data */}
                <div>该阶段暂无语义分析结果</div>
                {onSwitchToDiffTab && (
                  <button
                    onClick={onSwitchToDiffTab}
                    className="px-4 py-2 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors"
                  >
                    查看原文差异对比
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Topic list with labels */}
            <div className="space-y-1">
              {selectedComparisons.map((comparison) => {
                const isSelected = selectedTopicId === comparison.topic_id

                return (
                  <motion.button
                    key={comparison.topic_id}
                    onClick={() => handleTopicSelect(isSelected ? null : comparison.topic_id)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg border transition-all duration-200
                      ${isSelected
                        ? 'bg-accent-blue/10 border-accent-blue'
                        : 'bg-bg-tertiary border-border hover:border-text-tertiary'
                      }
                    `}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-primary truncate">
                        {comparison.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${getDisagreementColor(comparison.disagreement_score)}`}
                        />
                        <span className={`text-xs ${
                          comparison.status === 'converged'
                            ? 'text-accent-green'
                            : comparison.status === 'divergent'
                            ? 'text-accent-red'
                            : 'text-accent-orange'
                        }`}>
                          {getStatusLabel(comparison.status)}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-text-tertiary pt-2 border-t border-border">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>共识</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>部分</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>分歧</span>
              </div>
            </div>

            {/* Topic detail */}
            <AnimatePresence mode="wait">
              {selectedTopic && (
                <motion.div
                  key={selectedTopic.topic_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-3 bg-bg-tertiary rounded-lg border border-border"
                >
                  {/* Topic header */}
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-text-primary font-medium">{selectedTopic.label}</h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        selectedTopic.status === 'converged'
                          ? 'bg-green-500/20 text-green-400'
                          : selectedTopic.status === 'divergent'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {getStatusLabel(selectedTopic.status)}
                    </span>
                  </div>

                  {/* Agreement summary */}
                  {selectedTopic.agreement_summary && (
                    <div className="mb-2">
                      <div className="text-xs text-accent-green mb-1">一致点</div>
                      <p className="text-xs text-text-secondary">
                        {selectedTopic.agreement_summary}
                      </p>
                    </div>
                  )}

                  {/* Disagreement summary */}
                  {selectedTopic.disagreement_summary && (
                    <div className="mb-3">
                      <div className="text-xs text-accent-red mb-1">分歧点</div>
                      <p className="text-xs text-text-secondary">
                        {selectedTopic.disagreement_summary}
                      </p>
                    </div>
                  )}

                  {/* Actor positions */}
                  <div className="space-y-2">
                    <div className="text-xs text-text-tertiary">各模型观点</div>
                    {selectedTopic.actor_positions.map((position, idx) => (
                      <ActorPositionCard key={idx} position={position} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Raw diff toggle */}
      {onShowRawDiff && (
        <div className="px-4 py-2 border-t border-border shrink-0">
          <button
            onClick={() => setShowRawDiff(!showRawDiff)}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {showRawDiff ? '隐藏原文对照' : '显示原文对照'}
          </button>
        </div>
      )}
    </div>
  )
}

function ActorPositionCard({ position }: { position: ActorPosition }) {
  return (
    <div className="p-2 bg-bg-secondary rounded border border-border">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-text-primary">
          {position.actor_name || 'Unknown'}
        </span>
        {position.stance_label && (
          <span className="text-xs text-text-tertiary px-1.5 py-0.5 bg-bg-tertiary rounded">
            {position.stance_label}
          </span>
        )}
      </div>
      {position.summary && (
        <p className="text-xs text-text-secondary">{position.summary}</p>
      )}
      {position.quotes && position.quotes.length > 0 && (
        <div className="mt-1 text-xs text-text-tertiary italic">
          "{position.quotes[0]}"
        </div>
      )}
    </div>
  )
}