'use client'

import { useState, useEffect, useMemo } from 'react'

interface ProgressProps {
  startedAt: number | null
  completedSteps: number
  estimatedTotalSteps: number
  currentStepProgress: number
  currentPhase: string
  status: string
}

const phaseInfo: Record<string, { label: string; explanation: string }> = {
  initial: {
    label: '初始回答',
    explanation: '每个模型先独立回答问题',
  },
  review: {
    label: '互评',
    explanation: '模型之间正在指出彼此的盲点与漏洞',
  },
  revision: {
    label: '修订',
    explanation: '模型正在根据批评修正观点',
  },
  final_answer: {
    label: '最终回答',
    explanation: '总结模型正在整合多方观点，输出面向用户的最终回答',
  },
  summary: {
    label: '总结',
    explanation: '系统正在生成结构化共识报告',
  },
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  if (totalSeconds < 0) return '0秒'
  if (totalSeconds < 60) return `${totalSeconds}秒`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes >= 60) {
    // 超过1小时说明计算有误，显示上限
    return '>60分钟'
  }
  return `${minutes}分${seconds}秒`
}

function formatETA(remainingMs: number): string {
  if (remainingMs <= 0) return '即将完成'
  // ETA 上限 30 分钟，超过说明估算不可靠
  if (remainingMs > 30 * 60 * 1000) return '预计较长'
  return formatDuration(remainingMs)
}

export default function ProgressBar({
  startedAt,
  completedSteps,
  estimatedTotalSteps,
  currentStepProgress,
  currentPhase,
  status,
}: ProgressProps) {
  // 每秒刷新一次，确保 elapsed 实时更新
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (status !== 'streaming' || !startedAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [status, startedAt])

  const progress = useMemo(() => {
    if (!startedAt) return { percent: 0, elapsed: 0, eta: 0 }

    const elapsed = now - startedAt

    // 总进度 = 已完成步数 + 当前步进度（0~1）
    const totalProgress = completedSteps + currentStepProgress
    const overallRatio = estimatedTotalSteps > 0
      ? totalProgress / estimatedTotalSteps
      : 0
    const percent = Math.min(99, Math.round(overallRatio * 100))

    // ETA 计算：只在至少完成 1 个完整步骤后才估算
    // 避免早期分母过小导致 ETA 爆炸
    let eta = 0
    if (completedSteps >= 1) {
      const avgTimePerCompletedStep = elapsed / completedSteps
      const remainingSteps = Math.max(0, estimatedTotalSteps - totalProgress)
      eta = remainingSteps * avgTimePerCompletedStep
      // 安全上限：不超过30分钟
      eta = Math.min(eta, 30 * 60 * 1000)
    }

    return { percent, elapsed, eta }
  }, [now, startedAt, completedSteps, estimatedTotalSteps, currentStepProgress])

  if (status === 'idle' || status === 'completed') return null

  const phaseData = phaseInfo[currentPhase] || { label: currentPhase, explanation: '' }

  return (
    <div className="flex items-center gap-4 text-sm">
      {/* Progress bar */}
      <div className="flex-1 max-w-xs">
        <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-blue rounded-full transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {/* Progress text */}
      <div className="flex items-center gap-3 text-text-secondary">
        <span className="text-xs">{progress.percent}%</span>
        <span className="text-xs">{phaseData.label}</span>
        <span className="text-xs text-text-tertiary">
          已用 {formatDuration(progress.elapsed)}
        </span>
        {progress.eta > 0 && status === 'streaming' && (
          <span className="text-xs text-text-tertiary">
            预计还需 {formatETA(progress.eta)}
          </span>
        )}
      </div>

      {/* Phase explanation */}
      {phaseData.explanation && (
        <span className="text-xs text-text-tertiary hidden lg:inline">
          {phaseData.explanation}
        </span>
      )}
    </div>
  )
}