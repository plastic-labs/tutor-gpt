const defaultMessage: Message = {
  text: `I&apos;m your Aristotelian learning companion — here to help you follow your curiosity in whatever direction you like. My engineering makes me extremely receptive to your needs and interests. You can reply normally, and I’ll always respond!\n\nIf I&apos;m off track, just say so!\n\nNeed to leave or just done chatting? Let me know! I’m conversational by design so I’ll say goodbye 😊.`,
  isUser: false,
};

export interface Message {
  text: string;
  isUser: boolean;
}

export class Conversation {
  api: API;
  name: string;
  conversationId: string;

  constructor({
    api,
    name,
    conversationId,
  }: {
    api: API;
    name: string;
    conversationId: string;
  }) {
    this.api = api;
    this.name = name;
    this.conversationId = conversationId;
  }

  async getMessages() {
    const req = await fetch(
      `${this.api.url}/api/messages?` +
      new URLSearchParams({
        conversation_id: this.conversationId,
        user_id: this.api.userId,
      })
    );
    const { messages: rawMessages } = await req.json();
    // console.log(rawMessages);
    if (!rawMessages) return [];
    const messages = rawMessages.map((rawMessage: any) => {
      return {
        text: rawMessage.data.content,
        isUser: rawMessage.type === "human",
      };
    });

    return messages;
  }

  async setName(name: string) {
    if (!name || name === this.name) return;

    await fetch(`${this.api.url}/api/conversations/update`, {
      method: "POST",
      body: JSON.stringify({
        conversation_id: this.conversationId,
        user_id: this.api.userId,
        name,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    this.name = name;
  }

  async delete() {
    await fetch(
      `${this.api.url}/api/conversations/delete?user_id=${this.api.userId}&conversation_id=${this.conversationId}`
    ).then((res) => res.json());
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

  constructor({ url, userId }: { url: string; userId: string }) {
    this.url = url;
    this.userId = userId;
  }

  async new() {
    const req = await fetch(
      `${this.url}/api/conversations/insert?user_id=${this.userId}`
    );
    const { conversation_id } = await req.json();
    return new Conversation({
      api: this,
      name: "",
      conversationId: conversation_id,
    });
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
    // console.log(conversations)
    return conversations.map(
      (conversation) =>
        new Conversation({
          api: this,
          name: conversation.name,
          conversationId: conversation.conversation_id,
        })
    );
  }

  async getMessages(conversationId: string) {
    const req = await fetch(
      `${this.url}/api/messages?` +
      new URLSearchParams({
        conversation_id: conversationId,
        user_id: this.userId,
      })
    );
    const { messages: rawMessages } = await req.json();
    console.log(rawMessages);
    if (!rawMessages) return [];
    const messages: Message[] = rawMessages.map((rawMessage: any) => {
      return {
        text: rawMessage.content,
        isUser: rawMessage.isUser,
      };
    });

    return [defaultMessage, ...messages];
  }
}
