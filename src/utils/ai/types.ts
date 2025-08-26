export interface Message {
  id: string
  content: string
  isUser: boolean
  metadata?: Record<string, unknown>
  thinking?: ThinkingData
}

export interface ThinkingData {
  thought: string
  thoughtFinished: boolean
  honchoQuery: string
  honcho: string
  pdfQuery: string
  pdf: string
}

export interface MetaMessage {
  id: string
  content: string
  metadata?: Record<string, unknown>
}

export interface StreamResponseChunk {
  type: 'thought' | 'response' | 'honcho' | 'pdf' | 'honchoQuery' | 'pdfQuery'
  content: string
  finished: boolean
}

export interface ChatCallProps {
  message: string
  conversationId: string
  fileContent?: Promise<string[]>
}

export interface ValidationResult {
  isAuthorized: boolean
  error?: string
  status?: number
  userData?: UserData
  supabaseUser?: any
}

export interface UserData {
  userId: string
}

export interface ConversationHistory {
  messages: Message[]
  thoughts: MetaMessage[]
  honchoMessages: MetaMessage[]
  pdfMessages: MetaMessage[]
  collectionId?: string
}
