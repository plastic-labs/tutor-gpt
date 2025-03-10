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
import thoughtWithPDFPrompt from '@/utils/prompts/thoughtWithPDF';
import summaryPrompt from '@/utils/prompts/summary';
import responsePrompt from '@/utils/prompts/response';

export const runtime = 'nodejs';
export const maxDuration = 400;
export const dynamic = 'force-dynamic'; // always run dynamically

// Type definitions
interface ChatCallProps {
  message: string;
  conversationId: string;
  hasPDF?: boolean;
}

interface StreamResponseChunk {
  type: 'thought' | 'honcho' | 'response' | 'pdf';
  text: string;
}

interface Message {
  id: string;
  is_user: boolean;
  content: string;
}

interface MetaMessage {
  message_id: string;
  content: string;
}

interface UserData {
  appId: string;
  userId: string;
}

interface ValidationResult {
  isAuthorized: boolean;
  error?: string;
  status?: number;
  userData?: UserData;
  supabaseUser?: any;
}

// Constants
const MAX_CONTEXT_SIZE = 11;
export const SUMMARY_SIZE = 5;
const encoder = new TextEncoder();

// Helper functions
function stream(
  iterator: AsyncGenerator<Uint8Array, NextResponse | undefined, unknown>
) {
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

function formatStreamChunk(chunk: StreamResponseChunk): Uint8Array {
  return encoder.encode(JSON.stringify(chunk));
}

function parseHonchoContent(str: string): string {
  try {
    const match = str.match(/<honcho>([\s\S]*?)<\/honcho>/);
    return match ? match[1].trim() : str;
  } catch {
    return str;
  }
}

function parsePDFContent(str: string): string {
  try {
    const match = str.match(/<pdf-agent>([\s\S]*?)<\/pdf-agent>/);
    return match ? match[1].trim() : str;
  } catch {
    return str;
  }
}

function extractSummary(response: string): string | undefined {
  const summaryMatch = response.match(/<summary>([\s\S]*?)<\/summary>/);
  if (!summaryMatch) {
    console.warn('Failed to extract summary with expected format');
    // Fallback to using the entire response if it doesn't contain tags
    return response.trim();
  }
  return summaryMatch[1];
}

async function validateUser(): Promise<ValidationResult> {
  const supabase = await createClient();
  const honchoUserData = await getUserData();

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!honchoUserData || !supabaseUser) {
    return { isAuthorized: false, error: 'Unauthorized', status: 401 };
  }

  const { canChat } = await getChatAccessWithUser(supabaseUser.id);

  if (!canChat) {
    return { isAuthorized: false, error: 'Subscription required', status: 402 };
  }

  return {
    isAuthorized: true,
    userData: {
      appId: honchoUserData.appId,
      userId: honchoUserData.userId,
    },
    supabaseUser,
  };
}

async function fetchConversationHistory(
  appId: string,
  userId: string,
  conversationId: string
) {
  const [messageIter, thoughtIter, honchoIter, pdfIter, summaryIter] =
    await Promise.all([
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
          metamessage_type: 'pdf',
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
    ]);

  return {
    messages: Array.from(messageIter.items || []).reverse(),
    thoughts: Array.from(thoughtIter.items || []).reverse(),
    honchoMessages: Array.from(honchoIter.items || []).reverse(),
    pdfMessages: Array.from(pdfIter.items || []).reverse(),
    summaries: Array.from(summaryIter.items || []),
  };
}

