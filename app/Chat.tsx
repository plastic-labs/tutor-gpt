'use client';
import useSWR from 'swr';

import dynamic from 'next/dynamic';

import { FaLightbulb, FaPaperPlane, FaFileUpload } from 'react-icons/fa';
import Swal from 'sweetalert2';

import { useRef, useEffect, useState, ElementRef, useMemo } from 'react';
// import { useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';

// import { createClient } from '@/utils/supabase/client';
import { Reaction } from '@/components/messagebox';
import { FiMenu } from 'react-icons/fi';
import Link from 'next/link';
import { getFreeMessageCount, useFreeTrial } from '@/utils/supabase/actions';
import {
  getConversations,
  createConversation,
  updateConversation,
} from './actions/conversations';
import { getMessages, addOrRemoveReaction } from './actions/messages';
import { Conversation, Message } from '@/utils/types';
import { localStorageProvider } from '@/utils/swrCache';

import useAutoScroll from '@/hooks/autoscroll';
import MessageList from '@/components/MessageList';
import { MessageListRef } from '@/components/MessageList';

const Thoughts = dynamic(() => import('@/components/thoughts'), {
  ssr: false,
});

const Sidebar = dynamic(() => import('@/components/sidebar'), {
  ssr: false,
});

interface StreamResponseChunk {
  type: 'thought' | 'honcho' | 'response' | 'pdf';
  text: string;
}

class StreamReader {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private decoder: TextDecoder;
  private buffer: string;

  constructor(stream: ReadableStream<Uint8Array>) {
    this.reader = stream.getReader();
    this.decoder = new TextDecoder();
    this.buffer = '';
  }

  private tryParseNextJSON(): {
    parsed: StreamResponseChunk | null;
    remaining: string;
  } {
    let curlyBraceCount = 0;
    let startIndex = -1;

    // Find the start of the next JSON object
    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i] === '{') {
        if (startIndex === -1) startIndex = i;
        curlyBraceCount++;
      } else if (this.buffer[i] === '}') {
        curlyBraceCount--;
        if (curlyBraceCount === 0 && startIndex !== -1) {
          // We found a complete JSON object
          try {
            const jsonStr = this.buffer.substring(startIndex, i + 1);
            const parsed = JSON.parse(jsonStr) as StreamResponseChunk;
            return {
              parsed,
              remaining: this.buffer.substring(i + 1),
            };
          } catch (e) {
            // If we can't parse this as JSON, keep looking
            continue;
          }
        }
      }
    }

    // No complete JSON object found
    return { parsed: null, remaining: this.buffer };
  }

  async read(): Promise<{ done: boolean; chunk?: StreamResponseChunk }> {
    while (true) {
      // Try to parse any complete JSON object from our buffer
      const { parsed, remaining } = this.tryParseNextJSON();
      if (parsed) {
        this.buffer = remaining;
        return { done: false, chunk: parsed };
      }

      // If we couldn't parse anything, we need more data
      const { done, value } = await this.reader.read();

      if (done) {
        // Only return done if the reader is actually finished and we have no remaining buffer
        if (this.buffer.trim()) {
          console.warn('Stream ended with unparsed data:', this.buffer);
        }
        return { done: true };
      }

      // Append new data to our buffer and continue trying to parse
      this.buffer += this.decoder.decode(value, { stream: true });
    }
  }

  release() {
    this.reader.releaseLock();
  }
}

