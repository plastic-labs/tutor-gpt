import {
  getUserData,
  user,
  assistant,
  streamText,
  generateText,
} from '@/utils/ai';
import { honcho } from '@/utils/honcho';
import { createClient } from '@/utils/supabase/server';
import { getChatAccessWithUser } from '@/utils/supabase/actions';
import { after, NextRequest, NextResponse } from 'next/server';
import thoughtPrompt from '@/utils/prompts/thought';
import summaryPrompt from '@/utils/prompts/summary';
import responsePrompt from '@/utils/prompts/response';

export const runtime = 'nodejs';
export const maxDuration = 100;
export const dynamic = 'force-dynamic'; // always run dynamically

interface ChatCallProps {
  message: string;
  conversationId: string;
}

function stream(iterator: any) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();

      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
  });
}

interface StreamResponseChunk {
  type: 'thought' | 'honcho' | 'response';
  text: string;
}

const encode = new TextEncoder().encode;

function out(chunk: StreamResponseChunk) {
  return encode(JSON.stringify(chunk));
}

function parseHonchoContent(str: string) {
  try {
    const match = str.match(/<honcho>([\s\S]*?)<\/honcho>/);
    return match ? match[1].trim() : str;
  } catch {
    return str;
  }
}

const extractSummary = (response: string): string | undefined => {
  const summaryMatch = response.match(/<summary>([\s\S]*?)<\/summary>/);
  if (!summaryMatch) {
    console.warn('Failed to extract summary with expected format');
    // Fallback to using the entire response if it doesn't contain tags
    return response.trim();
  }
  return summaryMatch[1];
};

const MAX_CONTEXT_SIZE = 11;
export const SUMMARY_SIZE = 5;

