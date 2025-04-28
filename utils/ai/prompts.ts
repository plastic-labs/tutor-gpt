import { Message, MetaMessage } from './types';
import { user, assistant } from '../ai';
import thoughtWithPDFPrompt from '@/utils/prompts/thought';
import responsePrompt from '@/utils/prompts/response';

export function extractTagContent(str: string, tagName: string): string {
  try {
    const match = str.match(
      new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`)
    );
    return match ? match[1].trim() : str;
  } catch {
    return str;
  }
}

export function parseHonchoContent(str: string): string {
  return extractTagContent(str, 'honcho');
}

export function parsePDFContent(str: string): string {
  return extractTagContent(str, 'pdf-agent');
}

export function extractSummary(response: string): string | undefined {
  const summary = extractTagContent(response, 'summary');
  if (summary === response) {
    console.warn('Failed to extract summary with expected format');
  }
  return summary;
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
    if (message.is_user) {
      if (i === 0 || i === messageHistory.length - 1) {
        return user`${message.content}`;
      }

      // Find previous AI and user messages
      let prevAiIndex = -1;
      for (let j = i - 1; j >= 0; j--) {
        if (!messageHistory[j].is_user) {
          prevAiIndex = j;
          break;
        }
      }

      let prevUserIndex = -1;
      for (let j = prevAiIndex - 1; j >= 0; j--) {
        if (messageHistory[j].is_user) {
          prevUserIndex = j;
          break;
        }
      }

      const honchoResponse =
        prevUserIndex >= 0
          ? honchoHistory.find(
              (h) => h.message_id === messageHistory[prevUserIndex].id
            )
          : null;

      const pdfResponse =
        prevUserIndex >= 0
          ? pdfHistory.find(
              (p) => p.message_id === messageHistory[prevUserIndex].id
            )
          : null;

      const tutorResponse =
        prevAiIndex >= 0 ? messageHistory[prevAiIndex] : null;

      return user`
      <honcho-response>${honchoResponse?.content || 'None'}</honcho-response>
      <pdf-response>${pdfResponse?.content || 'None'}</pdf-response>
      <tutor>${tutorResponse?.content || 'None'}</tutor>
      ${message.content}`;
    } else {
      let prevUserIndex = -1;
      for (let j = i - 1; j >= 0; j--) {
        if (messageHistory[j].is_user) {
          prevUserIndex = j;
          break;
        }
      }

      const thoughtResponse =
        prevUserIndex >= 0
          ? thoughtHistory.find(
              (t) => t.message_id === messageHistory[prevUserIndex].id
            )
          : null;

      return assistant`${thoughtResponse?.content || 'None'}`;
    }
  });

  const finalMessage = user`
  <honcho-response>${honchoHistory.length > 0 ? honchoHistory[honchoHistory.length - 1]?.content || 'None' : 'None'}</honcho-response>
  <pdf-response>${pdfHistory.length > 0 ? pdfHistory[pdfHistory.length - 1]?.content || 'None' : 'None'}</pdf-response>
  <tutor>${messageHistory.length > 0 && !messageHistory[messageHistory.length - 1].is_user ? messageHistory[messageHistory.length - 1]?.content || 'None' : 'None'}</tutor>
  <pdf-available>${hasPDF}</pdf-available>
  <current_message>${currentMessage}</current_message>`;

  return [...thoughtWithPDFPrompt, ...thoughtProcessedHistory, finalMessage];
}

export function buildResponsePrompt(
  messageHistory: Message[],
  honchoHistory: MetaMessage[],
  pdfHistory: MetaMessage[],
  currentMessage: string,
  honchoContent: string,
  pdfContent: string,
  lastSummary?: string
) {
  const responseHistory = [];

  for (let i = 0; i < messageHistory.length; i++) {
    const message = messageHistory[i];

    if (message.is_user) {
      const honchoMessage =
        honchoHistory.find((m) => m.message_id === message.id)?.content ||
        'No Honcho Message';

      const pdfMessage =
        pdfHistory.find((m) => m.message_id === message.id)?.content ||
        'No PDF Message';

      responseHistory.push(
        user`<context>${honchoMessage}</context>
        <pdf_context>${pdfMessage}</pdf_context>
        ${message.content}`
      );

      if (i + 1 < messageHistory.length && !messageHistory[i + 1].is_user) {
        responseHistory.push(assistant`${messageHistory[i + 1].content}`);
      }
    }
  }

  const summaryMessage = user`<past_summary>${lastSummary || ''}</past_summary>`;
  const mostRecentMessage = user`<context>${honchoContent}</context>
  <pdf_context>${pdfContent}</pdf_context>
  <current_message>${currentMessage}</current_message>`;

  return [
    ...responsePrompt,
    summaryMessage,
    ...responseHistory,
    mostRecentMessage,
  ];
}
