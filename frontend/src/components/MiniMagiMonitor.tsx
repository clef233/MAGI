'use client'

import { useMemo } from 'react'
import { Actor, LivePhaseRecord } from '@/types'

// Phase labels and explanations
const phaseInfo: Record<string, { label: string; explanation: string }> = {
  connecting: {
    label: '提訴受理',
    explanation: '系统正在初始化本次评审流程',
  },
  initial: {
    label: '初始回答中',
    explanation: '每个模型先独立回答问题',
  },
  review: {
    label: '交叉互评中',
    explanation: '模型之间正在指出彼此的盲点与漏洞',
  },
  revision: {
    label: '修订整合中',
    explanation: '模型正在根据批评修正观点',
  },
  semantic_pending: {
    label: '语义图谱构建中',
    explanation: '系统正在提炼核心共识与分歧维度',
  },
  final_answer: {
    label: '最终回答生成中',
    explanation: '总结模型正在整合多方观点',
  },
  summary: {
    label: '共识裁决中',
    explanation: '系统正在生成结构化共识报告',
  },
  completed: {
    label: '决议完成',
    explanation: '本次互评已完成',
  },
  error: {
    label: '系统异常',
    explanation: '本次流程发生错误',
  },
}

type NodeState = 'idle' | 'thinking' | 'done' | 'error' | 'judge_active'

interface MiniMagiMonitorProps {
  status: 'idle' | 'connecting' | 'streaming' | 'completed' | 'error'
  currentPhase: string
  currentPhaseRecord: LivePhaseRecord | null
  phaseHistory: LivePhaseRecord[]
  actors: Actor[]
  judgeActor?: Actor
  semanticComparisons?: Map<string, unknown[]>
}

// Derive node state from real data
function getNodeState(
  actorId: string,
  phaseRecord: LivePhaseRecord | null,
  isJudge: boolean,
  currentPhase: string,
  status: string
): NodeState {
  // If error state
  if (status === 'error') {
    return 'error'
  }

  // If completed
  if (status === 'completed') {
    return 'done'
  }

  // If connecting
  if (status === 'connecting') {
    return 'idle'
  }

  // If not streaming or no phase record
  if (status !== 'streaming' || !phaseRecord) {
    return 'idle'
  }

  // For judge in final_answer or summary phase
  if (isJudge && (currentPhase === 'final_answer' || currentPhase === 'summary')) {
    const judgeMessage = phaseRecord.messages[actorId]
    if (judgeMessage) {
      return judgeMessage.status === 'streaming' ? 'judge_active' : 'done'
    }
    // Judge hasn't started yet but we're in its phase
    return 'judge_active'
  }

  // For non-judge actors
  const message = phaseRecord.messages[actorId]
  if (!message) {
    return 'idle'
  }

  return message.status === 'streaming' ? 'thinking' : 'done'
}

