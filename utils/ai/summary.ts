import { honcho } from '@/utils/honcho';
import { Message, MetaMessage } from './types';
import { generateText } from '@/utils/ai';
import summaryPrompt from '@/utils/prompts/summary';
import { user } from '@/utils/ai';
import { extractTagContent } from './prompts';
import { MAX_CONTEXT_SIZE, SUMMARY_SIZE } from './conversation';

export async function checkAndGenerateSummary(
  appId: string,
  userId: string,
  conversationId: string,
  messageHistory: Message[],
  summaryHistory: MetaMessage[],
  lastSummary?: string
) {
  const lastSummaryMessageIndex = messageHistory.findIndex(
    (m) => m.id === summaryHistory[0]?.message_id
  );

  const messagesSinceLastSummary =
    lastSummaryMessageIndex === -1
      ? messageHistory.length
      : messageHistory.length - lastSummaryMessageIndex;

  const needsSummary = messagesSinceLastSummary >= MAX_CONTEXT_SIZE;

  if (!needsSummary) {
    return;
  }

  const lastMessageOfSummary =
    messageHistory[messageHistory.length - MAX_CONTEXT_SIZE + SUMMARY_SIZE];
  if (!lastMessageOfSummary) {
    return;
  }

  const recentMessages = messageHistory.slice(-MAX_CONTEXT_SIZE);
  const messagesToSummarize = recentMessages.slice(0, SUMMARY_SIZE);

  const formattedMessages = messagesToSummarize.map((msg) => {
    if (msg.is_user) {
      return `User: ${msg.content}`;
    }
    return `Assistant: ${msg.content}`;
  });

  const summaryMessages = [
    ...summaryPrompt,
    user`<new_messages>
    ${formattedMessages}
    </new_messages>

    <existing_summary>
    ${lastSummary || ''}
    </existing_summary>`,
  ];

  const summary = await generateText({
    messages: summaryMessages,
    metadata: {
      sessionId: conversationId,
      userId,
      type: 'summary',
    },
  });

  const newSummary = extractTagContent(summary.text, 'summary');

  if (newSummary) {
    await honcho.apps.users.metamessages.create(
      appId,
      userId,
      {
        session_id: conversationId,
        message_id: lastMessageOfSummary.id,
        metamessage_type: 'summary',
        content: newSummary,
        metadata: { type: 'assistant' },
      }
    );
  }
}