async function fetchConsolidatedStream(
  message: string,
  conversationId: string,
  file?: File
) {
  try {
    const formData = new FormData();
    formData.append('message', message);
    formData.append('conversationId', conversationId);
    if (file) {
      formData.append('file', file);
    }

    const response = await fetch(`/api/chat`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 402) {
        Swal.fire({
          title: 'Subscription Required',
          text: 'You have no active subscription. Subscribe to continue using Bloom!',
          icon: 'warning',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Subscribe',
          showCancelButton: false,
        });
        throw new Error(`Subscription is required to chat: ${response.status}`);
      }
      const errorText = await response.text();
      console.error(`Stream error:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      console.error(response);
      throw new Error(`Failed to fetch stream: ${response.status}`);
    }

    const stream = response.body;
    if (!stream) throw new Error('Failed to get stream');
    return stream;
  } catch (error) {
    console.error(`Error in fetchConsolidatedStream:`, error);
    throw error;
  }
}

interface ChatProps {
  initialUserId: string;
  initialEmail: string | undefined;
  initialConversations: Conversation[];
  initialChatAccess: {
    isSubscribed: boolean;
    freeMessages: number;
    canChat: boolean;
  };
  initialMessages: Message[];
  initialConversationId: string | null | undefined;
}

export default function Chat({
  initialUserId,
  initialEmail,
  initialConversations,
  initialMessages,
  initialConversationId,
  initialChatAccess,
}: ChatProps) {
  const [userId] = useState(initialUserId);
  const [isSubscribed] = useState(initialChatAccess.isSubscribed);
  const [freeMessages, setFreeMessages] = useState(
    initialChatAccess.freeMessages
  );
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId || undefined
  );

  const [isThoughtsOpenState, setIsThoughtsOpenState] =
    useState<boolean>(false);
  const [openThoughtMessageId, setOpenThoughtMessageId] = useState<
    string | null
  >(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const [thought, setThought] = useState<string>('');
  const [canSend, setCanSend] = useState<boolean>(false);

  const posthog = usePostHog();
  const input = useRef<ElementRef<'textarea'>>(null);
  const messageContainerRef = useRef<ElementRef<'section'>>(null);
  useAutoScroll(messageContainerRef);

  const messageListRef = useRef<MessageListRef>(null);
  const firstChat = useMemo(() => {
    return (
      !initialConversations?.length ||
      (initialConversations.length === 1 && !initialMessages?.length) ||
      initialChatAccess.freeMessages === 50
    );
  }, [
    initialConversations?.length,
    initialMessages?.length,
    initialChatAccess.freeMessages,
  ]);

  // Since this message is just rendered in the UI, this naive check may result in edge cases where the incorrect message is shown.
  // (Ex. will show on all chats after creating a new session or messaging Bloom, even the first chat).
  // Also, clearing chats will revert the message to the initial description.
  const defaultMessage: Message = {
    content: `${firstChat ? "I'm Bloom, your Aristotelian learning companion," : "Welcome back! I'm"} here to guide your intellectual journey.

The more we chat, the more I learn about you as a person. That helps me adapt to your interests and needs.

What's on your mind? Let's dive in. 🌱`,
    isUser: false,
    id: '',
    metadata: {},
  };

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      posthog?.identify(initialUserId, { email: initialEmail });
      posthog?.capture('page_view', {
        page: 'chat',
      });
    }
  }, [posthog, initialUserId, initialEmail]);

  const setIsThoughtsOpen = (
    isOpen: boolean,
    messageId: string | null = null
  ) => {
    setIsThoughtsOpenState(isOpen);
    setOpenThoughtMessageId(isOpen ? messageId : null);
  };

  const conversationsFetcher = async () => {
    const result = await getConversations();
    return result;
  };

  const conversationsKey = useMemo(() => userId, [userId]);

  const { data: conversations, mutate: mutateConversations } = useSWR(
    conversationsKey,
    conversationsFetcher,
    {
      fallbackData: initialConversations,
      provider: localStorageProvider,
      onSuccess: async (conversations) => {
        if (conversations.length) {
          // If there are existing conversations:
          // 1. Set the current conversation to the first one if none is selected
          // 2. Or if the selected conversation doesn't exist in the list
          if (
            !conversationId ||
            !conversations.find((c) => c.conversationId === conversationId)
          ) {
            setConversationId(conversations[0].conversationId);
          }
          setCanSend(true);
        } else {
          // If no conversations exist:
          // 1. Create a new conversation
          // 2. Set it as the current conversation
          // 3. Refresh the conversations list
          const newConvo = await createConversation();
          setConversationId(newConvo?.conversationId);
          await mutateConversations();
        }
      },
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      revalidateIfStale: false,
      revalidateOnMount: true,
    }
  );

  const messagesFetcher = async (conversationId: string) => {
    if (!userId) return Promise.resolve([]);
    if (!conversationId) return Promise.resolve([]);
    if (conversationId.startsWith('temp-')) return Promise.resolve([]);

    return getMessages(conversationId);
  };

  const messagesKey = useMemo(
    () => (conversationId ? ['messages', conversationId] : null),
    [conversationId]
  );

  const {
    data: messages,
    mutate: mutateMessages,
    isLoading: messagesLoading,
  } = useSWR(messagesKey, () => messagesFetcher(conversationId!), {
    fallbackData: initialMessages,
    provider: localStorageProvider,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
    onSuccess: () => {
      if (conversationId?.startsWith('temp-')) {
        mutateMessages([], false);
      }
    },
  });

  const handleReactionAdded = async (messageId: string, reaction: Reaction) => {
    if (!userId || !conversationId) return;

    try {
      await addOrRemoveReaction(conversationId, messageId, reaction);

      // Optimistically update the local data
      mutateMessages(
        (currentMessages) => {
          if (!currentMessages) return currentMessages;
          return currentMessages.map((msg) => {
            if (msg.id === messageId) {
              return {
                ...msg,
                metadata: {
                  ...msg.metadata,
                  reaction,
                },
              };
            }
            return msg;
          });
        },
        { revalidate: false }
      );
    } catch (error) {
      console.error('Failed to update reaction:', error);
    }
  };

  async function processName(messageToSend: string, conversationId: string) {
    try {
      const nameResponse = await fetch('/api/chat/name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
        }),
      });

      if (nameResponse.ok) {
        const { name } = await nameResponse.json();
        if (name !== 'NA') {
          await updateConversation(conversationId, name);
          await mutateConversations();
        }
      }
    } catch (error) {
      console.error('Failed to process name:', error);
    }
  }

  async function chat(message?: string) {
    const rawMessage = message || input.current?.value;
    if (!userId || !rawMessage) return;

    // Process message to have double newline for markdown
    const messageToSend = rawMessage.replace(/\n/g, '\n\n');

    if (input.current) input.current.value = '';

    setCanSend(false);

    const newMessages = [
      ...messages!,
      {
        content: messageToSend,
        isUser: true,
        id: '',
        metadata: {},
      },
      {
        content: '',
        isUser: false,
        id: '',
        metadata: {},
      },
    ];
    await mutateMessages(newMessages, { revalidate: false });
    messageListRef.current?.scrollToBottom();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    let thoughtText = '';
    let currentModelOutput = '';

    try {
      // Check if we should generate a summary (name) for the conversation
      const isFirstChat = messages?.length === 0;
      const isUntitledConversation =
        conversations?.find((c) => c.conversationId === conversationId)
          ?.name === 'Untitled';
      const shouldGenerateSummary = isFirstChat || isUntitledConversation;

      if (shouldGenerateSummary) {
        processName(messageToSend, conversationId!).catch(console.error);
      }

      // Get the consolidated stream
      const stream = await fetchConsolidatedStream(
        messageToSend,
        conversationId!,
        selectedFile || undefined
      );

      const streamReader = new StreamReader(stream);

      // Process the stream
      while (true) {
        const { done, chunk } = await streamReader.read();
        if (done) {
          console.log('done');
          if (!isSubscribed) {
            const success = await useFreeTrial(userId);
            if (success) {
              const newCount = await getFreeMessageCount(userId);
              setFreeMessages(newCount);
            }
          }
          break;
        }

        if (!chunk) {
          console.log('waiting');
          continue;
        }

        console.log(chunk.text);

        switch (chunk.type) {
          case 'thought':
            thoughtText += chunk.text;
            setThought(thoughtText);
            break;

          case 'honcho':
            // Update the thought with honcho response
            const updatedThought =
              thoughtText + '\n\nHoncho Dialectic Response:\n\n' + chunk.text;
            setThought(updatedThought);
            break;

          case 'pdf':
            // Update the thought with PDF response
            const updatedThoughtWithPDF =
              thoughtText + '\n\nPDF Analysis:\n\n' + chunk.text;
            setThought(updatedThoughtWithPDF);
            break;

          case 'response':
            currentModelOutput += chunk.text;
            mutateMessages(
              [
                ...(newMessages?.slice(0, -1) || []),
                {
                  content: currentModelOutput,
                  isUser: false,
                  id: '',
                  metadata: {},
                },
              ],
              { revalidate: false }
            );
            messageListRef.current?.scrollToBottom();
            break;
        }
      }

      streamReader.release();

      // Clear selected file after successful upload
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await mutateMessages();

      messageListRef.current?.scrollToBottom();
      setCanSend(true);
    } catch (error) {
      console.error('Chat error:', error);

      // Preserve the message even in case of error if we have content
      if (currentModelOutput) {
        mutateMessages(
          [
            ...(newMessages?.slice(0, -1) || []),
            {
              content:
                currentModelOutput ||
                'Sorry, there was an error generating a response.',
              isUser: false,
              id: '',
              metadata: {},
            },
          ],
          { revalidate: false }
        );
      } else {
        await mutateMessages();
      }

      messageListRef.current?.scrollToBottom();
      setCanSend(true);
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsUploading(true);
    }
  };

  const canUseApp = useMemo(
    () => isSubscribed || freeMessages > 0,
    [isSubscribed, freeMessages]
  );

  useEffect(() => {
    if (conversationId?.startsWith('temp-') || messagesLoading) {
      setCanSend(false);
    } else {
      setCanSend(true);
    }
  }, [conversationId, messagesLoading]);

  return (
    <main className="relative flex h-full overflow-hidden">
      <Sidebar
        conversations={conversations || []}
        mutateConversations={mutateConversations}
        conversationId={conversationId}
        setConversationId={setConversationId}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        canUseApp={canUseApp}
      />
      <div className="flex-1 flex flex-col grow overflow-hidden">
        {!isSidebarOpen && (
          <button
            className={`absolute top-3 left-4 z-30 lg:hidden bg-neon-green text-black rounded-lg p-2 border border-black`}
            onClick={() => setIsSidebarOpen(true)}
          >
            <FiMenu size={24} />
          </button>
        )}
        {!isSubscribed && (
          <section className="h-[63px] w-full bg-neon-green text-black text-center flex items-center justify-center shrink-0">
            <p className="lg:ml-0 ml-12">
              {freeMessages === 0
                ? "You've used all your free messages"
                : `${freeMessages} free messages remaining`}
              .{' '}
              <Link
                className="cursor-pointer hover:cursor-pointer font-bold underline"
                href="/settings"
              >
                Subscribe now
              </Link>{' '}
              {freeMessages === 0 ? 'to use Bloom!' : 'for unlimited access!'}
            </p>
          </section>
        )}
        <div className="flex flex-col grow overflow-hidden bg-secondary">
          <MessageList
            ref={messageListRef}
            messages={messages}
            defaultMessage={defaultMessage}
            userId={userId}
            conversationId={conversationId}
            messagesLoading={messagesLoading}
            handleReactionAdded={handleReactionAdded}
            setThoughtParent={setThought}
            openThoughtMessageId={openThoughtMessageId}
            setIsThoughtsOpen={setIsThoughtsOpen}
          />
          <div className="p-3 pb-0 lg:p-5 lg:pb-0">
            {messages!.length > 1 && (
              <div className="disclaimer-text text-center mb-2">
                Bloom can make mistakes. Always double-check important
                information.
              </div>
            )}
            <form
              id="send"
              className="flex p-3 lg:p-5 gap-3 border-gray-300"
              onSubmit={(e) => {
                e.preventDefault();
                if (canSend && input.current?.value && canUseApp) {
                  posthog.capture('user_sent_message');
                  chat();
                }
              }}
            >
              <textarea
                ref={input}
                placeholder={
                  canUseApp
                    ? selectedFile
                      ? `Selected file: ${selectedFile.name}`
                      : 'Type a message...'
                    : 'Subscribe to send messages'
                }
                className={`flex-1 px-3 py-1 lg:px-5 lg:py-3 bg-accent text-gray-400 rounded-2xl border-2 resize-none outline-hidden focus:outline-hidden ${
                  canSend && canUseApp
                    ? 'border-green-200 focus:border-green-200'
                    : 'border-red-200 focus:border-red-200 opacity-50'
                }`}
                rows={1}
                disabled={!canUseApp}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend && input.current?.value && canUseApp) {
                      posthog.capture('user_sent_message');
                      chat();
                    }
                  }
                }}
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.txt"
                className="hidden"
              />
              <button
                className={`bg-foreground dark:bg-accent text-neon-green rounded-full px-4 py-2 lg:px-7 lg:py-3 flex justify-center items-center gap-2 ${
                  selectedFile ? 'bg-green-500' : ''
                }`}
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canUseApp}
              >
                <FaFileUpload className="inline" />
              </button>
              <button
                className="bg-foreground dark:bg-accent text-neon-green rounded-full px-4 py-2 lg:px-7 lg:py-3 flex justify-center items-center gap-2"
                type="submit"
                disabled={!canSend || !canUseApp}
              >
                <FaPaperPlane className="inline" />
              </button>
              <button
                className="bg-foreground dark:bg-accent text-neon-green rounded-full px-4 py-2 lg:px-7 lg:py-3 flex justify-center items-center gap-2"
                onClick={() => setIsThoughtsOpen(true)}
                type="button"
              >
                <FaLightbulb className="inline" />
              </button>
            </form>
          </div>
        </div>
        <Thoughts
          thought={thought}
          setIsThoughtsOpen={(isOpen: boolean) =>
            setIsThoughtsOpen(isOpen, null)
          }
          isThoughtsOpen={isThoughtsOpenState}
        />
      </div>
    </main>
  );
}
