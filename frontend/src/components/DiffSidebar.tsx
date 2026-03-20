'use client'

import { useMemo } from 'react'
import { Actor, LivePhaseRecord, LivePhaseType } from '@/types'
import { computeDiff, computeDiffStats, canShowDiff, DiffLine } from '@/lib/reviewDiff'

interface DiffSidebarProps {
  actors: Actor[]
  phaseHistory: LivePhaseRecord[]
  selectedDiffPhaseId: string | null
  onSelectDiffPhase: (phaseId: string | null) => void
  selectedBaseId: string | null
  selectedCompareId: string | null
  onSelectBase: (id: string) => void
  onSelectCompare: (id: string) => void
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

export default function DiffSidebar({
  actors,
  phaseHistory,
  selectedDiffPhaseId,
  onSelectDiffPhase,
  selectedBaseId,
  selectedCompareId,
  onSelectBase,
  onSelectCompare,
}: DiffSidebarProps) {
  // Get comparable phases (phases with at least 2 actors with content)
  const comparablePhases = useMemo(() => {
    return phaseHistory.filter((record) => {
      // Only initial, review, revision phases are comparable
      if (!['initial', 'review', 'revision'].includes(record.phase)) {
        return false
      }
      const actorIds = Object.keys(record.messages)
      return actorIds.length >= 2
    })
  }, [phaseHistory])

  // Get the selected phase record
  const selectedPhase = useMemo(() => {
    if (!selectedDiffPhaseId) {
      // Default to the most recent comparable phase
      return comparablePhases[comparablePhases.length - 1] || null
    }
    return phaseHistory.find((r) => r.id === selectedDiffPhaseId) || null
  }, [phaseHistory, selectedDiffPhaseId, comparablePhases])

  // Get content for selected actors from the selected phase
  const baseContent = useMemo(() => {
    if (!selectedPhase || !selectedBaseId) return null
    return selectedPhase.messages[selectedBaseId]?.content || null
  }, [selectedPhase, selectedBaseId])

  const compareContent = useMemo(() => {
    if (!selectedPhase || !selectedCompareId) return null
    return selectedPhase.messages[selectedCompareId]?.content || null
  }, [selectedPhase, selectedCompareId])

  // Check if streaming
  const isBaseStreaming = useMemo(() => {
    if (!selectedPhase || !selectedBaseId) return false
    return selectedPhase.messages[selectedBaseId]?.status === 'streaming'
  }, [selectedPhase, selectedBaseId])

  const isCompareStreaming = useMemo(() => {
    if (!selectedPhase || !selectedCompareId) return false
    return selectedPhase.messages[selectedCompareId]?.status === 'streaming'
  }, [selectedPhase, selectedCompareId])

  // Compute diff
  const diffResult = useMemo(() => {
    if (!canShowDiff(baseContent, compareContent)) return null
    return computeDiff(baseContent!, compareContent!)
  }, [baseContent, compareContent])

  // Compute stats
  const stats = useMemo(() => {
    if (!diffResult) return null
    return computeDiffStats(diffResult)
  }, [diffResult])

  // Check if selected phase is comparable
  const isPhaseComparable = selectedPhase && ['initial', 'review', 'revision'].includes(selectedPhase.phase)

  return (
    <div className="h-full flex flex-col bg-bg-secondary overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-text-secondary text-sm font-medium">差异对比</h3>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-b border-border space-y-3 shrink-0">
        {/* Phase selector */}
        <div>
          <label className="text-text-tertiary text-xs block mb-1">选择阶段</label>
          <select
            value={selectedDiffPhaseId || ''}
            onChange={(e) => onSelectDiffPhase(e.target.value || null)}
            className="w-full px-2 py-1.5 bg-bg-tertiary border border-border rounded-lg text-xs focus:outline-none focus:border-accent-blue"
          >
            {comparablePhases.length === 0 ? (
              <option value="">暂无可比较阶段</option>
            ) : (
              comparablePhases.map((record) => (
                <option key={record.id} value={record.id}>
                  第 {record.step} 步 · {getPhaseLabel(record)}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Actor selectors */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-text-tertiary text-xs block mb-1">Base</label>
            <select
              value={selectedBaseId || ''}
              onChange={(e) => onSelectBase(e.target.value)}
              className="w-full px-2 py-1.5 bg-bg-tertiary border border-border rounded-lg text-xs focus:outline-none focus:border-accent-blue"
            >
              <option value="">选择...</option>
              {actors.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-text-tertiary text-xs block mb-1">Compare</label>
            <select
              value={selectedCompareId || ''}
              onChange={(e) => onSelectCompare(e.target.value)}
              className="w-full px-2 py-1.5 bg-bg-tertiary border border-border rounded-lg text-xs focus:outline-none focus:border-accent-blue"
            >
              <option value="">选择...</option>
              {actors.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-4 text-xs shrink-0">
          <span className="text-accent-green">+{stats.additions}</span>
          <span className="text-accent-red">-{stats.removals}</span>
          <span className="text-text-tertiary">~{stats.unchanged}</span>
        </div>
      )}

      {/* Diff content - scrollable */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {!selectedBaseId || !selectedCompareId ? (
          <div className="text-text-tertiary text-xs text-center py-8">
            选择两个 Actor 进行比较
          </div>
        ) : !selectedPhase ? (
          <div className="text-text-tertiary text-xs text-center py-8">
            暂无可比较的阶段
          </div>
        ) : !isPhaseComparable ? (
          <div className="text-text-tertiary text-xs text-center py-8">
            该阶段只有单模型输出，不适合双向 diff
            <div className="mt-2">
              请选择初始回答、互评或修订阶段
            </div>
          </div>
        ) : !baseContent || !compareContent ? (
          <div className="text-text-tertiary text-xs text-center py-8">
            选中的 Actor 在该阶段暂无内容
          </div>
        ) : isBaseStreaming || isCompareStreaming ? (
          <div className="space-y-3">
            {/* Show partial diff while streaming */}
            <div className="text-text-tertiary text-xs text-center">
              正在生成内容...
            </div>
            {diffResult && diffResult.length > 0 && (
              <div className="font-mono text-xs space-y-0.5">
                {diffResult.slice(0, 20).map((item, idx) => (
                  <DiffLineComponent key={idx} item={item} />
                ))}
                {diffResult.length > 20 && (
                  <div className="text-text-tertiary text-center">...</div>
                )}
              </div>
            )}
          </div>
        ) : diffResult && diffResult.length > 0 ? (
          <div className="font-mono text-xs space-y-0.5">
            {diffResult.map((item, idx) => (
              <DiffLineComponent key={idx} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-accent-green text-xs text-center py-8">
            内容一致，无差异
          </div>
        )}
      </div>
    </div>
  )
}

function DiffLineComponent({ item }: { item: DiffLine }) {
  const bgClass =
    item.type === 'add' ? 'bg-accent-green/10' :
    item.type === 'remove' ? 'bg-accent-red/10' :
    ''

  const textClass =
    item.type === 'add' ? 'text-accent-green' :
    item.type === 'remove' ? 'text-accent-red' :
    'text-text-tertiary'

  const prefix =
    item.type === 'add' ? '+' :
    item.type === 'remove' ? '-' :
    ' '

  return (
    <div className={`${bgClass} ${textClass} px-2 py-0.5 rounded flex`}>
      <span className="w-3 shrink-0">{prefix}</span>
      <span className="break-all">{item.text}</span>
    </div>
  )
}