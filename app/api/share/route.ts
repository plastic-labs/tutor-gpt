import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

// POST /api/share - Create a new shared conversation
export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { title, content } = await req.json()

    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Generate a unique share ID
    const shareId = nanoid(10)

    // Insert the shared conversation
    const { data, error } = await supabase
      .from('shared_conversations')
      .insert({
        user_id: session.user.id,
        title,
        content,
        share_id: shareId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error sharing conversation:', error)
      return NextResponse.json(
        { error: 'Failed to share conversation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in share route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/share/:shareId - Get a shared conversation by ID
export async function GET(
  req: Request,
  { params }: { params: { shareId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const shareId = params.shareId

    // Get the shared conversation
    const { data, error } = await supabase
      .from('shared_conversations')
      .select('*')
      .eq('share_id', shareId)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Shared conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in share route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 