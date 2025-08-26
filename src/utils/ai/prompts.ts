import responsePrompt from '@/utils/prompts/response'
import thoughtWithPDFPrompt from '@/utils/prompts/thought'
import { assistant, user } from '../ai'
import type { Message, MetaMessage } from './types'

export function extractTagContent(str: string, tagName: string): string {
  try {
    const match = str.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`))
    return match ? match[1].trim() : str
  } catch {
    return str
  }
}

export function parseHonchoContent(str: string): string {
  return extractTagContent(str, 'honcho')
}

export function parsePDFContent(str: string): string {
  return extractTagContent(str, 'pdf-agent')
}

export function extractSummary(response: string): string | undefined {
  const summary = extractTagContent(response, 'summary')
  if (summary === response) {
    console.warn('Failed to extract summary with expected format')
  }
  return summary
}

export function buildThoughtPrompt(
  messageHistory: Message[],
  thoughtHistory: MetaMessage[],
  honchoHistory: MetaMessage[],
  pdfHistory: MetaMessage[],
  currentMessage: string,
  hasPDF: boolean
) {
  const thoughtProcessedHistory = messageHistory.map((message, i) => {
    if (message.isUser) {
      if (i === 0 || i === messageHistory.length - 1) {
        return user`${message.content}`
      }

      // Find previous AI and user messages
      let prevAiIndex = -1
      for (let j = i - 1; j >= 0; j--) {
        if (!messageHistory[j].isUser) {
          prevAiIndex = j
          break
        }
      }

      let prevUserIndex = -1
      for (let j = prevAiIndex - 1; j >= 0; j--) {
        if (messageHistory[j].isUser) {
          prevUserIndex = j
          break
        }
      }

      const honchoResponse =
        prevUserIndex >= 0
          ? honchoHistory.find((h) => h.id === messageHistory[prevUserIndex].id)
          : null

      const pdfResponse =
        prevUserIndex >= 0
          ? pdfHistory.find((p) => p.id === messageHistory[prevUserIndex].id)
          : null

      const tutorResponse =
        prevAiIndex >= 0 ? messageHistory[prevAiIndex] : null

      return user`
      <honcho-response>${honchoResponse?.content || 'None'}</honcho-response>
      <pdf-response>${pdfResponse?.content || 'None'}</pdf-response>
      <tutor>${tutorResponse?.content || 'None'}</tutor>
      ${message.content}`
    } else {
      let prevUserIndex = -1
      for (let j = i - 1; j >= 0; j--) {
        if (messageHistory[j].isUser) {
          prevUserIndex = j
          break
        }
      }

      const thoughtResponse =
        prevUserIndex >= 0
          ? thoughtHistory.find(
              (t) => t.id === messageHistory[prevUserIndex].id
            )
          : null

      return assistant`${thoughtResponse?.content || 'None'}`
    }
  })

  const finalMessage = user`
  <honcho-response>${honchoHistory.length > 0 ? honchoHistory[honchoHistory.length - 1]?.content || 'None' : 'None'}</honcho-response>
  <pdf-response>${pdfHistory.length > 0 ? pdfHistory[pdfHistory.length - 1]?.content || 'None' : 'None'}</pdf-response>
  <tutor>${messageHistory.length > 0 && !messageHistory[messageHistory.length - 1].isUser ? messageHistory[messageHistory.length - 1]?.content || 'None' : 'None'}</tutor>
  <pdf-available>${hasPDF}</pdf-available>
  <current_message>${currentMessage}</current_message>`

  return [...thoughtWithPDFPrompt, ...thoughtProcessedHistory, finalMessage]
}

export function buildResponsePrompt(
  messageHistory: Message[],
  thoughtHistory: MetaMessage[],
  honchoHistory: MetaMessage[],
  pdfHistory: MetaMessage[],
  currentMessage: string,
  thought: string,
  honchoContent: string,
  pdfContent: string
) {
  const responseHistory = []

  for (let i = 0; i < messageHistory.length; i++) {
    const message = messageHistory[i]

    if (message.isUser) {
      const honchoMessage =
        honchoHistory.find((m) => m.id === message.id)?.content ||
        'No Honcho Message'

      const pdfMessage =
        pdfHistory.find((m) => m.id === message.id)?.content || 'No PDF Message'

      responseHistory.push(
        user`<context>${honchoMessage}</context>
        <pdf_context>${pdfMessage}</pdf_context>
        ${message.content}`
      )

      if (i + 1 < messageHistory.length && !messageHistory[i + 1].isUser) {
        responseHistory.push(assistant`${messageHistory[i + 1].content}`)
      }
    }
  }

  const mostRecentMessage = user`<thought>${thought}</thought>
  <context>${honchoContent}</context>
  <pdf_context>${pdfContent}</pdf_context>
  <current_message>${currentMessage}</current_message>`

  return [...responsePrompt, ...responseHistory, mostRecentMessage]
}

export function buildSummaryPrompt(messages: any[]) {
  const formattedMessages = messages.map((msg) => {
    if (msg.peer_id === 'user') {
      return `User: ${msg.content}`
    }
    return `Assistant: ${msg.content}`
  })

  return [
    {
      role: 'system',
      content:
        'You are a helpful assistant that summarizes conversations. Provide a concise summary of the key points discussed.',
    },
    {
      role: 'user',
      content: `Please summarize this conversation:\n\n${formattedMessages.join('\n')}`,
    },
  ]
}
