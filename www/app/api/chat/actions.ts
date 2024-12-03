'use server';
import { honcho } from '@/utils/honcho';
import { readFileSync } from 'fs';
import path from 'path';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function parsePrompt(filePath: string, history: Message[]): Message[] {
  // Read file as buffer
  const buffer = readFileSync(filePath);

  // Decode the cuffer to s tring when needed
  const content = buffer.toString('utf-8');
  const lines = content.split('\n');

  const messages: Message[] = [];
  let currentRole: 'user' | 'assistant' | '' = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line === 'USER:') {
      if (currentRole && currentContent.length) {
        messages.push({
          role: currentRole,
          content: currentContent.join('\n').trim(),
        });
      }
      currentRole = 'user';
      currentContent = [];
    } else if (line === 'ASSISTANT:') {
      if (currentRole && currentContent.length) {
        messages.push({
          role: currentRole,
          content: currentContent.join('\n').trim(),
        });
      }
      currentRole = 'assistant';
      currentContent = [];
    } else if (line === 'MESSAGES:') {
      messages.push(...history);
    } else if (line.trim() !== '') {
      currentContent.push(line);
    }
  }

  // Push the last message if exists
  if (currentRole && currentContent.length) {
    messages.push({
      role: currentRole,
      content: currentContent.join('\n').trim(),
    });
  }

  return messages;
}

export async function thinkCall({
  userInput,
  appId,
  userId,
  sessionId,
}: {
  userInput: string;
  appId: string;
  userId: string;
  sessionId: string;
}) {
  // Get thought history
  const thoughtHistory: Message[] = [];
  const thoughtIter = await honcho.apps.users.sessions.metamessages.list(
    appId,
    userId,
    sessionId,
    {
      metamessage_type: 'thought',
      filter: { type: 'user' },
    }
  );

  for await (const metamessage of thoughtIter) {
    if (metamessage.metadata?.type === 'user') {
      thoughtHistory.push({ role: 'user', content: metamessage.content });
    } else {
      thoughtHistory.push({ role: 'assistant', content: metamessage.content });
    }
  }

  // Get the base prompt messages
  const promptMessages = parsePrompt(
    path.join(process.cwd(), 'utils/prompts/thought.md'),
    thoughtHistory
  );

  // Get most recent honcho response
  const recentResponseMeta = await honcho.apps.users.sessions.metamessages.list(
    appId,
    userId,
    sessionId,
    {
      metamessage_type: 'response',
      filter: { type: 'user' },
      reverse: true,
      size: 1,
    }
  );

  let honchoResponse = 'None';
  let bloomResponse = 'None';

  const responseMetaList = recentResponseMeta.items;
  if (responseMetaList.length > 0) {
    const content = responseMetaList[0].content;
    honchoResponse =
      content.match(/<honcho>(.*?)<\/honcho>/s)?.[1]?.trim() ?? 'None';
    bloomResponse =
      content.match(/<bloom>(.*?)<\/bloom>/s)?.[1]?.trim() ?? 'None';
  }

  const messages = [
    ...promptMessages,
    {
      role: 'user',
      content: `<honcho-response>${honchoResponse}</honcho-response>\n<bloom>${bloomResponse}</bloom>\n${userInput}`,
    },
  ];

  return messages;
}

export async function respondCall({
  userInput,
  appId,
  userId,
  sessionId,
  honchoContent,
}: {
  userInput: string;
  appId: string;
  userId: string;
  sessionId: string;
  honchoContent: string;
}) {
  // Get conversation history
  const history: Message[] = [];
  const responseIter = await honcho.apps.users.sessions.metamessages.list(
    appId,
    userId,
    sessionId,
    {
      metamessage_type: 'response',
    }
  );

  for await (const metamessage of responseIter) {
    const associatedMessage = await honcho.apps.users.sessions.messages.get(
      appId,
      userId,
      sessionId,
      metamessage.message_id
    );

    history.push({ role: 'user', content: metamessage.content });
    history.push({ role: 'assistant', content: associatedMessage.content });
  }

  // Get the base prompt messages
  const promptMessages = parsePrompt(
    path.join(process.cwd(), 'utils/prompts/response.md'),
    history
  );

  const messages = [
    ...promptMessages,
    {
      role: 'user',
      content: `<honcho-response>${honchoContent}</honcho-response>\n${userInput}`,
    },
  ];

  return messages;
}
