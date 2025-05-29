export interface ChatCallProps {
  message: string;
  conversationId: string;
  fileContent?: Promise<string[]>;
}

export interface StreamResponseChunk {
  type: 'thought' | 'honcho' | 'response' | 'pdf' | 'honchoQuery' | 'pdfQuery';
  text: string;
}

export interface Message {
  id: string;
  is_user: boolean;
  content: string;
}

export interface MetaMessage {
  message_id: string | null;
  content: string;
}

export interface UserData {
  appId: string;
  userId: string;
}

export interface ValidationResult {
  isAuthorized: boolean;
  error?: string;
  status?: number;
  userData?: UserData;
  supabaseUser?: any;
}

export interface ConversationHistory {
  messages: Message[];
  thoughts: MetaMessage[];
  honchoMessages: MetaMessage[];
  pdfMessages: MetaMessage[];
  summaries: MetaMessage[];
  collectionId?: string;
}
