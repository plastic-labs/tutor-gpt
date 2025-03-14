import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { ChatMessage } from '@/components/chat/ChatMessage'

export const dynamic = 'force-dynamic'

interface SharedMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  metadata: Record<string, unknown>
}

export default async function SharedConversationPage({
  params
}: {
  params: { shareId: string }
}) {
  const supabase = createServerComponentClient({ cookies })
  const { data: sharedConversation } = await supabase
    .from('shared_conversations')
    .select('*')
    .eq('share_id', params.shareId)
    .eq('is_active', true)
    .single()

  if (!sharedConversation) {
    notFound()
  }

  return (
    <div className="flex-1 overflow-hidden">
      <div className="flex flex-col h-full overflow-hidden bg-zinc-50 dark:bg-zinc-900">
        <div className="flex-1 overflow-hidden">
          <div className="max-w-4xl mx-auto p-4 md:p-8 overflow-auto">
            <div className="rounded-lg border bg-background p-8">
              <h1 className="mb-2 text-lg font-semibold">
                {sharedConversation.title}
              </h1>
              <div className="space-y-4 mt-4">
                {sharedConversation.content.messages.map((message: SharedMessage) => (
                  <ChatMessage
                    key={message.id}
                    message={{
                      id: message.id,
                      content: message.content,
                      isUser: message.role === 'user',
                      metadata: message.metadata,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 