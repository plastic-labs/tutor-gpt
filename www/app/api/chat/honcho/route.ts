import { getUserData } from '@/utils/ai';
import { honcho } from '@/utils/honcho';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 100;
export const dynamic = 'force-dynamic'; // always run dynamically


function parseHonchoContent(str) {
  try {
    const match = str.match(/<honcho>(.*?)<\/honcho>/s);
    return match ? match[1].trim() : str;
  } catch (error) {
    return str;
  }
}

export async function POST(req: NextRequest) {
  const { message, thought, conversationId } = await req.json();

  const userData = await getUserData();

  if (!userData) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { appId, userId } = userData;



  const query = `Given the following user message: <user>${message}</user> I had the following message: ${parseHonchoContent(thought)}`

  const dialecticQuery = await honcho.apps.users.sessions.chat(
    appId,
    userId,
    conversationId,
    { queries: query }
  );

  console.log('dialecticQuery:', query);
  console.log('dialecticQuery Response:', dialecticQuery);

  return NextResponse.json({ content: dialecticQuery.content });
}
