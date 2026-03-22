'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Zap, Check, Loader2, ExternalLink } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'

interface ProviderPreset {
  key: string
  name: string
  description: string
  actor_count: number
  actor_names: string[]
  semantic_model: string
}

interface QuickSetupProps {
  onClose: () => void
  onComplete: () => void
}

export default function QuickSetup({ onClose, onComplete }: QuickSetupProps) {
  const [presets, setPresets] = useState<ProviderPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPresets, setLoadingPresets] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadPresets()
  }, [])

  const loadPresets = async () => {
    try {
      const data = await apiClient.request<ProviderPreset[]>('/api/presets/providers')
      setPresets(data)
      if (data.length > 0) {
        setSelectedPreset(data[0].key)
      }
    } catch (err) {
      console.error('Failed to load presets:', err)
    } finally {
      setLoadingPresets(false)
    }
  }

  const handleSetup = async () => {
    if (!selectedPreset || !apiKey.trim()) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await apiClient.request<{
        success: boolean
        message: string
        actors_created: Array<{ id: string; name: string; model: string; is_meta_judge: boolean }>
        semantic_configured: boolean
      }>('/api/presets/quick-setup', {
        method: 'POST',
        body: JSON.stringify({
          provider_preset: selectedPreset,
          api_key: apiKey.trim(),
        }),
      })

      setSuccess(result.message)

      // 1.5秒后关闭并刷新
      setTimeout(() => {
        onComplete()
      }, 1500)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const currentPreset = presets.find((p) => p.key === selectedPreset)

  // 服务商注册链接
  const providerLinks: Record<string, string> = {
    siliconflow: 'https://cloud.siliconflow.cn/',
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-bg-secondary border border-border rounded-3xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-accent-orange/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-orange/20 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-accent-orange" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">快速配置</h2>
                <p className="text-text-tertiary text-sm">一键创建所有 Actor 和语义分析模型</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {loadingPresets ? (
            <div className="text-center py-8 text-text-secondary">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              加载中...
            </div>
          ) : (
            <>
              {/* Provider selection */}
              <div>
                <label className="text-text-secondary text-sm block mb-2">选择 API 服务商</label>
                <div className="space-y-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => setSelectedPreset(preset.key)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                        selectedPreset === preset.key
                          ? 'border-accent-blue bg-accent-blue/5'
                          : 'border-border hover:border-text-tertiary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{preset.name}</div>
                          <div className="text-text-tertiary text-sm mt-0.5">
                            {preset.description}
                          </div>
                        </div>
                        {selectedPreset === preset.key && (
                          <Check className="w-5 h-5 text-accent-blue shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset details */}
              {currentPreset && (
                <div className="bg-bg-tertiary rounded-xl p-4 space-y-2">
                  <div className="text-text-secondary text-sm">将自动创建：</div>
                  <div className="space-y-1">
                    {currentPreset.actor_names.map((name, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-accent-green">✓</span>
                        <span className="text-text-primary">{name}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-accent-blue">✓</span>
                      <span className="text-text-primary">
                        语义分析: {currentPreset.semantic_model}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* API Key input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-text-secondary text-sm">API Key</label>
                  {selectedPreset && providerLinks[selectedPreset] && (
                    <a
                      href={providerLinks[selectedPreset]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-blue text-xs flex items-center gap-1 hover:underline"
                    >
                      获取 API Key
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-xl focus:outline-none focus:border-accent-blue text-sm"
                />
                <p className="text-text-tertiary text-xs mt-1.5">
                  所有 Actor 和语义分析模型将共用此 API Key
                </p>
              </div>

              {/* Error/Success messages */}
              {error && (
                <div className="px-4 py-3 bg-accent-red/10 border border-accent-red/20 rounded-xl text-sm text-accent-red">
                  {error}
                </div>
              )}
              {success && (
                <div className="px-4 py-3 bg-accent-green/10 border border-accent-green/20 rounded-xl text-sm text-accent-green flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {success}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSetup}
            disabled={loading || !apiKey.trim() || !selectedPreset || !!success}
            className="px-6 py-2 bg-accent-orange text-white font-medium rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                配置中...
              </>
            ) : success ? (
              <>
                <Check className="w-4 h-4" />
                已完成
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                一键配置
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}