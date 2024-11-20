'use client';
import useSWR from 'swr';

import dynamic from 'next/dynamic';

import { FaLightbulb, FaPaperPlane } from 'react-icons/fa';
import Swal from 'sweetalert2';

import { useRef, useEffect, useState, ElementRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';

import { getSubscription } from '@/utils/supabase/queries';

import { createClient } from '@/utils/supabase/client';
import { Reaction } from '@/components/messagebox';
import { FiMenu } from 'react-icons/fi';
import Link from 'next/link';
import { getFreeMessageCount, useFreeTrial } from '@/utils/supabase/actions';
import { getConversations, createConversation } from './actions/conversations';
import { getMessages, addOrRemoveReaction } from './actions/messages';

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
  type: 'thought' | 'response',
  message: string,
  conversationId: string,
  thought = '',
  honchoContent = ''
) {
  console.log(`Starting ${type} stream request`);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        message,
        conversationId,
        thought,
        honchoContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Stream error for ${type}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`Failed to fetch ${type} stream: ${response.status}`);
    }

    if (!response.body) {
      throw new Error(`No response body for ${type} stream`);
    }

    console.log(`${type} stream connected successfully`);
    return response.body;
  } catch (error) {
    console.error(`Error in fetchStream (${type}):`, error);
    throw error;
  }
}

