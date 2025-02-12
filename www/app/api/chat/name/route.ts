import { createCompletion, getUserData, user } from '@/utils/ai';
import { namePrompt } from '@/utils/prompts/name';
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
  const prompt = [...namePrompt, finalMessage];

  const completion = await createCompletion(
    prompt,
    {
      sessionId: 'name',
      userId,
      type: 'name',
    },
    {
      max_tokens: 10,
    }
  );

  return NextResponse.json({ name: completion.text });
}
