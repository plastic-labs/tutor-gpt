import { createCompletion, getUserData, user } from '@/utils/ai';
import { summaryPrompt } from '@/utils/prompts/summary';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  const userData = await getUserData();
  if (!userData) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { userId } = userData;

  const finalMessage = user`${message}`;
  const prompt = [...summaryPrompt, finalMessage];

  const completion = await createCompletion(prompt, {
    sessionId: 'summary',
    userId,
    type: 'summary',
  });

  return NextResponse.json({ summary: completion.text });
}