export default function MiniMagiMonitor({
  status,
  currentPhase,
  currentPhaseRecord,
  phaseHistory,
  actors,
  judgeActor,
}: MiniMagiMonitorProps) {
  // Get non-judge actors
  const debateActors = useMemo(() => {
    return actors.filter(a => !a.is_meta_judge)
  }, [actors])

  // Determine current phase info
  const phaseData = useMemo(() => {
    // Check if we should show semantic pending state
    // This happens when:
    // 1. Current phase is initial or revision
    // 2. Phase has ended (no actors streaming)
    // 3. No semantic data yet
    // 4. Status is still streaming

    const isWaitingForSemantic =
      status === 'streaming' &&
      ['initial', 'revision'].includes(currentPhase) &&
      currentPhaseRecord &&
      Object.values(currentPhaseRecord.messages).every(m => m.status === 'done')

    if (isWaitingForSemantic) {
      return phaseInfo['semantic_pending']
    }

    if (status === 'connecting') {
      return phaseInfo['connecting']
    }

    if (status === 'error') {
      return phaseInfo['error']
    }

    if (status === 'completed') {
      return phaseInfo['completed']
    }

    return phaseInfo[currentPhase] || { label: currentPhase, explanation: '' }
  }, [status, currentPhase, currentPhaseRecord])

  // Get actor names for display
  const actorA = debateActors[0]
  const actorB = debateActors[1]

  // Calculate node states
  const actorAState = useMemo(() => {
    if (!actorA) return 'idle'
    return getNodeState(actorA.id, currentPhaseRecord, false, currentPhase, status)
  }, [actorA, currentPhaseRecord, currentPhase, status])

  const actorBState = useMemo(() => {
    if (!actorB) return 'idle'
    return getNodeState(actorB.id, currentPhaseRecord, false, currentPhase, status)
  }, [actorB, currentPhaseRecord, currentPhase, status])

  const judgeState = useMemo(() => {
    if (!judgeActor) return 'idle'
    return getNodeState(judgeActor.id, currentPhaseRecord, true, currentPhase, status)
  }, [judgeActor, currentPhaseRecord, currentPhase, status])

  // Count completed actors in current phase
  const completedCount = useMemo(() => {
    if (!currentPhaseRecord) return 0
    return Object.values(currentPhaseRecord.messages).filter(m => m.status === 'done').length
  }, [currentPhaseRecord])

  const totalActors = useMemo(() => {
    if (!currentPhaseRecord) return 0
    return Object.keys(currentPhaseRecord.messages).length
  }, [currentPhaseRecord])

  return (
    <div className="w-full bg-bg-secondary border-b border-border shrink-0">
      <style jsx>{`
        .monitor-svg {
          font-family: 'Noto Serif JP', serif;
        }
        .monitor-svg text {
          font-weight: 900;
          user-select: none;
        }
        .node-stroke {
          fill: transparent;
          stroke: var(--c-orange, #f26600);
          stroke-width: 3;
          stroke-linejoin: miter;
        }
        @keyframes pulse-blue {
          0%, 100% { fill: rgba(84, 165, 217, 0.3); }
          50% { fill: rgba(84, 165, 217, 0.6); }
        }
        @keyframes pulse-purple {
          0%, 100% { fill: rgba(147, 51, 234, 0.3); }
          50% { fill: rgba(147, 51, 234, 0.6); }
        }
        .state-thinking .node-fill {
          fill: rgba(84, 165, 217, 0.5);
          animation: pulse-blue 1.5s ease-in-out infinite;
        }
        .state-thinking .node-text {
          fill: #0a1f2e;
        }
        .state-done .node-fill {
          fill: rgba(103, 255, 140, 0.5);
        }
        .state-done .node-text {
          fill: #0a1f2e;
        }
        .state-error .node-fill {
          fill: rgba(227, 0, 0, 0.5);
        }
        .state-error .node-text {
          fill: #0a1f2e;
        }
        .state-judge_active .node-fill {
          fill: rgba(147, 51, 234, 0.5);
          animation: pulse-purple 1.5s ease-in-out infinite;
        }
        .state-judge_active .node-text {
          fill: #0a1f2e;
        }
        @keyframes flash-status {
          0%, 49.9% { fill: #fec200; stroke: #fec200; }
          50%, 100% { fill: rgba(254, 194, 0, 0.3); stroke: rgba(254, 194, 0, 0.3); }
        }
        .status-active rect {
          animation: flash-status 1s steps(1, end) infinite;
        }
        .status-active text {
          animation: flash-status 1s steps(1, end) infinite;
          stroke: none;
        }
      `}</style>

      {/* Header with phase label */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs text-accent-orange font-medium tracking-wider">MAGI</span>
        <span className="text-xs text-text-secondary">{phaseData.label}</span>
      </div>

      {/* SVG Monitor */}
      <div className="px-2 py-2">
        <svg
          className="monitor-svg w-full"
          viewBox="0 0 300 140"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Connection lines */}
          <g stroke="#f26600" strokeWidth="4" opacity="0.6">
            <line x1="150" y1="85" x2="185" y2="110" />
            <line x1="150" y1="85" x2="115" y2="110" />
          </g>

          {/* Center MAGI label */}
          <text x="150" y="65" textAnchor="middle" fill="#f26600" fontSize="14" letterSpacing="0.15em">
            MAGI
          </text>

          {/* Judge node (top) */}
          <g className={`state-${judgeState}`} transform="translate(100, 10)">
            <polygon
              className="node-fill"
              points="50,0 100,0 100,35 85,50 65,50 50,35"
              fill="transparent"
            />
            <polygon
              className="node-stroke"
              points="50,0 100,0 100,35 85,50 65,50 50,35"
            />
            <text
              x="75"
              y="30"
              textAnchor="middle"
              className="node-text"
              fontSize="10"
              fill="transparent"
            >
              {judgeActor ? judgeActor.name.slice(0, 6).toUpperCase() : 'JUDGE'}
            </text>
          </g>

          {/* Actor A node (bottom left) */}
          <g className={`state-${actorAState}`} transform="translate(20, 85)">
            <polygon
              className="node-fill"
              points="0,0 80,0 80,30 70,45 10,45 0,30"
              fill="transparent"
            />
            <polygon
              className="node-stroke"
              points="0,0 80,0 80,30 70,45 10,45 0,30"
            />
            <text
              x="40"
              y="28"
              textAnchor="middle"
              className="node-text"
              fontSize="9"
              fill="transparent"
            >
              {actorA ? actorA.name.slice(0, 8).toUpperCase() : 'ACTOR A'}
            </text>
          </g>

          {/* Actor B node (bottom right) */}
          <g className={`state-${actorBState}`} transform="translate(200, 85)">
            <polygon
              className="node-fill"
              points="0,0 80,0 80,30 70,45 10,45 0,30"
              fill="transparent"
            />
            <polygon
              className="node-stroke"
              points="0,0 80,0 80,30 70,45 10,45 0,30"
            />
            <text
              x="40"
              y="28"
              textAnchor="middle"
              className="node-text"
              fontSize="9"
              fill="transparent"
            >
              {actorB ? actorB.name.slice(0, 8).toUpperCase() : 'ACTOR B'}
            </text>
          </g>

          {/* Status box */}
          <g
            className={`status-active`}
            transform="translate(190, 10)"
            style={{ opacity: status === 'streaming' || status === 'connecting' ? 1 : 0.7 }}
          >
            <rect
              x="0"
              y="0"
              width="100"
              height="28"
              strokeWidth="2"
              fill="none"
              stroke="#fec200"
            />
            <text
              x="50"
              y="18"
              fontSize="11"
              textAnchor="middle"
              fill="#fec200"
              letterSpacing="0.05em"
            >
              {status === 'completed' ? '完了' : status === 'error' ? '異常' : '処理中'}
            </text>
          </g>
        </svg>
      </div>

      {/* Phase explanation */}
      <div className="px-3 pb-2">
        <p className="text-xs text-text-tertiary text-center">{phaseData.explanation}</p>
        {status === 'streaming' && totalActors > 0 && (
          <p className="text-xs text-text-tertiary text-center mt-1">
            {completedCount}/{totalActors} 模型完成
          </p>
        )}
      </div>
    </div>
  )
}