export default function Home() {
  const [userId, setUserId] = useState<string>();

  const [isThoughtsOpenState, setIsThoughtsOpenState] =
    useState<boolean>(false);
  const [openThoughtMessageId, setOpenThoughtMessageId] = useState<
    string | null
  >(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const [thought, setThought] = useState<string>('');
  const [canSend, setCanSend] = useState<boolean>(false);

  const [conversationId, setConversationId] = useState<string>();

  const router = useRouter();
  const supabase = createClient();
  const posthog = usePostHog();
  const input = useRef<ElementRef<'textarea'>>(null);
  const isAtBottom = useRef(true);
  const messageContainerRef = useRef<ElementRef<'section'>>(null);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [freeMessages, setFreeMessages] = useState<number>(0);

  const setIsThoughtsOpen = (
    isOpen: boolean,
    messageId: string | null = null
  ) => {
    setIsThoughtsOpenState(isOpen);
    setOpenThoughtMessageId(isOpen ? messageId : null);
  };

  useEffect(() => {
    (async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!user || error) {
        await Swal.fire({
          title: 'Notice: Bloombot now requires signing in for usage',
          text: 'Due to surging demand for Bloom we are requiring users to stay signed in to user Bloom',
          icon: 'warning',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Sign In',
        });
        router.push('/auth');
        return;
      }

      setUserId(user.id);
      posthog?.identify(user.id, { email: user.email });

      // Skip subscription check if Stripe is disabled
      if (process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'false') {
        setIsSubscribed(true);
        return;
      }

      // Check subscription status
      const sub = await getSubscription(supabase);
      // Only consider active paid subscriptions, not trials
      const isActivePaidSub = sub && sub.status === 'active' && !sub.trial_end;
      setIsSubscribed(isActivePaidSub);
      if (!isActivePaidSub) {
        const count = await getFreeMessageCount(user.id);
        setFreeMessages(count);
      }
    })();
  }, [supabase, posthog, router]);

  useEffect(() => {
    const messageContainer = messageContainerRef.current;
    if (!messageContainer) return;

    const func = () => {
      const val =
        Math.round(
          messageContainer.scrollHeight - messageContainer.scrollTop
        ) === messageContainer.clientHeight;
      isAtBottom.current = val;
    };

    messageContainer.addEventListener('scroll', func);

    return () => {
      messageContainer.removeEventListener('scroll', func);
    };
  }, []);

  const conversationsFetcher = async () => {
    return getConversations();
  };

  const { data: conversations, mutate: mutateConversations } = useSWR(
    userId,
    conversationsFetcher,
    {
      onSuccess: async (conversations) => {
        if (conversations.length) {
          if (
            !conversationId ||
            !conversations.find((c) => c.conversationId === conversationId)
          ) {
            setConversationId(conversations[0].conversationId);
          }
          setCanSend(true);
        } else {
          const newConvo = await createConversation();
          setConversationId(newConvo?.conversationId);
          await mutateConversations();
        }
      },
      revalidateOnFocus: false,
    }
  );

  const messagesFetcher = async (conversationId: string) => {
    if (!userId) return Promise.resolve([]);
    if (!conversationId) return Promise.resolve([]);

    return getMessages(conversationId);
  };

  const {
    data: messages,
    mutate: mutateMessages,
    isLoading: messagesLoading,
  } = useSWR(conversationId, messagesFetcher, { revalidateOnFocus: false });

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

  async function chat() {
    if (!userId) return;

    // Check free message allotment upfront if not subscribed
    if (!isSubscribed) {
      const currentCount = await getFreeMessageCount(userId);
      if (currentCount <= 0) {
        Swal.fire({
          title: 'Free Messages Depleted',
          text: 'You have used all your free messages. Subscribe to continue using Bloom!',
          icon: 'warning',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Subscribe',
          showCancelButton: true,
        });
        return;
      }
    }

    const textbox = input.current!;
    // process message to have double newline for markdown
    const message = textbox.value.replace(/\n/g, '\n\n');
    textbox.value = '';

    setCanSend(false);

    const newMessages = [
      ...messages!,
      {
        content: message,
        isUser: true,
        id: '',
      },
      {
        content: '',
        isUser: false,
        id: '',
      },
    ];
    mutateMessages(newMessages, { revalidate: false });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    let thoughtReader: ReadableStreamDefaultReader | null = null;
    let responseReader: ReadableStreamDefaultReader | null = null;

    try {
      // Get thought stream
      const thoughtStream = await fetchStream(
        'thought',
        message,
        conversationId!
      );
      if (!thoughtStream) throw new Error('Failed to get thought stream');

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

      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Get response stream using the thought
      const responseStream = await fetchStream(
        'response',
        message,
        conversationId!,
        thoughtText,
        ''
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
          setCanSend(true);
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
            },
          ],
          { revalidate: false }
        );

        if (isAtBottom.current) {
          const messageContainer = messageContainerRef.current;
          if (messageContainer) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
          }
        }
      }

      responseReader.releaseLock();
      responseReader = null;

      mutateMessages();
    } catch (error) {
      console.error('Chat error:', error);
      setCanSend(true);
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

  const canUseApp = isSubscribed || freeMessages > 0;

  return (
    <main className="relative flex h-full overflow-hidden">
      <Sidebar
        conversations={conversations || []}
        mutateConversations={mutateConversations}
        conversationId={conversationId}
        setConversationId={setConversationId}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSubscribed={canUseApp}
      />
      <div className="flex-1 flex flex-col flex-grow overflow-hidden">
        {!isSidebarOpen && (
          <button
            className={`absolute top-4 left-4 z-30 lg:hidden bg-neon-green text-black rounded-lg p-2 border border-black`}
            onClick={() => setIsSidebarOpen(true)}
          >
            <FiMenu size={24} />
          </button>
        )}
        {!isSubscribed && (
          <section className="h-16 lg:h-[72px] w-full bg-neon-green text-black text-center flex items-center justify-center flex-shrink-0">
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
        <div className="flex flex-col flex-grow overflow-hidden dark:bg-gray-900">
          <section
            className="flex-grow overflow-y-auto px-4 lg:px-5 dark:text-white"
            ref={messageContainerRef}
          >
            {messages?.map((message, i) => (
              <MessageBox
                key={i}
                isUser={message.isUser}
                userId={userId}
                message={message}
                loading={messagesLoading}
                conversationId={conversationId}
                setThought={setThought}
                isThoughtOpen={openThoughtMessageId === message.id}
                setIsThoughtsOpen={(isOpen) =>
                  setIsThoughtsOpen(isOpen, message.id)
                }
                onReactionAdded={handleReactionAdded}
              />
            )) || (
                <MessageBox
                  isUser={false}
                  message={{
                    content: '',
                    id: '',
                    isUser: false,
                    metadata: { reaction: null },
                  }}
                  loading={true}
                  setThought={setThought}
                  setIsThoughtsOpen={setIsThoughtsOpen}
                  onReactionAdded={handleReactionAdded}
                  userId={userId}
                  conversationId={conversationId}
                />
              )}
          </section>
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
                className={`flex-1 px-3 py-1 lg:px-5 lg:py-3 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl border-2 resize-none ${canSend && canUseApp
                  ? 'border-green-200'
                  : 'border-red-200 opacity-50'
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
                className="bg-dark-green text-neon-green rounded-full px-4 py-2 lg:px-7 lg:py-3 flex justify-center items-center gap-2"
                type="submit"
                disabled={!canSend || !canUseApp}
              >
                <FaPaperPlane className="inline" />
              </button>
              <button
                className="bg-dark-green text-neon-green rounded-full px-4 py-2 lg:px-7 lg:py-3 flex justify-center items-center gap-2"
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
