import { toast } from 'sonner'
import type { Message, ThinkingData } from '@/utils/types'

interface StreamResponseChunk {
  type: 'thought' | 'honcho' | 'response' | 'pdf' | 'honchoQuery' | 'pdfQuery'
  content: string
  finished: boolean
}

export class StreamReader {
  private reader: ReadableStreamDefaultReader<Uint8Array>
  private decoder: TextDecoder
  private buffer: string

  constructor(stream: ReadableStream<Uint8Array>) {
    this.reader = stream.getReader()
    this.decoder = new TextDecoder()
    this.buffer = ''
  }

  private tryParseNextJSON(): {
    parsed: StreamResponseChunk | null
    remaining: string
  } {
    let curlyBraceCount = 0
    let startIndex = -1

    // Find the start of the next JSON object
    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i] === '{') {
        if (startIndex === -1) startIndex = i
        curlyBraceCount++
      } else if (this.buffer[i] === '}') {
        curlyBraceCount--
        if (curlyBraceCount === 0 && startIndex !== -1) {
          // We found a complete JSON object
          try {
            const jsonStr = this.buffer.substring(startIndex, i + 1)
            const parsed = JSON.parse(jsonStr) as StreamResponseChunk
            return {
              parsed,
              remaining: this.buffer.substring(i + 1),
            }
          } catch (_e) { }
        }
      }
    }

    // No complete JSON object found
    return { parsed: null, remaining: this.buffer }
  }

  async read(): Promise<{ done: boolean; chunk?: StreamResponseChunk }> {
    while (true) {
      // Try to parse any complete JSON object from our buffer
      const { parsed, remaining } = this.tryParseNextJSON()
      if (parsed) {
        this.buffer = remaining
        return { done: false, chunk: parsed }
      }

      // If we couldn't parse anything, we need more data
      const { done, value } = await this.reader.read()

      if (done) {
        // Only return done if the reader is actually finished and we have no remaining buffer
        if (this.buffer.trim()) {
          console.warn('Stream ended with unparsed data:', this.buffer)
        }
        return { done: true }
      }

      // Append new data to our buffer and continue trying to parse
      this.buffer += this.decoder.decode(value, { stream: true })
    }
  }

  release() {
    this.reader.releaseLock()
  }
}

export async function fetchConsolidatedStream(
  message: string,
  conversationId: string,
  file?: File
) {
  try {
    const formData = new FormData()
    formData.append('message', message)
    formData.append('conversationId', conversationId)
    if (file) {
      formData.append('file', file)
    }

    const response = await fetch(`/api/chat`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      if (response.status === 402) {
        toast.error('Subscription Required', {
          description:
            'You have no active subscription. Subscribe to continue using Bloom!',
          action: {
            label: 'Subscribe',
            onClick: () => (window.location.href = '/settings'),
          },
        })
        throw new Error(`Subscription is required to chat: ${response.status}`)
      }

      if (response.status === 429) {
        // Parse the error response to get rate limit details
        let errorDetails
        try {
          errorDetails = await response.json()
        } catch {
          errorDetails = {
            message: 'Rate limit exceeded. Please try again in a moment.',
          }
        }

        toast.error('Rate Limit Exceeded', {
          description:
            errorDetails.details ||
            'You can make up to 8 chat requests per minute. Please wait before sending another message.',
          duration: 8000, // Show for 8 seconds
          action: {
            label: 'Got it',
            onClick: () => { },
          },
        })
        throw new Error(`Rate limit exceeded: ${response.status}`)
      }

      const errorText = await response.text()
      console.error(`Stream error:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
      console.error(response)
      throw new Error(`Failed to fetch stream: ${response.status}`)
    }

    const stream = response.body
    if (!stream) throw new Error('Failed to get stream')
    return stream
  } catch (error) {
    console.error(`Error in fetchConsolidatedStream:`, error)
    throw error
  }
}

type ThinkingDataUpdates = Partial<ThinkingData> & {
  appendToField?: keyof ThinkingData
  appendText?: string
}

function updateThinkingData(
  currentThinking: ThinkingData | undefined,
  updates: ThinkingDataUpdates
): ThinkingData {
  const baseThinking: ThinkingData = {
    thought: currentThinking?.thought || '',
    thoughtFinished: currentThinking?.thoughtFinished || false,
    honchoQuery: currentThinking?.honchoQuery,
    honcho: currentThinking?.honcho,
    pdfQuery: currentThinking?.pdfQuery,
    pdf: currentThinking?.pdf,
  }

  // Handle appending text to a specific field
  if (updates.appendToField && updates.appendText) {
    const fieldName = updates.appendToField
    const currentValue = (baseThinking[fieldName] as string) || ''
      ; (baseThinking as unknown as Record<string, unknown>)[fieldName] =
        currentValue + updates.appendText
  }

  // Apply other updates (excluding helper properties)
  const { appendToField: _, appendText: __, ...thinkingUpdates } = updates
  return {
    ...baseThinking,
    ...thinkingUpdates,
  }
}

export function updateMessageWithThinking(
  mutateMessages: (
    updateFunction: (currentMessages?: Message[]) => Message[],
    options?: { revalidate: boolean }
  ) => void,
  thinkingUpdates: ThinkingDataUpdates
) {
  mutateMessages(
    (currentMessages?: Message[]) => {
      const msgs = currentMessages || []
      const lastMessage = msgs[msgs.length - 1]
      if (lastMessage && !lastMessage.isUser) {
        const updatedThinking = updateThinkingData(
          lastMessage.thinking,
          thinkingUpdates
        )
        return [
          ...msgs.slice(0, -1),
          {
            ...lastMessage,
            thinking: updatedThinking,
          },
        ]
      }
      return msgs
    },
    { revalidate: false }
  )
}
