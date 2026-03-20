'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'

interface WorkflowPrompt {
  id: string
  key: string
  name: string
  description: string
  template_text: string
  required_variables: string[]
  created_at: string
  updated_at: string | null
}

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
  is_builtin: boolean
  created_at: string
  updated_at: string | null
}

type SettingsTab = 'workflow' | 'presets'

interface SettingsViewProps {
  onBack: () => void
}

export default function SettingsView({ onBack }: SettingsViewProps) {
  const [tab, setTab] = useState<SettingsTab>('workflow')
  const [workflowPrompts, setWorkflowPrompts] = useState<WorkflowPrompt[]>([])
  const [promptPresets, setPromptPresets] = useState<PromptPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({})
  const [editedPresets, setEditedPresets] = useState<Record<string, Partial<PromptPreset>>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [prompts, presets] = await Promise.all([
        apiClient.request<WorkflowPrompt[]>('/api/settings/workflow-prompts'),
        apiClient.request<PromptPreset[]>('/api/settings/prompt-presets'),
      ])
      setWorkflowPrompts(prompts)
      setPromptPresets(presets)

      // Initialize edited state
      const initialEdits: Record<string, string> = {}
      prompts.forEach(p => {
        initialEdits[p.key] = p.template_text
      })
      setEditedPrompts(initialEdits)
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveWorkflowPrompt = async (key: string) => {
    setSaving(key)
    try {
      await apiClient.request(`/api/settings/workflow-prompts/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ template_text: editedPrompts[key] }),
      })
      // Reload to get updated timestamp
      await loadData()
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(null)
    }
  }

  const savePromptPreset = async (key: string) => {
    setSaving(key)
    try {
      const edits = editedPresets[key]
      if (edits) {
        await apiClient.request(`/api/settings/prompt-presets/${key}`, {
          method: 'PUT',
          body: JSON.stringify(edits),
        })
        await loadData()
      }
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(null)
    }
  }

  const formatKey = (key: string) => {
    return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
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
          <h1 className="text-lg font-semibold tracking-wider text-accent-orange">Settings</h1>
          <button
            onClick={loadData}
            className="text-text-secondary hover:text-text-primary transition-colors"
            title="Reload"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-border">
            <button
              onClick={() => setTab('workflow')}
              className={`pb-3 px-4 transition-colors ${
                tab === 'workflow'
                  ? 'text-accent-blue border-b-2 border-accent-blue'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              工作流提示词
            </button>
            <button
              onClick={() => setTab('presets')}
              className={`pb-3 px-4 transition-colors ${
                tab === 'presets'
                  ? 'text-accent-blue border-b-2 border-accent-blue'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Actor 预设
            </button>
          </div>

          {loading ? (
            <div className="text-center text-text-secondary py-12">Loading...</div>
          ) : tab === 'workflow' ? (
            /* Workflow Prompts */
            <div className="space-y-6">
              {workflowPrompts.map((prompt) => (
                <motion.div
                  key={prompt.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-bg-secondary border border-border rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium">{prompt.name}</h3>
                      <p className="text-text-tertiary text-sm mt-1">{prompt.description}</p>
                    </div>
                    <button
                      onClick={() => saveWorkflowPrompt(prompt.key)}
                      disabled={saving === prompt.key}
                      className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {saving === prompt.key ? 'Saving...' : 'Save'}
                    </button>
                  </div>

                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {prompt.required_variables.map((v) => (
                        <span
                          key={v}
                          className="px-2 py-1 bg-accent-orange/20 text-accent-orange text-xs rounded"
                        >
                          {'{{'}{v}{'}}'}
                        </span>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={editedPrompts[prompt.key] || prompt.template_text}
                    onChange={(e) =>
                      setEditedPrompts((prev) => ({
                        ...prev,
                        [prompt.key]: e.target.value,
                      }))
                    }
                    className="w-full h-48 px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue resize-none font-mono text-sm"
                  />

                  {prompt.updated_at && (
                    <p className="text-text-tertiary text-xs mt-2">
                      Last updated: {new Date(prompt.updated_at).toLocaleString('zh-CN')}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            /* Prompt Presets */
            <div className="space-y-6">
              {promptPresets.map((preset) => (
                <motion.div
                  key={preset.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-bg-secondary border border-border rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 mr-4">
                      <input
                        type="text"
                        value={editedPresets[preset.key]?.name ?? preset.name}
                        onChange={(e) =>
                          setEditedPresets((prev) => ({
                            ...prev,
                            [preset.key]: {
                              ...prev[preset.key],
                              name: e.target.value,
                            },
                          }))
                        }
                        className="text-lg font-medium bg-transparent border-b border-transparent hover:border-border focus:border-accent-blue focus:outline-none w-full"
                      />
                      <input
                        type="text"
                        value={editedPresets[preset.key]?.description ?? preset.description}
                        onChange={(e) =>
                          setEditedPresets((prev) => ({
                            ...prev,
                            [preset.key]: {
                              ...prev[preset.key],
                              description: e.target.value,
                            },
                          }))
                        }
                        className="text-text-tertiary text-sm mt-1 bg-transparent border-b border-transparent hover:border-border focus:border-accent-blue focus:outline-none w-full"
                        placeholder="描述..."
                      />
                    </div>
                    <button
                      onClick={() => savePromptPreset(preset.key)}
                      disabled={saving === preset.key}
                      className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors shrink-0"
                    >
                      <Save className="w-4 h-4" />
                      {saving === preset.key ? 'Saving...' : 'Save'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-text-secondary text-sm block mb-1">System Prompt</label>
                      <textarea
                        value={editedPresets[preset.key]?.system_prompt ?? preset.system_prompt}
                        onChange={(e) =>
                          setEditedPresets((prev) => ({
                            ...prev,
                            [preset.key]: {
                              ...prev[preset.key],
                              system_prompt: e.target.value,
                            },
                          }))
                        }
                        className="w-full h-24 px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue resize-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-text-secondary text-sm block mb-1">Review Prompt</label>
                      <textarea
                        value={editedPresets[preset.key]?.review_prompt ?? preset.review_prompt}
                        onChange={(e) =>
                          setEditedPresets((prev) => ({
                            ...prev,
                            [preset.key]: {
                              ...prev[preset.key],
                              review_prompt: e.target.value,
                            },
                          }))
                        }
                        className="w-full h-20 px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue resize-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-text-secondary text-sm block mb-1">Revision Prompt</label>
                      <textarea
                        value={editedPresets[preset.key]?.revision_prompt ?? preset.revision_prompt}
                        onChange={(e) =>
                          setEditedPresets((prev) => ({
                            ...prev,
                            [preset.key]: {
                              ...prev[preset.key],
                              revision_prompt: e.target.value,
                            },
                          }))
                        }
                        className="w-full h-20 px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue resize-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-text-secondary text-sm block mb-1">额外指令</label>
                      <textarea
                        value={editedPresets[preset.key]?.custom_instructions ?? preset.custom_instructions}
                        onChange={(e) =>
                          setEditedPresets((prev) => ({
                            ...prev,
                            [preset.key]: {
                              ...prev[preset.key],
                              custom_instructions: e.target.value,
                            },
                          }))
                        }
                        className="w-full h-16 px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue resize-none text-sm"
                        placeholder="附加到所有提示词后的指令..."
                      />
                    </div>
                  </div>

                  {preset.updated_at && (
                    <p className="text-text-tertiary text-xs mt-2">
                      Last updated: {new Date(preset.updated_at).toLocaleString('zh-CN')}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}