async function* respond({ message, conversationId }: ChatCallProps) {
  const supabase = await createClient();
  const honchoUserData = await getUserData();

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!honchoUserData || !supabaseUser) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { canChat } = await getChatAccessWithUser(supabaseUser.id);

  if (!canChat) {
    return new NextResponse('Subscription required', { status: 402 });
  }

  const { appId, userId } = honchoUserData;

  const [messageIter, thoughtIter, honchoIter, summaryIter] = await Promise.all(
    [
      honcho.apps.users.sessions.messages.list(appId, userId, conversationId, {
        reverse: true,
        size: MAX_CONTEXT_SIZE,
      }),
      honcho.apps.users.sessions.metamessages.list(
        appId,
        userId,
        conversationId,
        {
          metamessage_type: 'thought',
          reverse: true,
          size: MAX_CONTEXT_SIZE,
        }
      ),
      honcho.apps.users.sessions.metamessages.list(
        appId,
        userId,
        conversationId,
        {
          metamessage_type: 'honcho',
          reverse: true,
          size: MAX_CONTEXT_SIZE,
        }
      ),
      honcho.apps.users.sessions.metamessages.list(
        appId,
        userId,
        conversationId,
        {
          metamessage_type: 'summary',
          reverse: true,
          size: 1,
        }
      ),
    ]
  );

  const messageHistory = Array.from(messageIter.items || []).reverse();
  const thoughtHistory = Array.from(thoughtIter.items || []).reverse();
  const honchoHistory = Array.from(honchoIter.items || []).reverse();
  const summaryHistory = Array.from(summaryIter.items || []);

  const thoughtProcessedHistory = messageHistory.map((message, i) => {
    if (message.is_user) {
      if (i == 0) {
        return user`${message.content}`;
      }
      const lastUserMessage = messageHistory[i - 2];
      const honchoResponse = honchoHistory.find(
        (h) => h.message_id === lastUserMessage.id
      );
      const tutorResponse = messageHistory[i - 1];

      return user`
      <honcho-response>${honchoResponse?.content || 'None'}</honcho-response>
      <tutor>${tutorResponse?.content || 'None'}</tutor>
      ${message.content}`;
    } else {
      const lastUserMessage = messageHistory[i - 1];
      const thoughtResponse = thoughtHistory.find(
        (t) => t.message_id === lastUserMessage.id
      );
      return assistant`${thoughtResponse?.content || 'None'}`;
    }
  });

  const finalMessage = user`
  <honcho-response>${honchoHistory[honchoHistory.length - 1]?.content || 'None'}</honcho-response>
  <tutor>${messageHistory[messageHistory.length - 1]?.content || 'None'}</tutor>
  ${message}`;

  const combinedThoughtPrompt = [
    ...thoughtPrompt,
    ...thoughtProcessedHistory,
    finalMessage,
  ];

  const { textStream: thoughtStream } = streamText({
    messages: combinedThoughtPrompt,
    metadata: {
      sessionId: conversationId,
      userId,
      type: 'thought',
    },
  });

  let thought = '';

  for await (const chunk of thoughtStream) {
    thought += chunk;
    yield out({
      type: 'thought',
      text: chunk,
    });
  }

  const query = `Given the following user message: <user>${message}</user> I had the following message: ${parseHonchoContent(thought)}`;

  const { content: honchoContent } = await honcho.apps.users.sessions.chat(
    appId,
    userId,
    conversationId,
    { queries: query }
  );

  yield out({
    type: 'honcho',
    text: honchoContent,
  });

  const lastSummary = summaryHistory[0]?.content;

  const lastSummaryMessageIndex = messageHistory.findIndex(
    (m) => m.id === summaryHistory[0]?.message_id
  );

  const messagesSinceLastSummary =
    lastSummaryMessageIndex === -1
      ? messageHistory.length
      : messageHistory.length - lastSummaryMessageIndex;

  const needsSummary = messagesSinceLastSummary >= MAX_CONTEXT_SIZE;

  const lastMessageOfSummary = needsSummary
    ? messageHistory[messageHistory.length - MAX_CONTEXT_SIZE + SUMMARY_SIZE]
    : undefined;

  after(async () => {
    if (needsSummary && lastMessageOfSummary) {
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

      const newSummary = extractSummary(summary.text);

      if (newSummary && lastMessageOfSummary) {
        await honcho.apps.users.sessions.metamessages.create(
          appId,
          userId,
          conversationId,
          {
            message_id: lastMessageOfSummary.id,
            metamessage_type: 'summary',
            content: newSummary,
            metadata: { type: 'assistant' },
          }
        );
      }
    }
  });

  const getHonchoMessage = (id: string) =>
    honchoHistory.find((m) => m.message_id === id)?.content ||
    'No Honcho Message';

  const responseHistory = messageHistory.map((message) => {
    if (message.is_user) {
      return user`<context>${getHonchoMessage(message.id)}</context>
      ${message.content}`;
    } else {
      return assistant`${message.content}`;
    }
  });

  const summaryMessage = user`<past_summary>${lastSummary}</past_summary>`;
  const mostRecentMessage = user`<context>${honchoContent}</context>
  ${messageHistory[messageHistory.length - 1]?.content}`;

  const combinedResponsePrompt = [
    ...responsePrompt,
    summaryMessage,
    ...responseHistory,
    mostRecentMessage,
  ];
  const { textStream: responseStream } = streamText({
    messages: combinedResponsePrompt,
    metadata: {
      sessionId: conversationId,
      userId,
      type: 'response',
    },
  });

  let response = '';

  for await (const chunk of responseStream) {
    response += chunk;
    yield out({
      type: 'response',
      text: chunk,
    });
  }

  after(async () => {
    await Promise.all([
      // Save the user message
      honcho.apps.users.sessions.messages
        .create(appId, userId, conversationId, {
          is_user: true,
          content: message,
        })
        .then(async (newUserMessage) => {
          // Save the thought metamessage
          await honcho.apps.users.sessions.metamessages.create(
            appId,
            userId,
            conversationId,
            {
              message_id: newUserMessage.id,
              metamessage_type: 'thought',
              content: thought || '',
              metadata: { type: 'assistant' },
            }
          );

          // Save honcho metamessage
          await honcho.apps.users.sessions.metamessages.create(
            appId,
            userId,
            conversationId,
            {
              message_id: newUserMessage.id,
              metamessage_type: 'honcho',
              content: honchoContent || '',
              metadata: { type: 'assistant' },
            }
          );
        }),
    ]);

    await honcho.apps.users.sessions.messages.create(
      appId,
      userId,
      conversationId,
      {
        is_user: false,
        content: response,
      }
    );
  });

  return new NextResponse(response);
}

export async function POST(req: NextRequest) {
  const { message, conversationId } = await req.json();

  return new Response(stream(respond({ message, conversationId })));
}