function buildThoughtPrompt(
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
  <current_message>${currentMessage}</current_message>`;

  return [
    ...(hasPDF ? thoughtWithPDFPrompt : thoughtPrompt),
    ...thoughtProcessedHistory,
    finalMessage,
  ];
}

function buildResponsePrompt(
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

async function checkAndGenerateSummary(
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

  const newSummary = extractSummary(summary.text);

  if (newSummary) {
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

async function saveConversation(
  appId: string,
  userId: string,
  conversationId: string,
  userMessage: string,
  thought: string,
  honchoContent: string,
  pdfContent: string,
  response: string
) {
  // Save the user message and related metamessages
  const newUserMessage = await honcho.apps.users.sessions.messages.create(
    appId,
    userId,
    conversationId,
    {
      is_user: true,
      content: userMessage,
    }
  );

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

  // Save PDF metamessage
  await honcho.apps.users.sessions.metamessages.create(
    appId,
    userId,
    conversationId,
    {
      message_id: newUserMessage.id,
      metamessage_type: 'pdf',
      content: pdfContent || '',
      metadata: { type: 'assistant' },
    }
  );

  // Save the assistant response
  await honcho.apps.users.sessions.messages.create(
    appId,
    userId,
    conversationId,
    {
      is_user: false,
      content: response,
    }
  );
}

async function* respond({
  message,
  conversationId,
  hasPDF = false,
}: ChatCallProps) {
  // Validate user and permissions
  const userValidation = await validateUser();
  if (!userValidation.isAuthorized) {
    return new NextResponse(userValidation.error, {
      status: userValidation.status,
    });
  }

  // We know userData exists if isAuthorized is true
  const { userData } = userValidation;
  if (!userData) {
    return new NextResponse('User data not found', { status: 500 });
  }

  const { appId, userId } = userData;

  // Fetch conversation history
  const {
    messages: messageHistory,
    thoughts: thoughtHistory,
    honchoMessages: honchoHistory,
    pdfMessages: pdfHistory,
    summaries: summaryHistory,
  } = await fetchConversationHistory(appId, userId, conversationId);

  // Generate thought
  const thoughtPrompt = buildThoughtPrompt(
    messageHistory,
    thoughtHistory,
    honchoHistory,
    pdfHistory,
    message,
    hasPDF
  );
  const { textStream: thoughtStream } = streamText({
    messages: thoughtPrompt,
    metadata: {
      sessionId: conversationId,
      userId,
      type: 'thought',
    },
  });

  let thought = '';
  for await (const chunk of thoughtStream) {
    thought += chunk;
    yield formatStreamChunk({
      type: 'thought',
      text: chunk,
    });
  }

  // Get honcho response
  const honchoQuery = parseHonchoContent(thought);
  const { content: honchoContent } = await honcho.apps.users.sessions.chat(
    appId,
    userId,
    conversationId,
    { queries: honchoQuery }
  );

  yield formatStreamChunk({
    type: 'honcho',
    text: honchoContent,
  });

  // Get PDF response if needed
  let pdfContent = '';
  if (hasPDF) {
    const pdfQuery = parsePDFContent(thought);
    const { content: pdfResponse } = await honcho.apps.users.sessions.chat(
      appId,
      userId,
      conversationId,
      { queries: pdfQuery }
    );
    pdfContent = pdfResponse;

    yield formatStreamChunk({
      type: 'pdf',
      text: pdfContent,
    });
  }

  // Get last summary
  const lastSummary = summaryHistory[0]?.content;

  // Schedule summary generation if needed
  after(async () => {
    await checkAndGenerateSummary(
      appId,
      userId,
      conversationId,
      messageHistory,
      summaryHistory,
      lastSummary
    );
  });

  // Generate response
  const responsePrompt = buildResponsePrompt(
    messageHistory,
    honchoHistory,
    pdfHistory,
    message,
    honchoContent,
    pdfContent,
    lastSummary
  );

  const { textStream: responseStream } = streamText({
    messages: responsePrompt,
    metadata: {
      sessionId: conversationId,
      userId,
      type: 'response',
    },
  });

  let response = '';
  for await (const chunk of responseStream) {
    response += chunk;
    yield formatStreamChunk({
      type: 'response',
      text: chunk,
    });
  }

  // Save conversation data
  after(async () => {
    await saveConversation(
      appId,
      userId,
      conversationId,
      message,
      thought,
      honchoContent,
      pdfContent,
      response
    );
  });

  return new NextResponse(response);
}

export async function POST(req: NextRequest) {
  try {
    const { message, conversationId, hasPDF = false } = await req.json();

    if (!message || !conversationId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    return new Response(stream(respond({ message, conversationId, hasPDF })));
  } catch (error) {
    console.error('Error processing chat request:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
