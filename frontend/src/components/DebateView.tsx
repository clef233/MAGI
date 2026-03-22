'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Actor, LivePhaseRecord, TopicComparison, Consensus } from '@/types'
import ReviewChatView from './ReviewChatView'
import SemanticSidebar from './SemanticSidebar'
import DiffSidebar from './DiffSidebar'
import MiniMagiMonitor from './MiniMagiMonitor'

interface DebateViewProps {
  actors: Actor[]
  judgeActor?: Actor
  phaseHistory: LivePhaseRecord[]
  currentPhaseRecord?: LivePhaseRecord | null
  selectedDiffPhaseId: string | null
  onSelectDiffPhase: (phaseId: string | null) => void
  status: string
  currentPhase: string
  question?: string
  semanticComparisons?: Map<string, TopicComparison[]>
  selectedTopicId?: string | null
  onSelectTopic?: (topicId: string | null) => void
  consensus?: Consensus | null  // Add consensus prop
  semanticSkipped?: boolean
  semanticSkipReason?: string | null
}

type SidebarTab = 'monitor' | 'semantic' | 'diff'

export default function DebateView({
  actors,
  judgeActor,
  phaseHistory,
  currentPhaseRecord,
  selectedDiffPhaseId,
  onSelectDiffPhase,
  status,
  currentPhase,
  question = '',
  semanticComparisons = new Map(),
  selectedTopicId = null,
  onSelectTopic,
  consensus,
  semanticSkipped = false,
  semanticSkipReason = null,
}: DebateViewProps) {
  // Sidebar tab state
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('monitor')

  // Selected actors for diff comparison
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null)
  const [selectedCompareId, setSelectedCompareId] = useState<string | null>(null)

  // Get non-judge actors for the debate
  const debateActors = useMemo(() => {
    return actors.filter(a => !a.is_meta_judge)
  }, [actors])

  // All actors including judge for diff selector
  const allActorsForDiff = useMemo(() => {
    return actors
  }, [actors])

  // Set default selection when actors are available
  useEffect(() => {
    const nonJudgeActors = actors.filter(a => !a.is_meta_judge)
    if (nonJudgeActors.length >= 2 && !selectedBaseId && !selectedCompareId) {
      setSelectedBaseId(nonJudgeActors[0].id)
      setSelectedCompareId(nonJudgeActors[1].id)
    }
  }, [actors, selectedBaseId, selectedCompareId])

  // Check if semantic data is available
  const hasSemanticData = useMemo(() => {
    return semanticComparisons.size > 0
  }, [semanticComparisons])

  // Auto-switch to semantic tab when debate completes and semantic data is available
  useEffect(() => {
    if (status === 'completed' && hasSemanticData && sidebarTab === 'monitor') {
      setSidebarTab('semantic')
    }
  }, [status, hasSemanticData, sidebarTab])

  return (
    <div className="flex h-full min-h-0">
      {/* Main chat area (left ~2/3) - scrolls independently */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <ReviewChatView
          question={question}
          actors={debateActors}
          phaseHistory={phaseHistory}
          currentPhaseRecord={currentPhaseRecord}
          status={status}
          onMessageClick={(actorId) => {
            // On click, set this actor as base for diff
            setSelectedBaseId(actorId)
          }}
          consensus={consensus}
        />
      </div>

      {/* Right sidebar with tabs - scrolls independently */}
      <div className="w-80 lg:w-[420px] shrink-0 border-l border-border flex flex-col">
        {/* Tab header */}
        <div className="flex border-b border-border bg-bg-secondary shrink-0">
          <button
            onClick={() => setSidebarTab('monitor')}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              sidebarTab === 'monitor'
                ? 'text-accent-orange border-b-2 border-accent-orange'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            MAGI
          </button>
          <button
            onClick={() => setSidebarTab('semantic')}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              sidebarTab === 'semantic'
                ? 'text-accent-blue border-b-2 border-accent-blue'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            语义图谱
          </button>
          <button
            onClick={() => setSidebarTab('diff')}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              sidebarTab === 'diff'
                ? 'text-accent-blue border-b-2 border-accent-blue'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            原文 Diff
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {sidebarTab === 'monitor' ? (
            <MiniMagiMonitor
              status={status as 'idle' | 'connecting' | 'streaming' | 'completed' | 'error'}
              currentPhase={currentPhase}
              currentPhaseRecord={currentPhaseRecord || null}
              phaseHistory={phaseHistory}
              actors={actors}
              judgeActor={judgeActor}
              semanticComparisons={semanticComparisons}
            />
          ) : sidebarTab === 'semantic' ? (
            <SemanticSidebar
              phaseHistory={phaseHistory}
              semanticComparisons={semanticComparisons}
              selectedDiffPhaseId={selectedDiffPhaseId}
              onSelectDiffPhase={onSelectDiffPhase}
              selectedTopicId={selectedTopicId}
              onSelectTopic={onSelectTopic || (() => {})}
              onSwitchToDiffTab={() => setSidebarTab('diff')}
              status={status}
              currentPhase={currentPhase}
              currentPhaseRecord={currentPhaseRecord}
              semanticSkipped={semanticSkipped}
              semanticSkipReason={semanticSkipReason}
            />
          ) : (
            <DiffSidebar
              actors={allActorsForDiff}
              phaseHistory={phaseHistory}
              selectedDiffPhaseId={selectedDiffPhaseId}
              onSelectDiffPhase={onSelectDiffPhase}
              selectedBaseId={selectedBaseId}
              selectedCompareId={selectedCompareId}
              onSelectBase={setSelectedBaseId}
              onSelectCompare={setSelectedCompareId}
            />
          )}
        </div>
      </div>
    </div>
  )
}