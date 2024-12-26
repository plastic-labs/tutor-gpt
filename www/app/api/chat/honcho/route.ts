import { getUserData } from '@/utils/ai';
import { honcho } from '@/utils/honcho';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 100;
export const dynamic = 'force-dynamic'; // always run dynamically

export async function POST(req: NextRequest) {
  const { message, conversationId } = await req.json();

  const userData = await getUserData();

  if (!userData) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { appId, userId } = userData;

  const dialecticQuery = await honcho.apps.users.sessions.chat(
    appId,
    userId,
    conversationId,
    { queries: message }
  );

  console.log('dialecticQuery', dialecticQuery);

  return NextResponse.json({ content: dialecticQuery.content });
}
