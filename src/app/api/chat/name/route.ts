import { type NextRequest, NextResponse } from 'next/server'
import { createCompletion, user } from '@/utils/ai'
import { validateUser } from '@/utils/ai/validation'
import { namePrompt } from '@/utils/prompts/name'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { message } = await req.json()

  const validation = await validateUser()
  if (!validation.isAuthorized) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { userId } = validation.userData!

  const finalMessage = user`${message}`
  const prompt = [...namePrompt, finalMessage]

  const name = await createCompletion(
    prompt,
    {
      sessionId: 'name',
      userId,
      type: 'name',
    },
    {
      max_tokens: 10,
    }
  )

  return NextResponse.json({ name })
}
