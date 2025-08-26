'use server'

import * as Sentry from '@sentry/nextjs'
import { nanoid } from 'nanoid'
import { bloom, honcho, honchoAgent, pdf, thinker } from '@/utils/honcho'
import { createClient } from '@/utils/supabase/server'
import type { Conversation } from '@/utils/types'

// TODO add proper authorization check

export async function getConversations() {
  return Sentry.startSpan(
    { name: 'server-action.getConversations', op: 'server.action' },
    async () => {
      const supabase = await createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Unauthorized')
      }

      const acc: Conversation[] = []

      // Get all sessions for this user's peer
      const userPeer = await honcho.peer(user.id)
      const sessions = await userPeer.getSessions()

      for await (const session of sessions) {
        const metadata = await session.getMetadata()
        const name = (metadata?.name as string) ?? 'Untitled'
        const instance: Conversation = {
          conversationId: session.id,
          name,
        }
        acc.push(instance)
      }

      return acc.sort((a, b) =>
        b.conversationId.localeCompare(a.conversationId)
      )
    }
  )
}

export async function createConversation() {
  return Sentry.startSpan(
    { name: 'server-action.createConversation', op: 'server.action' },
    async () => {
      const supabase = await createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Unauthorized')
      }

      // Generate a unique session ID
      const sessionId = nanoid()

      // Create session with all peers
      const session = await honcho.session(sessionId)

      // Create user peer for this specific user
      const userPeer = await honcho.peer(user.id)

      // Add all peers to the session
      await session.addPeers([
        userPeer,
        await bloom,
        await thinker,
        await honchoAgent,
        await pdf,
      ])

      return { conversationId: sessionId, name: 'Untitled' }
    }
  )
}

export async function updateConversation(conversationId: string, name: string) {
  return Sentry.startSpan(
    { name: 'server-action.updateConversation', op: 'server.action' },
    async () => {
      const supabase = await createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Unauthorized')
      }

      // Get the session and update its metadata
      const session = await honcho.session(conversationId)
      const metadata = await session.getMetadata()
      await session.setMetadata({
        ...metadata,
        name,
      })

      return { success: true }
    }
  )
}

// TODO: Implement deleteConversation when we have the correct SDK method
export async function deleteConversation(conversationId: string) {
  return Sentry.startSpan(
    { name: 'server-action.deleteConversation', op: 'server.action' },
    async () => {
      const supabase = await createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Unauthorized')
      }

      // TODO: Implement session deletion when we have the correct SDK method
      console.log('Delete conversation not yet implemented with new SDK')
      return { success: true }
    }
  )
}
