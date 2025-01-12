// import { type Reaction } from '@/components/messagebox';

export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  metadata: Record<string, unknown>;
}

export interface Conversation {
  name: string;
  conversationId: string;
}
