'use client';
import useSWR from 'swr';

import dynamic from 'next/dynamic';

import { FaLightbulb, FaPaperPlane } from 'react-icons/fa';
import Swal from 'sweetalert2';

import { useRef, useEffect, useState, ElementRef, useMemo } from 'react';
// import { useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';

// import { createClient } from '@/utils/supabase/client';
import { Reaction } from '@/components/messagebox';
import { FiMenu } from 'react-icons/fi';
import Link from 'next/link';
import { getFreeMessageCount, useFreeTrial } from '@/utils/supabase/actions';
import { getConversations, createConversation } from './actions/conversations';
import { getMessages, addOrRemoveReaction } from './actions/messages';
import { type Message } from '@/utils/types';
import { localStorageProvider } from '@/utils/swrCache';

import useAutoScroll from '@/hooks/autoscroll';
import MessageList from '@/components/MessageList';
import { MessageListRef } from '@/components/MessageList';

const Thoughts = dynamic(() => import('@/components/thoughts'), {
  ssr: false,
});

const MessageBox = dynamic(() => import('@/components/messagebox'), {
  ssr: false,
});
const Sidebar = dynamic(() => import('@/components/sidebar'), {
  ssr: false,
});

async function fetchStream(
  type: 'thought' | 'response' | 'honcho',
  message: string,
  conversationId: string,
  thought = '',
  honchoThought = ''
) {
  try {
    const response = await fetch(`/api/chat/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationId,
        thought,
        honchoThought,
      }),
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
      console.error(`Stream error for ${type}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      console.error(response);
      throw new Error(`Failed to fetch ${type} stream: ${response.status}`);
    }

    return response.body;
  } catch (error) {
    console.error(`Error in fetchStream (${type}):`, error);
    throw error;
  }
}

interface ChatProps {
  initialUserId: string;
  initialEmail: string | undefined;
  initialConversations: any[];
  initialChatAccess: {
    isSubscribed: boolean;
    freeMessages: number;
    canChat: boolean;
  };
  initialMessages: any[];
  initialConversationId: string | null | undefined;
}

interface HonchoResponse {
  content: string;
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
  const [isSubscribed, setIsSubscribed] = useState(initialChatAccess.isSubscribed);
  const [freeMessages, setFreeMessages] = useState(initialChatAccess.freeMessages);
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
  const [, scrollToBottom] = useAutoScroll(messageContainerRef);

  const messageListRef = useRef<MessageListRef>(null);
  const firstChat = useMemo(() => {
    return !initialConversations?.length ||
      (initialConversations.length === 1 && !initialMessages?.length) ||
      initialChatAccess.freeMessages === 50;
  }, [initialConversations?.length, initialMessages?.length, initialChatAccess.freeMessages]);

  // Since this message is just rendered in the UI, this naive check may result in edge cases where the incorrect message is shown.
  // (Ex. will show on all chats after creating a new session or messaging Bloom, even the first chat). 
  // Also, clearing chats will revert the message to the initial description.
  const defaultMessage: Message = {
    content:
      `${firstChat ? 'I\'m Bloom, your Aristotelian learning companion,' : 'Welcome back! I\'m'} here to guide your intellectual journey.

The more we chat, the more I learn about you as a person. That helps me adapt to your interests and needs.

What\'s on your mind? Let\'s dive in. 🌱`,
    isUser: false,
    id: '',
    metadata: {},
  };

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
      revalidateOnMount: true
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
    onSuccess: (data) => {
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

    let thoughtReader: ReadableStreamDefaultReader | null = null;
    let responseReader: ReadableStreamDefaultReader | null = null;

    try {
      // Get thought stream
      const thoughtStream = await fetchStream(
        'thought',
        messageToSend,
        conversationId!
      );
      
      if (!thoughtStream) {
        throw new Error('Failed to get thought stream');
      }
  
      thoughtReader = thoughtStream.getReader();
      let thoughtText = '';
      setThought('');

      // Process thought stream
      while (true) {
        const { done, value } = await thoughtReader.read();
        if (done) break;

        thoughtText += new TextDecoder().decode(value);
        setThought(thoughtText);
      }

      // Cleanup thought stream
      thoughtReader.releaseLock();
      thoughtReader = null;

      const honchoResponse = await fetchStream(
        'honcho',
        messageToSend,
        conversationId!,
        thoughtText
      );

      const honchoContent = (await new Response(
        honchoResponse
      ).json()) as HonchoResponse;
      
      const pureThought = thoughtText;

      thoughtText +=
        '\n\nHoncho Dialectic Response:\n\n' + honchoContent.content;
      setThought(thoughtText);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get response stream using the thought and dialectic response
      const responseStream = await fetchStream(
        'response',
        messageToSend,
        conversationId!,
        pureThought,
        honchoContent.content
      );
      if (!responseStream) throw new Error('Failed to get response stream');

      responseReader = responseStream.getReader();
      let currentModelOutput = '';

      // Process response stream
      while (true) {
        const { done, value } = await responseReader.read();
        if (done) {
          if (!isSubscribed) {
            const success = await useFreeTrial(userId);
            if (success) {
              const newCount = await getFreeMessageCount(userId);
              setFreeMessages(newCount);
            }
          }
          break;
        }

        currentModelOutput += new TextDecoder().decode(value);

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
      }

      responseReader.releaseLock();
      responseReader = null;

      await mutateMessages();
      messageListRef.current?.scrollToBottom();
      setCanSend(true);
    } catch (error) {
      console.error('Chat error:', error);
      setCanSend(true);
      await mutateMessages();
      messageListRef.current?.scrollToBottom();
    } finally {
      // Cleanup
      if (thoughtReader) {
        try {
          thoughtReader.releaseLock();
        } catch (e) {
          console.error('Error releasing thought reader:', e);
        }
      }
      if (responseReader) {
        try {
          responseReader.releaseLock();
        } catch (e) {
          console.error('Error releasing response reader:', e);
        }
      }
    }
  }

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
      <div className="flex-1 flex flex-col flex-grow overflow-hidden">
        {!isSidebarOpen && (
          <button
            className={`absolute top-3 left-4 z-30 lg:hidden bg-neon-green text-black rounded-lg p-2 border border-black`}
            onClick={() => setIsSidebarOpen(true)}
          >
            <FiMenu size={24} />
          </button>
        )}
        {!isSubscribed && (
          <section className="h-[63px] w-full bg-neon-green text-black text-center flex items-center justify-center flex-shrink-0">
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
        <div className="flex flex-col flex-grow overflow-hidden bg-secondary">
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
                  canUseApp ? 'Type a message...' : 'Subscribe to send messages'
                }
                className={`flex-1 px-3 py-1 lg:px-5 lg:py-3 bg-accent text-gray-400 rounded-2xl border-2 resize-none outline-none focus:outline-none ${canSend && canUseApp
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
