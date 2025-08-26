import { Honcho } from '@honcho-ai/sdk'

export const honcho = new Honcho({
  baseURL: process.env.HONCHO_URL!,
  workspaceId: process.env.HONCHO_WORKSPACE!,
})

// Create peers with observe_me: false for non-user peers
export const bloom = honcho.peer('bloom', { config: { observe_me: false } })
export const thinker = honcho.peer('thinker', { config: { observe_me: false } })
export const honchoAgent = honcho.peer('honcho-agent', {
  config: { observe_me: false },
})
export const pdf = honcho.peer('pdf', { config: { observe_me: false } })
