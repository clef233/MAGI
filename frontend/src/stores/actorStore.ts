import { create } from 'zustand'
import { Actor, ActorDetail } from '@/types'
import { apiClient } from '@/lib/apiClient'

interface ActorState {
  actors: Actor[]
  actorDetails: Record<string, ActorDetail>
  selectedActors: string[]
  judgeActorId: string | null
  loading: boolean
  error: string | null

  fetchActors: () => Promise<void>
  fetchActorDetail: (id: string) => Promise<ActorDetail>
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
  actorDetails: {},
  selectedActors: [],
  judgeActorId: null,
  loading: false,
  error: null,

  fetchActors: async () => {
    set({ loading: true, error: null })
    try {
      const actors = await apiClient.listActors()
      set({ actors, loading: false })

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

  fetchActorDetail: async (id: string) => {
    const cached = get().actorDetails[id]
    if (cached) return cached

    const detail = await apiClient.getActor(id)
    set((state) => ({ actorDetails: { ...state.actorDetails, [id]: detail } }))
    return detail
  },

  createActor: async (data) => {
    const payload = {
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
        api_key: (data as unknown as { api_key?: string }).api_key,
      },
      prompt_config: {
        system_prompt: data.system_prompt,
        review_prompt: data.review_prompt,
        revision_prompt: data.revision_prompt,
        personality: data.personality,
        custom_instructions: data.custom_instructions,
      },
    }
    const actor = await apiClient.createActor(payload)
    set((state) => ({ actors: [...state.actors, actor] }))
    return actor
  },

  updateActor: async (id, data) => {
    const apiConfig: Record<string, unknown> = {
      provider: data.provider,
      api_format: data.api_format,
      base_url: data.base_url,
      model: data.model,
      max_tokens: data.max_tokens,
      temperature: data.temperature,
      extra_params: data.extra_params || {},
    }

    const apiKey = (data as unknown as { api_key?: string }).api_key
    if (apiKey) {
      apiConfig.api_key = apiKey
    }

    const payload = {
      name: data.name,
      display_color: data.display_color,
      icon: data.icon,
      is_meta_judge: data.is_meta_judge,
      api_config: apiConfig,
      prompt_config: {
        system_prompt: data.system_prompt,
        review_prompt: data.review_prompt,
        revision_prompt: data.revision_prompt,
        personality: data.personality,
        custom_instructions: data.custom_instructions,
      },
    }

    const updated = await apiClient.updateActor(id, payload)
    set((state) => {
      // Remove the cached detail by creating a new object without the key
      const { [id]: _, ...remainingDetails } = state.actorDetails
      return {
        actors: state.actors.map((a) => (a.id === id ? (updated as unknown as Actor) : a)),
        actorDetails: remainingDetails,
      }
    })
  },

  deleteActor: async (id) => {
    await apiClient.deleteActor(id)
    set((state) => ({
      actors: state.actors.filter((a) => a.id !== id),
      selectedActors: state.selectedActors.filter((aid) => aid !== id),
    }))
  },

  testActor: async (id) => {
    return apiClient.testActor(id)
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