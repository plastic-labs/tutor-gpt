import { Session } from "@supabase/supabase-js";
import getId from "./supabase";

export interface Message {
  text: string;
  isUser: boolean;
}

export class Conversation {
  api: API;
  conversationId: string;

  constructor({ api, conversationId }: { api: API; conversationId: string }) {
    this.api = api;
    this.conversationId = conversationId;
  }

  async getMessages() {
    const req = await fetch(
      `${this.api.url}/api/messages/get?` +
        new URLSearchParams({
          conversation_id: this.conversationId,
          user_id: this.api.userId,
        })
    );
    const { messages } = await req.json();
    return messages;
  }

  async chat(message: string) {
    const req = await fetch(`${this.api.url}/api/stream`, {
      method: "POST",
      body: JSON.stringify({
        conversation_id: this.conversationId,
        user_id: this.api.userId,
        message,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const reader = req.body?.pipeThrough(new TextDecoderStream()).getReader()!;
    return reader;
  }
}

interface RawConversation {
  conversation_id: string;
  name: string;
}

export class API {
  url: string;
  userId: string;
  session: Session | null;

  constructor({
    url,
    userId,
    session,
  }: {
    url: string;
    userId: string;
    session: Session | null;
  }) {
    this.url = url;
    this.userId = userId;
    this.session = session;
  }

  static async create(url: string) {
    const { userId, session } = await getId();
    const api = new API({ url, userId, session });
    return api;
  }

  async new() {
    const req = await fetch(
      `${this.url}/api/conversations/insert?user_id=${this.userId}`
    );
    const { conversation_id } = await req.json();
    return new Conversation({ api: this, conversationId: conversation_id });
  }

  async getConversations() {
    const req = await fetch(
      `${this.url}/api/conversations/get?user_id=${this.userId}`
    );
    const { conversations }: { conversations: RawConversation[] } =
      await req.json();

    if (conversations.length === 0) {
      return [await this.new()];
    }
    return conversations.map(
      (conversation) =>
        new Conversation({
          api: this,
          conversationId: conversation.conversation_id,
        })
    );
  }
}
