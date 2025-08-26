import { NextResponse } from 'next/server'
import { streamText } from '@/utils/ai'
import {
  fetchConversationHistory,
  saveConversation,
} from '@/utils/ai/conversation'
import { buildResponsePrompt, buildThoughtPrompt } from '@/utils/ai/prompts'
import { formatStreamChunk } from '@/utils/ai/stream'
import { validateUser } from '@/utils/ai/validation'
import { honcho } from '@/utils/honcho'
import log from '@/utils/logging'
import { collectionChat } from '@/utils/pdfChat'
import type { ChatCallProps } from './types'

const MAX_COLLECTION_SIZE_IN_MB = 5

// Main chat response generator
export async function* respond({
  message,
  conversationId,
  fileContent,
}: ChatCallProps) {
  // Validate user and permissions
  const userValidation = await validateUser()
  if (!userValidation.isAuthorized) {
    return new NextResponse(userValidation.error, {
      status: userValidation.status,
    })
  }

  // We know userData exists if isAuthorized is true
  const { userData } = userValidation

  if (!userData) {
    return new NextResponse('User data not found', { status: 500 })
  }

  const { userId } = userData

  // Fetch conversation history
  try {
    const {
      messages: messageHistory,
      thoughts: thoughtHistory,
      honchoMessages: honchoHistory,
      pdfMessages: pdfHistory,
      collectionId: existingCollectionId,
    } = await fetchConversationHistory(conversationId, userId)

    log('error', 'building thought prompt')

    // Generate thought
    const thoughtPrompt = buildThoughtPrompt(
      messageHistory,
      thoughtHistory,
      honchoHistory,
      pdfHistory,
      message,
      Boolean(fileContent || existingCollectionId)
    )
    log('error', 'starting thought generation')
    const { textStream: thoughtStream } = streamText({
      messages: thoughtPrompt,
      metadata: {
        sessionId: conversationId,
        userId,
        type: 'thought',
      },
    })

    let thought = ''
    let initialThought = ''
    let honchoQuery = ''
    let pdfQuery = ''

    let currentSection: 'thought' | 'honchoQuery' | 'pdfQuery' = 'thought'

    const addToSection = (
      section: 'thought' | 'honchoQuery' | 'pdfQuery',
      text: string
    ) => {
      if (section === 'thought') {
        initialThought += text
      } else if (section === 'honchoQuery') {
        honchoQuery += text
      } else pdfQuery += text
    }

    for await (const chunk of thoughtStream) {
      thought += chunk
      if (chunk.includes('␁')) {
        const segments = chunk.split('␁')

        // Process first segment (before any delimiter)
        const firstSegment = segments[0].trimEnd()
        if (firstSegment) {
          addToSection(currentSection, firstSegment)
          yield formatStreamChunk({
            type: currentSection,
            content: firstSegment,
            finished: false,
          })
        }

        // Process remaining segments (after each delimiter)
        for (let i = 1; i < segments.length; i++) {
          // Update section after each delimiter
          if (currentSection === 'thought') {
            currentSection = 'honchoQuery'
          } else if (currentSection === 'honchoQuery') {
            currentSection = 'pdfQuery'
          }

          const segment = i === 1 ? segments[i].trimStart() : segments[i]
          if (segment) {
            addToSection(currentSection, segment)
            yield formatStreamChunk({
              type: currentSection,
              content: segment,
              finished: false,
            })
          }
        }
      } else {
        addToSection(currentSection, chunk)
        yield formatStreamChunk({
          type: currentSection,
          content: chunk,
          finished: false,
        })
      }
    }

    log('error', 'starting honcho generation')

    const [honchoContent, { pdfContent, collectionId }] = await Promise.all([
      // HONCHO STUFF
      (async () => {
        if (!honchoQuery) return ''
        const userPeer = await honcho.peer(userId)
        const response = await userPeer.chat(honchoQuery, {
          sessionId: conversationId,
        })
        return response
      })(),
      // PDF STUFF
      (async () => {
        // Get PDF response if needed
        let pdfContent = ''
        let collectionId: string | undefined
        const fileContentArray = await fileContent
        if (fileContentArray || existingCollectionId) {
          // For now, just return empty content since we need to implement PDF handling
          // TODO: Implement PDF collection handling with new SDK
          pdfContent = 'PDF processing not yet implemented with new SDK'
        }

        return { pdfContent, collectionId }
      })(),
    ])

    // Send honcho content as a separate chunk
    if (honchoContent && honchoContent.trim()) {
      yield formatStreamChunk({
        type: 'honcho',
        content: honchoContent,
        finished: true,
      })
    }

    // Send PDF content as a separate chunk
    if (pdfContent && pdfContent.trim()) {
      yield formatStreamChunk({
        type: 'pdf',
        content: pdfContent,
        finished: true,
      })
    }

    log('error', 'starting response generation')

    // Generate final response
    const responsePrompt = buildResponsePrompt(
      messageHistory,
      thoughtHistory,
      honchoHistory,
      pdfHistory,
      message,
      thought,
      honchoContent || '',
      pdfContent || ''
    )

    const { textStream: responseStream } = streamText({
      messages: responsePrompt,
      metadata: {
        sessionId: conversationId,
        userId,
        type: 'response',
      },
    })

    let response = ''

    for await (const chunk of responseStream) {
      response += chunk
      yield formatStreamChunk({
        type: 'response',
        content: chunk,
        finished: false,
      })
    }

    // Mark response as finished
    yield formatStreamChunk({
      type: 'response',
      content: '',
      finished: true,
    })

    // Save conversation
    await saveConversation(
      conversationId,
      userId,
      message,
      thought,
      honchoContent || '',
      pdfContent || '',
      response,
      collectionId
    )
  } catch (err) {
    console.error(err)
  }
}
