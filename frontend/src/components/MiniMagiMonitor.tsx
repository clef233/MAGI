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
    label: '語義図譜構築中',
    explanation: '系统正在提炼核心共识与分歧维度',
  },
  final_answer: {
    label: '最終回答生成中',
    explanation: '总结模型正在整合多方观点',
  },
  summary: {
    label: '共識裁決中',
    explanation: '系统正在生成结构化共识报告',
  },
  completed: {
    label: '決議完了',
    explanation: '本次互评已完成',
  },
  error: {
    label: '系統異常',
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

function getNodeState(
  actorId: string,
  phaseRecord: LivePhaseRecord | null,
  isJudge: boolean,
  currentPhase: string,
  status: string
): NodeState {
  if (status === 'error') return 'error'
  if (status === 'completed') return 'done'
  if (status === 'connecting') return 'idle'
  if (status !== 'streaming' || !phaseRecord) return 'idle'

  if (isJudge && (currentPhase === 'final_answer' || currentPhase === 'summary')) {
    const judgeMessage = phaseRecord.messages[actorId]
    if (judgeMessage) {
      return judgeMessage.status === 'streaming' ? 'judge_active' : 'done'
    }
    return 'judge_active'
  }

  const message = phaseRecord.messages[actorId]
  if (!message) return 'idle'
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
  const debateActors = useMemo(() => {
    return actors.filter(a => !a.is_meta_judge)
  }, [actors])

  const phaseData = useMemo(() => {
    const isWaitingForSemantic =
      status === 'streaming' &&
      ['initial', 'revision'].includes(currentPhase) &&
      currentPhaseRecord &&
      Object.values(currentPhaseRecord.messages).every(m => m.status === 'done')

    if (isWaitingForSemantic) return phaseInfo['semantic_pending']
    if (status === 'connecting') return phaseInfo['connecting']
    if (status === 'error') return phaseInfo['error']
    if (status === 'completed') return phaseInfo['completed']
    return phaseInfo[currentPhase] || { label: currentPhase, explanation: '' }
  }, [status, currentPhase, currentPhaseRecord])

  // Support 2 or 3 actors
  const actorA = debateActors[0]
  const actorB = debateActors[1]
  const actorC = debateActors[2] || null // nullable third actor

  const judgeState = useMemo(() => {
    if (!judgeActor) return 'idle' as NodeState
    return getNodeState(judgeActor.id, currentPhaseRecord, true, currentPhase, status)
  }, [judgeActor, currentPhaseRecord, currentPhase, status])

  const actorAState = useMemo(() => {
    if (!actorA) return 'idle' as NodeState
    return getNodeState(actorA.id, currentPhaseRecord, false, currentPhase, status)
  }, [actorA, currentPhaseRecord, currentPhase, status])

  const actorBState = useMemo(() => {
    if (!actorB) return 'idle' as NodeState
    return getNodeState(actorB.id, currentPhaseRecord, false, currentPhase, status)
  }, [actorB, currentPhaseRecord, currentPhase, status])

  const actorCState = useMemo(() => {
    if (!actorC) return 'idle' as NodeState
    return getNodeState(actorC.id, currentPhaseRecord, false, currentPhase, status)
  }, [actorC, currentPhaseRecord, currentPhase, status])

  const completedCount = useMemo(() => {
    if (!currentPhaseRecord) return 0
    return Object.values(currentPhaseRecord.messages).filter(m => m.status === 'done').length
  }, [currentPhaseRecord])

  const totalActors = useMemo(() => {
    if (!currentPhaseRecord) return 0
    return Object.keys(currentPhaseRecord.messages).length
  }, [currentPhaseRecord])

  const isProcessing = status === 'streaming' || status === 'connecting'

  // Derive judge label, actor labels
  const judgeLabel = judgeActor ? judgeActor.name.slice(0, 10).toUpperCase() : 'JUDGE'
  const actorALabel = actorA ? actorA.name.slice(0, 10).toUpperCase() : 'ACTOR A'
  const actorBLabel = actorB ? actorB.name.slice(0, 10).toUpperCase() : 'ACTOR B'
  const actorCLabel = actorC ? actorC.name.slice(0, 10).toUpperCase() : ''

  // For 2 actors: classic MAGI triangle layout (judge top, A bottom-left, B bottom-right)
  // For 3 actors: diamond layout (judge top, A left, B right, C bottom)

  return (
    <div className="h-full flex flex-col bg-[#000000] overflow-hidden">
      {/* EVA font - loaded globally via globals.css, but ensure inline fallback */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@900&display=swap');
      `}</style>
      <style jsx>{`
        .magi-monitor-svg {
          font-family: 'Noto Serif JP', serif;
          filter: drop-shadow(0 0 2px rgba(242, 102, 0, 0.4));
        }
        .magi-monitor-svg text {
          font-weight: 900;
          user-select: none;
        }
        .node-stroke {
          fill: transparent;
          stroke: #f26600;
          stroke-width: 4;
          stroke-linejoin: miter;
        }
        .node-fill-base {
          fill: transparent;
        }
        .header-text {
          fill: #f26600;
          letter-spacing: 0.1em;
        }
        .magi-text {
          fill: #f26600;
          letter-spacing: 0.25em;
        }
        .node-text-base {
          fill: transparent;
          letter-spacing: 0.05em;
        }
        .green-line {
          stroke: #2b7a5f;
          stroke-width: 3;
        }

        /* --- State animations matching START.HTML exactly --- */
        @keyframes flash-fill-blue {
          0%, 49.9% { fill: #54a5d9; }
          50%, 100% { fill: transparent; }
        }
        @keyframes flash-text-dark {
          0%, 49.9% { fill: #0a1f2e; }
          50%, 100% { fill: transparent; }
        }
        @keyframes flash-fill-purple {
          0%, 49.9% { fill: #9333ea; }
          50%, 100% { fill: transparent; }
        }
        @keyframes flash-shingi {
          0%, 49.9% { fill: #fec200; stroke: #fec200; }
          50%, 100% { fill: rgba(254, 194, 0, 0.3); stroke: rgba(254, 194, 0, 0.3); }
        }

        .state-thinking .node-fill { animation: flash-fill-blue 0.4s steps(1, end) infinite; }
        .state-thinking .node-text { animation: flash-text-dark 0.4s steps(1, end) infinite; }

        .state-done .node-fill { fill: #67ff8c; }
        .state-done .node-text { fill: #0a1f2e; }

        .state-error .node-fill { fill: #e30000; }
        .state-error .node-text { fill: #0a1f2e; }

        .state-judge_active .node-fill { animation: flash-fill-purple 0.4s steps(1, end) infinite; }
        .state-judge_active .node-text { animation: flash-text-dark 0.4s steps(1, end) infinite; }

        .shingi-box { opacity: 0; }
        .shingi-box.active { opacity: 1; }
        .shingi-box.active rect { animation: flash-shingi 1s steps(1, end) infinite; }
        .shingi-box.active text { animation: flash-shingi 1s steps(1, end) infinite; stroke: none; }
      `}</style>

      {/* SVG Monitor - faithful reproduction of START.HTML layout */}
      <div className="flex-1 flex items-center justify-center p-2">
        <svg
          className="magi-monitor-svg w-full h-full"
          viewBox="0 0 960 540"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="mini-scanline" patternUnits="userSpaceOnUse" width="4" height="4">
              <line x1="0" y1="0" x2="4" y2="0" stroke="rgba(0,0,0,0.15)" strokeWidth="2" />
            </pattern>
          </defs>

          {/* Double border frame (from START.HTML) */}
          <rect x="20" y="20" width="920" height="500" stroke="#f26600" strokeWidth="1.5" fill="none" />
          <rect x="35" y="35" width="890" height="470" stroke="#f26600" strokeWidth="4" fill="none" />

          {/* Left header: 提訴 */}
          <g transform="translate(90, 80)">
            <line x1="0" y1="0" x2="200" y2="0" className="green-line" />
            <line x1="0" y1="8" x2="200" y2="8" className="green-line" />
            <text x="100" y="80" fontSize="70" textAnchor="middle" className="header-text">提訴</text>
            <line x1="0" y1="100" x2="200" y2="100" className="green-line" />
            <line x1="0" y1="108" x2="200" y2="108" className="green-line" />
          </g>

          {/* Right header: 決議 */}
          <g transform="translate(670, 80)">
            <line x1="0" y1="0" x2="200" y2="0" className="green-line" />
            <line x1="0" y1="8" x2="200" y2="8" className="green-line" />
            <text x="100" y="80" fontSize="70" textAnchor="middle" className="header-text">決議</text>
            <line x1="0" y1="100" x2="200" y2="100" className="green-line" />
            <line x1="0" y1="108" x2="200" y2="108" className="green-line" />
          </g>

          {/* 審議中 box (top right) */}
          <g
            className={`shingi-box${isProcessing ? ' active' : ''}`}
            transform="translate(710, 210)"
          >
            <rect x="0" y="0" width="120" height="40" strokeWidth="2" fill="none" />
            <text x="60" y="29" fontSize="25" textAnchor="middle" letterSpacing="0.1em">審議中</text>
          </g>

          {/* Connection lines between MAGI center and bottom nodes (thick, like START.HTML) */}
          {/* === Layout depends on number of debate actors === */}
          {!actorC ? (
            /* ===== 2-ACTOR MODE: Judge top, A bottom-left, B bottom-right ===== */
            <>
              <g stroke="#f26600" strokeWidth="15">
                <line x1="388" y1="258" x2="363" y2="338" />
                <line x1="573" y1="258" x2="598" y2="338" />
                <line x1="425" y1="430" x2="535" y2="430" />
              </g>

              <text x="480" y="350" textAnchor="middle" className="magi-text" fontSize="24">MAGI</text>

              {/* JUDGE NODE (top center hex) */}
              <g className={`state-${judgeState}`}>
                <polygon className="node-fill node-fill-base" points="355,70 605,70 605,225 540,290 420,290 355,225" />
                <polygon fill="url(#mini-scanline)" points="355,70 605,70 605,225 540,290 420,290 355,225" />
                <polygon className="node-stroke" points="355,70 605,70 605,225 540,290 420,290 355,225" />
                <text x="480" y="195" textAnchor="middle" className="node-text node-text-base" fontSize="28">{judgeLabel}</text>
              </g>

              {/* ACTOR A (bottom left trapezoid) */}
              <g className={`state-${actorAState}`}>
                <polygon className="node-fill node-fill-base" points="125,275 300,275 425,400 425,470 125,470" />
                <polygon fill="url(#mini-scanline)" points="125,275 300,275 425,400 425,470 125,470" />
                <polygon className="node-stroke" points="125,275 300,275 425,400 425,470 125,470" />
                <text x="250" y="395" textAnchor="middle" className="node-text node-text-base" fontSize="24">{actorALabel}</text>
              </g>

              {/* ACTOR B (bottom right trapezoid) */}
              <g className={`state-${actorBState}`}>
                <polygon className="node-fill node-fill-base" points="835,275 660,275 535,400 535,470 835,470" />
                <polygon fill="url(#mini-scanline)" points="835,275 660,275 535,400 535,470 835,470" />
                <polygon className="node-stroke" points="835,275 660,275 535,400 535,470 835,470" />
                <text x="685" y="395" textAnchor="middle" className="node-text node-text-base" fontSize="24">{actorBLabel}</text>
              </g>
            </>
          ) : (
            /* ===== 3-ACTOR MODE: Classic EVA triangle - A top, B bottom-left, C bottom-right, Judge label ===== */
            <>
              <g stroke="#f26600" strokeWidth="15">
                {/* A(top) to B(bottom-left) */}
                <line x1="388" y1="258" x2="363" y2="338" />
                {/* A(top) to C(bottom-right) */}
                <line x1="573" y1="258" x2="598" y2="338" />
                {/* B(bottom-left) to C(bottom-right) */}
                <line x1="425" y1="430" x2="535" y2="430" />
              </g>

              <text x="480" y="350" textAnchor="middle" className="magi-text" fontSize="24">MAGI</text>

              {/* ACTOR A (top center hex - BALTHASAR position) */}
              <g className={`state-${actorAState}`}>
                <polygon className="node-fill node-fill-base" points="355,70 605,70 605,225 540,290 420,290 355,225" />
                <polygon fill="url(#mini-scanline)" points="355,70 605,70 605,225 540,290 420,290 355,225" />
                <polygon className="node-stroke" points="355,70 605,70 605,225 540,290 420,290 355,225" />
                <text x="480" y="195" textAnchor="middle" className="node-text node-text-base" fontSize="28">{actorALabel}</text>
              </g>

              {/* ACTOR B (bottom left - CASPER position) */}
              <g className={`state-${actorBState}`}>
                <polygon className="node-fill node-fill-base" points="125,275 300,275 425,400 425,470 125,470" />
                <polygon fill="url(#mini-scanline)" points="125,275 300,275 425,400 425,470 125,470" />
                <polygon className="node-stroke" points="125,275 300,275 425,400 425,470 125,470" />
                <text x="250" y="395" textAnchor="middle" className="node-text node-text-base" fontSize="24">{actorBLabel}</text>
              </g>

              {/* ACTOR C (bottom right - MELCHIOR position) */}
              <g className={`state-${actorCState}`}>
                <polygon className="node-fill node-fill-base" points="835,275 660,275 535,400 535,470 835,470" />
                <polygon fill="url(#mini-scanline)" points="835,275 660,275 535,400 535,470 835,470" />
                <polygon className="node-stroke" points="835,275 660,275 535,400 535,470 835,470" />
                <text x="685" y="395" textAnchor="middle" className="node-text node-text-base" fontSize="24">{actorCLabel}</text>
              </g>

              {/* JUDGE label next to 審議中 box */}
              <g className={`state-${judgeState}`}>
                <rect x="710" y="255" width="120" height="30" rx="4" className="node-fill node-fill-base" />
                <rect x="710" y="255" width="120" height="30" rx="4" fill="none" stroke="#f26600" strokeWidth="2" />
                <text x="770" y="275" textAnchor="middle" className="node-text node-text-base" fontSize="14">{judgeLabel}</text>
              </g>
            </>
          )}
        </svg>
      </div>

      {/* Phase status bar */}
      <div className="px-3 py-2 border-t border-[#f26600]/30 text-center">
        <p className="text-xs text-[#f26600] font-medium tracking-wider">{phaseData.label}</p>
        <p className="text-xs text-[#86868B] mt-0.5">{phaseData.explanation}</p>
        {status === 'streaming' && totalActors > 0 && (
          <p className="text-xs text-[#56565A] mt-0.5">
            {completedCount}/{totalActors} 模型完成
          </p>
        )}
      </div>
    </div>
  )
}