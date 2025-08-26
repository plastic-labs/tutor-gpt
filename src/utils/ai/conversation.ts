import { bloom, honcho, honchoAgent, pdf, thinker } from '@/utils/honcho'
import type { ConversationHistory } from './types'

// Constants
export const MAX_CONTEXT_SIZE = 11
export const SUMMARY_SIZE = 5

export async function fetchConversationHistory(
  sessionId: string,
  userId: string
): Promise<ConversationHistory> {
  const session = await honcho.session(sessionId)

  // Get context from the session
  // const context = await session.getContext({
  //   summary: true,
  //   tokens: 2000,
  // })

  // Get recent messages
  const messagesPage = await session.getMessages()
  const messages: any[] = []
  for await (const message of messagesPage) {
    messages.push(message)
  }
  const recentMessages = messages.slice(-MAX_CONTEXT_SIZE)

  // Extract peer messages by type
  const thoughts = recentMessages.filter((msg) => msg.peer_id === 'thinker')
  const honchoMessages = recentMessages.filter(
    (msg) => msg.peer_id === 'honcho-agent'
  )
  const pdfMessages = recentMessages.filter((msg) => msg.peer_id === 'pdf')

  // Get collection ID from session metadata if available
  const metadata = await session.getMetadata()
  const collectionId = metadata?.collectionId as string | undefined

  return {
    messages: recentMessages,
    thoughts,
    honchoMessages,
    pdfMessages,
    collectionId,
  }
}

export async function saveConversation(
  sessionId: string,
  userId: string,
  userMessage: string,
  thought: string,
  honchoContent: string,
  pdfContent: string,
  response: string,
  collectionId?: string
) {
  const session = await honcho.session(sessionId)

  // Create user peer for this specific user
  const userPeer = await honcho.peer(userId)

  // Prepare all messages to add atomically - only add non-empty messages
  const messages = [(await userPeer).message(userMessage)]

  // Only add thought if it's not empty
  if (thought && thought.trim()) {
    messages.push((await thinker).message(thought))
  }

  // Only add honcho content if it's not empty
  if (honchoContent && honchoContent.trim()) {
    messages.push((await honchoAgent).message(honchoContent))
  }

  // Only add PDF content if it's not empty
  if (pdfContent && pdfContent.trim()) {
    messages.push((await pdf).message(pdfContent))
  }

  // Only add response if it's not empty
  if (response && response.trim()) {
    messages.push((await bloom).message(response))
  }

  // Add all messages at once
  await session.addMessages(messages)

  // Update session metadata with collection ID if available
  if (collectionId) {
    const metadata = await session.getMetadata()
    await session.setMetadata({
      ...metadata,
      collectionId,
    })
  }
}
