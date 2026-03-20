'use client'

import { useMemo } from 'react'

interface ProgressProps {
  startedAt: number | null
  currentPhaseStartedAt: number | null
  completedSteps: number
  estimatedTotalSteps: number
  currentStepProgress: number
  currentPhase: string
  status: string
}

const phaseLabels: Record<string, string> = {
  initial: '初始回答',
  review: '互评',
  revision: '修订',
  final_answer: '最终回答',
  summary: '总结',
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}分${remainingSeconds}秒`
}

function formatETA(remainingMs: number): string {
  if (remainingMs < 0) return '即将完成'
  return formatDuration(remainingMs)
}

export default function ProgressBar({
  startedAt,
  currentPhaseStartedAt,
  completedSteps,
  estimatedTotalSteps,
  currentStepProgress,
  currentPhase,
  status,
}: ProgressProps) {
  const progress = useMemo(() => {
    if (!startedAt) return { percent: 0, elapsed: 0, eta: 0 }

    const now = Date.now()
    const elapsed = now - startedAt

    // Calculate overall progress
    const overallProgress = (completedSteps + currentStepProgress) / estimatedTotalSteps
    const percent = Math.min(100, Math.round(overallProgress * 100))

    // Calculate ETA based on average time per step
    let eta = 0
    if (completedSteps > 0 && overallProgress > 0) {
      const avgTimePerStep = elapsed / (completedSteps + currentStepProgress)
      const remainingSteps = estimatedTotalSteps - completedSteps - currentStepProgress
      eta = Math.max(0, remainingSteps * avgTimePerStep)
    }

    return { percent, elapsed, eta }
  }, [startedAt, completedSteps, estimatedTotalSteps, currentStepProgress])

  if (status === 'idle' || status === 'completed') return null

  const phaseLabel = phaseLabels[currentPhase] || currentPhase

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
        <span className="text-xs">{phaseLabel}</span>
        <span className="text-xs text-text-tertiary">
          {formatDuration(progress.elapsed)}
        </span>
        {progress.eta > 0 && status === 'streaming' && (
          <span className="text-xs text-text-tertiary">
            预计 {formatETA(progress.eta)}
          </span>
        )}
      </div>
    </div>
  )
}