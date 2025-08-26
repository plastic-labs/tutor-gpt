'use server'
import * as Sentry from '@sentry/nextjs'
import { honcho } from '@/utils/honcho'
import { createClient } from '@/utils/supabase/server'
import type { Message, ThinkingData } from '@/utils/types'

export async function getMessages(conversationId: string): Promise<Message[]> {
  return Sentry.startSpan(
    { name: 'server-action.getMessages', op: 'server.action' },
    async () => {
      const supabase = await createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Unauthorized')
      }

      // Get the session
      const session = await honcho.session(conversationId)

      // Get all messages from the session
      const messagesPage = await session.getMessages()
      const messages: any[] = []
      for await (const message of messagesPage) {
        messages.push(message)
      }

      // Transform messages to our format
      const transformedMessages: Message[] = []

      for (const message of messages) {
        if (message.peer_id === user.id) {
          // User message
          transformedMessages.push({
            id: message.id,
            content: message.content,
            isUser: true,
            metadata: message.metadata || {},
          })
        } else if (message.peer_id === 'bloom') {
          // AI message - get thinking data from other peer messages
          const thinking = await buildThinkingData(messages, message)

          transformedMessages.push({
            id: message.id,
            content: message.content,
            isUser: false,
            metadata: message.metadata || {},
            thinking,
          })
        }
      }

      return transformedMessages
    }
  )
}

async function buildThinkingData(
  allMessages: any[],
  bloomMessage: any
): Promise<ThinkingData | undefined> {
  try {
    // Get peer messages that were created around the same time as this bloom message
    const relatedMessages = allMessages.filter(
      (msg: any) =>
        msg.peer_id !== bloomMessage.peer_id &&
        Math.abs(
          new Date(msg.created_at).getTime() -
          new Date(bloomMessage.created_at).getTime()
        ) < 10000 // 10 second window to account for processing time
    )

    const thoughtContent =
      relatedMessages.find((msg: any) => msg.peer_id === 'thinker')?.content ||
      ''

    // Split by the delimiter character '␁'
    const segments = thoughtContent.split('␁')

    const initialThoughtContent = segments[0]?.trim() || ''
    const honchoQuery = segments[1]?.trim() || ''
    const pdfQuery = segments[2]?.trim() || ''

    const honchoResponse =
      relatedMessages.find((msg: any) => msg.peer_id === 'honcho-agent')
        ?.content || ''
    const pdfResponse =
      relatedMessages.find((msg: any) => msg.peer_id === 'pdf')?.content || ''

    return {
      thought: initialThoughtContent,
      thoughtFinished: true,
      honchoQuery,
      honcho: honchoResponse,
      pdfQuery,
      pdf: pdfResponse,
    }
  } catch (error) {
    console.error('Error building thinking data:', error)
    return undefined
  }
}

export async function addOrRemoveReaction(
  conversationId: string,
  messageId: string,
  reaction: 'thumbs_up' | 'thumbs_down' | null
) {
  return Sentry.startSpan(
    { name: 'server-action.addOrRemoveReaction', op: 'server.action' },
    async () => {
      const supabase = await createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Unauthorized')
      }

      if (reaction && !['thumbs_up', 'thumbs_down'].includes(reaction)) {
        throw new Error('Invalid reaction type')
      }

      // TODO: Implement reaction handling when we have the correct SDK method
      console.log('Reaction handling not yet implemented with new SDK')
    }
  )
}
