import { type Reaction } from '@/components/messagebox';
import { retryDBOperation, retryOpenAIOperation } from './retryUtils';
import { fetchWithAuth } from './supabase/client';

const defaultMessage: Message = {
  content: `I'm your Aristotelian learning companion — here to help you follow your curiosity in whatever direction you like. My engineering makes me extremely receptive to your needs and interests. You can reply normally, and I’ll always respond!\n\nIf I&apos;m off track, just say so!\n\nNeed to leave or just done chatting? Let me know! I’m conversational by design so I’ll say goodbye 😊.`,
  isUser: false,
  id: '',
};

export interface Message {
  content: string;
  isUser: boolean;
  id: string;
  metadata?: { reaction?: Reaction };
}

export class Conversation {
  // api: API;
  name: string;
  conversationId: string;

  constructor({
    // api,
    name,
    conversationId,
  }: {
    // api: API;
    name: string;
    conversationId: string;
  }) {
    // this.api = api;
    this.name = name;
    this.conversationId = conversationId;
  }
  //
  // async getMessages() {
  //   return retryDBOperation(async () => {
  //     const req = await fetchWithAuth(
  //       `${this.api.url}/api/messages?` +
  //       new URLSearchParams({
  //         conversation_id: this.conversationId,
  //         user_id: this.api.userId,
  //       })
  //     );
  //     const { messages: rawMessages } = await req.json();
  //     if (!rawMessages) return [];
  //     const messages = rawMessages.map((rawMessage: any) => {
  //       return {
  //         text: rawMessage.data.content,
  //         isUser: rawMessage.type === 'human',
  //         id: rawMessage.id,
  //       };
  //     });
  //
  //     return messages;
  //   });
  // }
  //
  // async setName(name: string) {
  //   if (!name || name === this.name) return;
  //
  //   await retryDBOperation(async () => {
  //     await fetchWithAuth(`${this.api.url}/api/conversations/update`, {
  //       method: 'POST',
  //       body: JSON.stringify({
  //         conversation_id: this.conversationId,
  //         user_id: this.api.userId,
  //         name,
  //       }),
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     });
  //     this.name = name;
  //   });
  // }
  //
  // async delete() {
  //   await retryDBOperation(async () => {
  //     await fetchWithAuth(
  //       `${this.api.url}/api/conversations/delete?user_id=${this.api.userId}&conversation_id=${this.conversationId}`
  //     ).then((res) => res.json());
  //   });
  // }
  //
  // async chat(message: string) {
  //   return retryOpenAIOperation(async () => {
  //     const req = await fetchWithAuth(`${this.api.url}/api/stream`, {
  //       method: 'POST',
  //       body: JSON.stringify({
  //         conversation_id: this.conversationId,
  //         user_id: this.api.userId,
  //         message,
  //       }),
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //     });
  //
  //     return req.body?.pipeThrough(new TextDecoderStream()).getReader()!;
  //   });
  // }
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
    return retryDBOperation(async () => {
      const req = await fetchWithAuth(
        `${this.url}/api/conversations/insert?user_id=${this.userId}`
      );
      const { conversation_id } = await req.json();
      return new Conversation({
        api: this,
        name: '',
        conversationId: conversation_id,
      });
    });
  }

  async getConversations() {
    return retryDBOperation(async () => {
      const req = await fetchWithAuth(
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
            name: conversation.name,
            conversationId: conversation.conversation_id,
          })
      );
    });
  }

  async getMessagesByConversation(conversationId: string) {
    return retryDBOperation(async () => {
      const req = await fetchWithAuth(
        `${this.url}/api/messages?` +
        new URLSearchParams({
          conversation_id: conversationId,
          user_id: this.userId,
        })
      );
      const { messages: rawMessages } = await req.json();
      if (!rawMessages) return [];
      const messages: Message[] = rawMessages.map((rawMessage: any) => {
        return {
          ...rawMessage,
          text: rawMessage.content,
          isUser: rawMessage.isUser,
          id: rawMessage.id,
          metadata: rawMessage.metadata,
        };
      });

      return [defaultMessage, ...messages];
    });
  }

  async getThoughtById(
    conversationId: string,
    messageId: string
  ): Promise<string | null> {
    return retryDBOperation(async () => {
      try {
        const response = await fetchWithAuth(
          `${this.url}/api/thought/${messageId}?user_id=${this.userId}&conversation_id=${conversationId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch thought');
        }

        const data = await response.json();
        return data.thought;
      } catch (error) {
        console.error('Error fetching thought:', error);
        return null;
      }
    });
  }

  async addReaction(
    conversationId: string,
    messageId: string,
    reaction: Exclude<Reaction, null>
  ): Promise<{ status: string }> {
    return retryDBOperation(async () => {
      try {
        const response = await fetchWithAuth(
          `${this.url}/api/reaction/${messageId}?user_id=${this.userId}&conversation_id=${conversationId}&reaction=${reaction}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to add reaction');
        }

        return await response.json();
      } catch (error) {
        console.error('Error adding reaction:', error);
        throw error;
      }
    });
  }

  async getReaction(
    conversationId: string,
    messageId: string
  ): Promise<{ reaction: Reaction }> {
    return retryDBOperation(async () => {
      try {
        const response = await fetchWithAuth(
          `${this.url}/api/reaction/${messageId}?user_id=${this.userId}&conversation_id=${conversationId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to get reaction');
        }

        const data = await response.json();

        // Validate the reaction
        if (
          data.reaction !== null &&
          !['thumbs_up', 'thumbs_down'].includes(data.reaction)
        ) {
          throw new Error('Invalid reaction received from server');
        }

        return data as { reaction: Reaction };
      } catch (error) {
        console.error('Error getting reaction:', error);
        throw error;
      }
    });
  }

  async addOrRemoveReaction(
    conversationId: string,
    messageId: string,
    reaction: Reaction
  ): Promise<{ status: string }> {
    try {
      const response = await fetchWithAuth(
        `${this.url}/api/reaction/${messageId}?user_id=${this.userId}&conversation_id=${conversationId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reaction: reaction || undefined }),
        }
      );
      if (!response.ok) {
        throw new Error('Failed to update reaction');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating reaction:', error);
      throw error;
    }
  }
}
