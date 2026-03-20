'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, Edit2, Check, X, TestTube } from 'lucide-react'
import { useActorStore } from '@/stores'
import { Actor, ProviderType } from '@/types'
import { apiClient } from '@/lib/apiClient'

interface PromptPreset {
  id: string
  key: string
  name: string
  description: string
  system_prompt: string
  review_prompt: string
  revision_prompt: string
  personality: string
  custom_instructions: string
}

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
                              总结模型
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
  const { fetchActorDetail } = useActorStore()
  const [presets, setPresets] = useState<PromptPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>('')

  const [name, setName] = useState('')
  const [displayColor, setDisplayColor] = useState('#FF6B35')
  const [icon, setIcon] = useState('🤖')
  const [isJudge, setIsJudge] = useState(false)
  const [provider, setProvider] = useState<ProviderType>('openai')
  const [model, setModel] = useState('gpt-4o')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [reviewPrompt, setReviewPrompt] = useState('')
  const [revisionPrompt, setRevisionPrompt] = useState('')
  const [customInstructions, setCustomInstructions] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load presets on mount
  useEffect(() => {
    loadPresets()
  }, [])

  // Load existing actor data
  useEffect(() => {
    if (actorId) {
      setLoading(true)
      fetchActorDetail(actorId)
        .then((detail) => {
          setName(detail.name)
          setDisplayColor(detail.display_color)
          setIcon(detail.icon)
          setIsJudge(detail.is_meta_judge)
          setProvider(detail.provider as ProviderType)
          setModel(detail.model)
          setBaseUrl(detail.base_url || '')
          setSystemPrompt(detail.system_prompt || '')
          setReviewPrompt(detail.review_prompt || '')
          setRevisionPrompt(detail.revision_prompt || '')
          setCustomInstructions(detail.custom_instructions || '')
          setApiKey('')
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [actorId, fetchActorDetail])

  const loadPresets = async () => {
    try {
      const data = await apiClient.request<PromptPreset[]>('/api/settings/prompt-presets')
      setPresets(data)
    } catch (err) {
      console.error('Failed to load presets:', err)
    }
  }

  // Apply preset to form
  const applyPreset = (presetKey: string) => {
    const preset = presets.find(p => p.key === presetKey)
    if (preset) {
      setSystemPrompt(preset.system_prompt)
      setReviewPrompt(preset.review_prompt)
      setRevisionPrompt(preset.revision_prompt)
      setCustomInstructions(preset.custom_instructions)
      setSelectedPreset(presetKey)
    }
  }

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
        api_key: apiKey || undefined,
        api_format: provider === 'anthropic' ? 'anthropic' : 'openai_compatible',
        base_url: baseUrl || undefined,
        max_tokens: 4096,
        temperature: 0.7,
        extra_params: {},
        system_prompt: systemPrompt,
        review_prompt: reviewPrompt,
        revision_prompt: revisionPrompt,
        personality: 'neutral',
        custom_instructions: customInstructions,
      } as unknown as Actor)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-secondary border border-border rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto mx-4"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {actorId ? '编辑 Actor' : '创建 Actor'}
          </h2>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-text-secondary">Loading...</div>
        ) : (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-text-secondary text-sm block mb-1">名称</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
                  placeholder="CASPER"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-text-secondary text-sm block mb-1">颜色</label>
                  <input
                    type="color"
                    value={displayColor}
                    onChange={(e) => setDisplayColor(e.target.value)}
                    className="w-full h-10 rounded-xl cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-text-secondary text-sm block mb-1">图标</label>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl text-2xl"
                  />
                </div>
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
                可作为总结模型（综合各方观点）
              </label>
            </div>

            {/* API Configuration */}
            <div className="border-t border-border pt-4 mt-4">
              <h3 className="text-text-primary font-medium mb-3">API 配置</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-text-secondary text-sm block mb-1">Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => {
                      const p = e.target.value as ProviderType
                      setProvider(p)
                      if (p === 'openai') setModel('gpt-4o')
                      else if (p === 'anthropic') setModel('claude-sonnet-4-20250514')
                      else setModel('')
                    }}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="text-text-secondary text-sm block mb-1">Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-text-secondary text-sm block mb-1">
                  API Key {actorId && <span className="text-text-tertiary">(留空保留现有)</span>}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
                  placeholder={actorId ? '留空保留现有 key' : 'sk-...'}
                />
              </div>

              {provider === 'custom' && (
                <div className="mt-4">
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
            </div>

            {/* Prompt Configuration */}
            <div className="border-t border-border pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-text-primary font-medium">提示词配置</h3>
                {presets.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedPreset}
                      onChange={(e) => applyPreset(e.target.value)}
                      className="px-3 py-1.5 bg-bg-tertiary border border-border rounded-lg text-sm focus:outline-none focus:border-accent-blue"
                    >
                      <option value="">选择预设...</option>
                      {presets.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-text-tertiary text-xs">应用预设</span>
                  </div>
                )}
              </div>

              {/* System Prompt */}
              <div className="mb-4">
                <label className="text-text-secondary text-sm block mb-1">
                  系统提示词
                  <span className="text-text-tertiary text-xs ml-2">（定义 Actor 的基本角色和行为）</span>
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue min-h-[80px] resize-none text-sm"
                  placeholder="你是一个专业的分析者..."
                />
              </div>

              {/* Review Prompt */}
              <div className="mb-4">
                <label className="text-text-secondary text-sm block mb-1">
                  互评提示词
                  <span className="text-text-tertiary text-xs ml-2">（指导如何评审他人回答）</span>
                </label>
                <textarea
                  value={reviewPrompt}
                  onChange={(e) => setReviewPrompt(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue min-h-[60px] resize-none text-sm"
                  placeholder="请从专业角度评审..."
                />
              </div>

              {/* Revision Prompt */}
              <div className="mb-4">
                <label className="text-text-secondary text-sm block mb-1">
                  修订提示词
                  <span className="text-text-tertiary text-xs ml-2">（指导如何根据反馈修订）</span>
                </label>
                <textarea
                  value={revisionPrompt}
                  onChange={(e) => setRevisionPrompt(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue min-h-[60px] resize-none text-sm"
                  placeholder="请根据评审意见修订..."
                />
              </div>

              {/* Custom Instructions */}
              <div>
                <label className="text-text-secondary text-sm block mb-1">
                  额外指令
                  <span className="text-text-tertiary text-xs ml-2">（附加到所有提示词后面）</span>
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue min-h-[60px] resize-none text-sm"
                  placeholder="始终提供具体的数据支撑..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button
                onClick={onClose}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !name || (!actorId && !apiKey)}
                className="px-6 py-2 bg-accent-blue text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}