import { createCompletion, user } from '@/utils/ai';
import { honcho } from '@/utils/honcho';
import summaryPrompt from '@/utils/prompts/summary';
import { NextRequest, NextResponse } from 'next/server';
import { MAX_CONTEXT_SIZE, SUMMARY_SIZE } from '@/utils/prompts/summary';

export const runtime = 'nodejs';
export const maxDuration = 100;
export const dynamic = 'force-dynamic';

// export const MAX_CONTEXT_SIZE = 3;
// export const SUMMARY_SIZE = 2;

interface Message {
  is_user: boolean;
  content: string;
}

export async function POST(req: NextRequest) {
  const {
    conversationId,
    lastMessageOfSummaryId,
    responseHistory,
    lastSummary,
    userId,
    appId,
    anonKey,
  } = await req.json();

  if (anonKey !== process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  console.log('=== Starting Summary Generation ===');

  // Get the most recent MAX_CONTEXT_SIZE messages
  const recentMessages = responseHistory.slice(-MAX_CONTEXT_SIZE);
  console.log('Recent messages:', recentMessages);

  // Get the oldest SUMMARY_SIZE messages from those
  const messagesToSummarize = recentMessages.slice(0, SUMMARY_SIZE);
  console.log('Messages to summarize:', messagesToSummarize);

  // Format messages for summary prompt
  const formattedMessages = messagesToSummarize
    .map((msg: Message) => {
      if (msg.is_user) {
        return `User: ${msg.content}`;
      }
      return `Assistant: ${msg.content}`;
    })
    .join('\n');
  console.log('Formatted messages:', formattedMessages);

  // Create summary prompt with existing summary if available
  const summaryMessages = [
    ...summaryPrompt,
    user`<new_messages>
        ${formattedMessages}
        </new_messages>

        <existing_summary>
        ${lastSummary || ''}
        </existing_summary>`,
  ];
  console.log('Summary messages:', summaryMessages);

  // Get summary response
  console.log('Creating summary completion...');
  const summaryResponse = await createCompletion(summaryMessages, {
    sessionId: conversationId,
    userId,
    type: 'summary',
  });

  if (!summaryResponse) {
    console.error('Failed to get summary response');
    throw new Error('Failed to get summary response');
  }

  console.log('Full response:', summaryResponse);

  // Extract summary from response
  const extractSummary = (response: string): string | undefined => {
    const summaryMatch = response.match(/<summary>([\s\S]*?)<\/summary/);
    if (!summaryMatch) {
      console.warn('Failed to extract summary with expected format');
      // Fallback to using the entire response if it doesn't contain tags
      return response.trim();
    }
    return summaryMatch[1];
  };
  const newSummary = extractSummary(summaryResponse);
  console.log('Extracted summary:', newSummary);

  if (newSummary && lastMessageOfSummaryId) {
    await honcho.apps.users.sessions.metamessages.create(
      appId,
      userId,
      conversationId,
      {
        message_id: lastMessageOfSummaryId,
        metamessage_type: 'summary',
        content: newSummary,
        metadata: { type: 'assistant' },
      }
    );
  }

  console.log('=== Summary Generation Complete ===');

  return NextResponse.json({ success: true });
}
