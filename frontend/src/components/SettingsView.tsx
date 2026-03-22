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

type SettingsTab = 'workflow' | 'presets' | 'semantic'

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

  const [semanticConfig, setSemanticConfig] = useState<{
    provider: string
    api_format: string
    base_url: string
    api_key: string
    model: string
    max_tokens: number
    temperature: number
    question_intent_timeout: number
    topic_extraction_timeout: number
    cross_compare_timeout: number
    is_configured: boolean
  }>({
    provider: 'custom',
    api_format: 'openai_compatible',
    base_url: '',
    api_key: '',
    model: '',
    max_tokens: 2048,
    temperature: 0.3,
    question_intent_timeout: 60,
    topic_extraction_timeout: 90,
    cross_compare_timeout: 90,
    is_configured: false,
  })
  const [semanticTesting, setSemanticTesting] = useState(false)
  const [semanticTestResult, setSemanticTestResult] = useState<string | null>(null)

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

      // Load semantic model config (may 404 if not configured)
      try {
        const sc = await apiClient.getSemanticModelConfig()
        setSemanticConfig({
          provider: sc.provider,
          api_format: sc.api_format,
          base_url: sc.base_url || '',
          api_key: '',  // Never show existing key
          model: sc.model,
          max_tokens: sc.max_tokens,
          temperature: sc.temperature,
          question_intent_timeout: sc.question_intent_timeout,
          topic_extraction_timeout: sc.topic_extraction_timeout,
          cross_compare_timeout: sc.cross_compare_timeout,
          is_configured: true,
        })
      } catch {
        // 404 = not configured, keep defaults
      }
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

  const saveSemanticConfig = async () => {
    setSaving('semantic')
    try {
      await apiClient.upsertSemanticModelConfig({
        provider: semanticConfig.provider as import('@/types').ProviderType,
        api_format: semanticConfig.api_format,
        base_url: semanticConfig.base_url || undefined,
        api_key: semanticConfig.api_key,
        model: semanticConfig.model,
        max_tokens: semanticConfig.max_tokens,
        temperature: semanticConfig.temperature,
        question_intent_timeout: semanticConfig.question_intent_timeout,
        topic_extraction_timeout: semanticConfig.topic_extraction_timeout,
        cross_compare_timeout: semanticConfig.cross_compare_timeout,
      })
      await loadData()
      setSemanticTestResult(null)
    } catch (err) {
      console.error('Failed to save semantic config:', err)
    } finally {
      setSaving(null)
    }
  }

  const testSemanticConfig = async () => {
    setSemanticTesting(true)
    setSemanticTestResult(null)
    try {
      const result = await apiClient.testSemanticModel()
      setSemanticTestResult(`✅ ${result.response}`)
    } catch (err) {
      setSemanticTestResult(`❌ ${(err as Error).message}`)
    } finally {
      setSemanticTesting(false)
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
            <button
              onClick={() => setTab('semantic')}
              className={`pb-3 px-4 transition-colors ${
                tab === 'semantic'
                  ? 'text-accent-blue border-b-2 border-accent-blue'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              语义分析模型
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
          ) : tab === 'presets' ? (
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
          ) : (
            /* Semantic Model Config */
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg-secondary border border-border rounded-2xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium">语义分析专用模型</h3>
                    <p className="text-text-tertiary text-sm mt-1">
                      独立于主流程的轻量模型，用于提取语义主题和生成分歧图谱。
                      建议使用响应速度快的小模型，避免与主流程竞争 API 限速。
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {semanticConfig.is_configured && (
                      <button
                        onClick={testSemanticConfig}
                        disabled={semanticTesting}
                        className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary text-text-secondary rounded-xl hover:bg-bg-tertiary/80 disabled:opacity-50 transition-colors"
                      >
                        {semanticTesting ? '测试中...' : '测试连接'}
                      </button>
                    )}
                    <button
                      onClick={saveSemanticConfig}
                      disabled={saving === 'semantic' || !semanticConfig.model || (!semanticConfig.api_key && !semanticConfig.is_configured)}
                      className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {saving === 'semantic' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                {semanticTestResult && (
                  <div className="mb-4 p-3 bg-bg-tertiary rounded-xl text-sm text-text-secondary">
                    {semanticTestResult}
                  </div>
                )}

                {!semanticConfig.is_configured && (
                  <div className="mb-4 p-3 bg-accent-orange/10 border border-accent-orange/20 rounded-xl text-sm text-accent-orange">
                    ⚠️ 语义分析模型尚未配置。配置后互评将自动启用语义图谱功能。
                  </div>
                )}

                <div className="space-y-4">
                  {/* Provider & Model */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-text-secondary text-sm block mb-1">Provider</label>
                      <select
                        value={semanticConfig.provider}
                        onChange={(e) => setSemanticConfig(prev => ({ ...prev, provider: e.target.value }))}
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
                        value={semanticConfig.model}
                        onChange={(e) => setSemanticConfig(prev => ({ ...prev, model: e.target.value }))}
                        className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
                        placeholder="gpt-4o-mini"
                      />
                    </div>
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="text-text-secondary text-sm block mb-1">
                      API Key {semanticConfig.is_configured && <span className="text-text-tertiary">(留空保留现有)</span>}
                    </label>
                    <input
                      type="password"
                      value={semanticConfig.api_key}
                      onChange={(e) => setSemanticConfig(prev => ({ ...prev, api_key: e.target.value }))}
                      className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
                      placeholder={semanticConfig.is_configured ? '留空保留现有 key' : 'sk-...'}
                    />
                  </div>

                  {/* Base URL */}
                  <div>
                    <label className="text-text-secondary text-sm block mb-1">Base URL（Custom provider 必填）</label>
                    <input
                      type="text"
                      value={semanticConfig.base_url}
                      onChange={(e) => setSemanticConfig(prev => ({ ...prev, base_url: e.target.value }))}
                      className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue"
                      placeholder="https://api.siliconflow.cn/v1"
                    />
                  </div>

                  {/* Timeout Configuration */}
                  <div className="border-t border-border pt-4">
                    <h4 className="text-text-primary font-medium mb-3">超时配置（秒）</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-text-tertiary text-xs block mb-1">问题意图分析</label>
                        <input
                          type="number"
                          min={10}
                          max={300}
                          value={semanticConfig.question_intent_timeout}
                          onChange={(e) => setSemanticConfig(prev => ({ ...prev, question_intent_timeout: Number(e.target.value) }))}
                          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg focus:outline-none focus:border-accent-blue text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-text-tertiary text-xs block mb-1">主题提取（每模型）</label>
                        <input
                          type="number"
                          min={10}
                          max={300}
                          value={semanticConfig.topic_extraction_timeout}
                          onChange={(e) => setSemanticConfig(prev => ({ ...prev, topic_extraction_timeout: Number(e.target.value) }))}
                          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg focus:outline-none focus:border-accent-blue text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-text-tertiary text-xs block mb-1">跨模型比较</label>
                        <input
                          type="number"
                          min={10}
                          max={300}
                          value={semanticConfig.cross_compare_timeout}
                          onChange={(e) => setSemanticConfig(prev => ({ ...prev, cross_compare_timeout: Number(e.target.value) }))}
                          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg focus:outline-none focus:border-accent-blue text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}