export interface Message {
  id: string
  content: string
  role?: 'user' | 'assistant'
  isUser: boolean
  metadata: Record<string, unknown>
}

export interface Conversation {
  name: string
  conversationId: string
}

export interface SharedConversation {
  id: string
  user_id: string
  title: string
  content: {
    messages: Message[]
  }
  share_id: string
  created_at: string
  expires_at?: string
  is_active: boolean
} 