'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, Edit2, Check, X, TestTube } from 'lucide-react'
import { useActorStore } from '@/stores'
import { Actor, ProviderType } from '@/types'

interface ActorManagerProps {
  onBack: () => void
}

export default function ActorManager({ onBack }: ActorManagerProps) {
  const {
    actors,
    loading,
    error,
    fetchActors,
    createActor,
    updateActor,
    deleteActor,
    testActor,
  } = useActorStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; result: string } | null>(null)

  useEffect(() => {
    fetchActors()
  }, [fetchActors])

  const handleTest = async (id: string) => {
    setTesting(id)
    setTestResult(null)
    try {
      const result = await testActor(id)
      setTestResult({ id, result: result.response })
    } catch (err) {
      setTestResult({ id, result: `Error: ${(err as Error).message}` })
    } finally {
      setTesting(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个 Actor 吗？')) {
      await deleteActor(id)
    }
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
          <h1 className="text-lg font-semibold tracking-wider text-accent-orange">Actors</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center text-text-secondary">Loading...</div>
          ) : error ? (
            <div className="text-center text-accent-red">{error}</div>
          ) : actors.length === 0 ? (
            <div className="text-center text-text-secondary">
              No actors yet. Create one to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {actors.map((actor) => (
                <motion.div
                  key={actor.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-bg-secondary border border-border rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-4 h-4 rounded-full mt-1"
                        style={{ backgroundColor: actor.display_color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-medium">{actor.name}</h3>
                          {actor.is_meta_judge && (
                            <span className="px-2 py-0.5 bg-accent-purple/20 text-accent-purple text-xs rounded">
                              Judge
                            </span>
                          )}
                        </div>
                        <p className="text-text-tertiary text-sm mt-1">
                          {actor.provider} / {actor.model}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTest(actor.id)}
                        disabled={testing === actor.id}
                        className="p-2 text-text-tertiary hover:text-accent-blue transition-colors disabled:opacity-50"
                        title="Test connection"
                      >
                        <TestTube className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(actor.id)}
                        className="p-2 text-text-tertiary hover:text-text-primary transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(actor.id)}
                        className="p-2 text-text-tertiary hover:text-accent-red transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Test result */}
                  {testResult?.id === actor.id && (
                    <div className="mt-4 p-3 bg-bg-tertiary rounded-xl text-sm text-text-secondary">
                      {testResult.result}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {(showCreate || editingId) && (
        <ActorFormModal
          actorId={editingId}
          onClose={() => {
            setShowCreate(false)
            setEditingId(null)
          }}
          onSave={async (data) => {
            if (editingId) {
              await updateActor(editingId, data)
            } else {
              await createActor(data as unknown as Actor)
            }
            setShowCreate(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

interface ActorFormModalProps {
  actorId?: string | null
  onClose: () => void
  onSave: (data: Partial<Actor>) => Promise<void>
}

function ActorFormModal({ actorId, onClose, onSave }: ActorFormModalProps) {
  const [name, setName] = useState('')
  const [displayColor, setDisplayColor] = useState('#FF6B35')
  const [icon, setIcon] = useState('🤖')
  const [isJudge, setIsJudge] = useState(false)
  const [provider, setProvider] = useState<ProviderType>('openai')
  const [model, setModel] = useState('gpt-4o')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await onSave({
        name,
        display_color: displayColor,
        icon,
        is_meta_judge: isJudge,
        provider,
        model,
        api_key: apiKey,
        api_format: provider === 'anthropic' ? 'anthropic' : 'openai_compatible',
        base_url: baseUrl || undefined,
        max_tokens: 4096,
        temperature: 0.7,
        extra_params: {},
        system_prompt: systemPrompt,
        review_prompt: '',
        revision_prompt: '',
        personality: 'neutral',
        custom_instructions: '',
      } as unknown as Actor)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-secondary border border-border rounded-3xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {actorId ? 'Edit Actor' : 'Create Actor'}
          </h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-text-secondary text-sm block mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
              placeholder="CASPER"
            />
          </div>

          {/* Color & Icon */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-text-secondary text-sm block mb-1">Color</label>
              <input
                type="color"
                value={displayColor}
                onChange={(e) => setDisplayColor(e.target.value)}
                className="w-full h-10 rounded-xl cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <label className="text-text-secondary text-sm block mb-1">Icon</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl text-2xl"
              />
            </div>
          </div>

          {/* Is Judge */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isJudge"
              checked={isJudge}
              onChange={(e) => setIsJudge(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isJudge" className="text-text-secondary">
              Meta Judge (can synthesize consensus)
            </label>
          </div>

          {/* Provider */}
          <div>
            <label className="text-text-secondary text-sm block mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => {
                const p = e.target.value as ProviderType
                setProvider(p)
                if (p === 'openai') setModel('gpt-4o')
                else if (p === 'anthropic') setModel('claude-sonnet-4-20250514')
              }}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="text-text-secondary text-sm block mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="text-text-secondary text-sm block mb-1">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
              placeholder="sk-..."
            />
          </div>

          {/* Base URL (for custom) */}
          {provider === 'custom' && (
            <div>
              <label className="text-text-secondary text-sm block mb-1">Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
                placeholder="https://api.example.com/v1"
              />
            </div>
          )}

          {/* System Prompt */}
          <div>
            <label className="text-text-secondary text-sm block mb-1">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue min-h-[100px] resize-none"
              placeholder="You are a helpful AI assistant..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name || !apiKey}
            className="px-6 py-2 bg-accent-blue text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}