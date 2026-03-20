import { create } from 'zustand'
import { Actor, ActorDetail, DebateSession, SessionListItem } from '@/types'

interface ActorState {
  actors: Actor[]
  selectedActors: string[]
  judgeActorId: string | null
  loading: boolean
  error: string | null

  fetchActors: () => Promise<void>
  createActor: (data: Partial<ActorDetail>) => Promise<Actor>
  updateActor: (id: string, data: Partial<ActorDetail>) => Promise<void>
  deleteActor: (id: string) => Promise<void>
  testActor: (id: string) => Promise<{ status: string; response: string }>

  selectActor: (id: string) => void
  deselectActor: (id: string) => void
  setJudgeActor: (id: string) => void
}

export const useActorStore = create<ActorState>((set, get) => ({
  actors: [],
  selectedActors: [],
  judgeActorId: null,
  loading: false,
  error: null,

  fetchActors: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/actors')
      if (!res.ok) throw new Error('Failed to fetch actors')
      const actors = await res.json()
      set({ actors, loading: false })

      // Auto-select first two non-judge actors and first judge
      const judges = actors.filter((a: Actor) => a.is_meta_judge)
      const nonJudges = actors.filter((a: Actor) => !a.is_meta_judge)

      if (get().selectedActors.length === 0 && nonJudges.length >= 2) {
        set({ selectedActors: [nonJudges[0].id, nonJudges[1].id] })
      }
      if (!get().judgeActorId && judges.length > 0) {
        set({ judgeActorId: judges[0].id })
      }
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  createActor: async (data) => {
    const res = await fetch('/api/actors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        display_color: data.display_color,
        icon: data.icon,
        is_meta_judge: data.is_meta_judge,
        api_config: {
          provider: data.provider,
          api_format: data.api_format,
          base_url: data.base_url,
          model: data.model,
          max_tokens: data.max_tokens,
          temperature: data.temperature,
          extra_params: data.extra_params || {},
          api_key: (data as unknown as { api_key: string }).api_key,
        },
        prompt_config: {
          system_prompt: data.system_prompt,
          review_prompt: data.review_prompt,
          revision_prompt: data.revision_prompt,
          personality: data.personality,
          custom_instructions: data.custom_instructions,
        },
      }),
    })
    if (!res.ok) throw new Error('Failed to create actor')
    const actor = await res.json()
    set((state) => ({ actors: [...state.actors, actor] }))
    return actor
  },

  updateActor: async (id, data) => {
    const res = await fetch(`/api/actors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        display_color: data.display_color,
        icon: data.icon,
        is_meta_judge: data.is_meta_judge,
        api_config: {
          provider: data.provider,
          api_format: data.api_format,
          base_url: data.base_url,
          model: data.model,
          max_tokens: data.max_tokens,
          temperature: data.temperature,
          extra_params: data.extra_params || {},
          api_key: (data as unknown as { api_key: string }).api_key,
        },
        prompt_config: {
          system_prompt: data.system_prompt,
          review_prompt: data.review_prompt,
          revision_prompt: data.revision_prompt,
          personality: data.personality,
          custom_instructions: data.custom_instructions,
        },
      }),
    })
    if (!res.ok) throw new Error('Failed to update actor')
    const updated = await res.json()
    set((state) => ({
      actors: state.actors.map((a) => (a.id === id ? updated : a)),
    }))
  },

  deleteActor: async (id) => {
    const res = await fetch(`/api/actors/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete actor')
    set((state) => ({
      actors: state.actors.filter((a) => a.id !== id),
      selectedActors: state.selectedActors.filter((aid) => aid !== id),
    }))
  },

  testActor: async (id) => {
    const res = await fetch(`/api/actors/${id}/test`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to test actor')
    return res.json()
  },

  selectActor: (id) => {
    set((state) => ({
      selectedActors: state.selectedActors.includes(id)
        ? state.selectedActors
        : [...state.selectedActors, id],
    }))
  },

  deselectActor: (id) => {
    set((state) => ({
      selectedActors: state.selectedActors.filter((aid) => aid !== id),
    }))
  },

  setJudgeActor: (id) => {
    set({ judgeActorId: id })
  },
}))