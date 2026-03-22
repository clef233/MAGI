'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, Check, X } from 'lucide-react'
import { useDebateStore } from '@/stores'
import { SessionListItem } from '@/types'

interface SessionHistoryProps {
  onBack: () => void
  onSelect: (sessionId: string) => void
}

export default function SessionHistory({ onBack, onSelect }: SessionHistoryProps) {
  const { sessions, fetchSessions } = useDebateStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions().finally(() => setLoading(false))
  }, [fetchSessions])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusIcon = (status: string, confidence?: number | null) => {
    if (status === 'completed' && confidence != null && confidence > 0.7) {
      return <Check className="w-4 h-4 text-accent-green" />
    }
    if (status === 'completed') {
      return <Check className="w-4 h-4 text-accent-orange" />
    }
    if (status === 'stopped') {
      return <X className="w-4 h-4 text-accent-red" />
    }
    return <Clock className="w-4 h-4 text-text-tertiary" />
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-lg font-semibold tracking-wider text-accent-orange">History</h1>
          <div className="w-16" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center text-text-secondary">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-text-secondary">
              No debate history yet. Start your first debate!
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session, index) => (
                <motion.button
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelect(session.id)}
                  className="w-full bg-bg-secondary border border-border rounded-2xl p-4 hover:border-accent-blue transition-colors text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary truncate">{session.question}</p>
                      <p className="text-text-tertiary text-sm mt-1">
                        {formatDate(session.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {getStatusIcon(session.status, session.consensus_confidence)}
                      {session.status === 'completed' && (
                        session.consensus_confidence != null ? (
                          <span className="text-sm text-accent-green">
                            {Math.round(session.consensus_confidence * 100)}% 共识
                          </span>
                        ) : (
                          <span className="text-sm text-text-tertiary">已完成</span>
                        )
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}