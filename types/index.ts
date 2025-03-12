export interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: Date
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