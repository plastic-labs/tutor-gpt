'use client';
import useSWR from 'swr';

import dynamic from 'next/dynamic';

import { FaLightbulb, FaPaperPlane } from 'react-icons/fa';
import Swal from 'sweetalert2';

import { useRef, useEffect, useState, ElementRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';

import { getSubscription } from '@/utils/supabase/queries';

import { API } from '@/utils/api';
import { createClient } from '@/utils/supabase/client';
import { Reaction } from '@/components/messagebox';
import { FiMenu } from 'react-icons/fi';
import Link from 'next/link';
import { getFreeMessageCount, useFreeTrial } from '@/utils/supabase/actions';

const Thoughts = dynamic(() => import('@/components/thoughts'), {
  ssr: false,
});
const MessageBox = dynamic(() => import('@/components/messagebox'), {
  ssr: false,
});
const Sidebar = dynamic(() => import('@/components/sidebar'), {
  ssr: false,
});

const URL = process.env.NEXT_PUBLIC_API_URL;

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
  //const input = useRef<ElementRef<"input">>(null);
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

  const conversationsFetcher = async (userId: string) => {
    const api = new API({ url: URL!, userId });
    return api.getConversations();
  };

  const { data: conversations, mutate: mutateConversations } = useSWR(
    userId,
    conversationsFetcher,
    {
      onSuccess: (conversations) => {
        if (
          !conversationId ||
          !conversations.find((c) => c.conversationId === conversationId)
        ) {
          setConversationId(conversations[0].conversationId);
        }
        setCanSend(true);
      },
      revalidateOnFocus: false,
    }
  );

  const messagesFetcher = async (conversationId: string) => {
    if (!userId) return Promise.resolve([]);
    if (!conversationId) return Promise.resolve([]);

    const api = new API({ url: URL!, userId });
    return api.getMessagesByConversation(conversationId);
  };

  const {
    data: messages,
    mutate: mutateMessages,
    isLoading: messagesLoading,
  } = useSWR(conversationId, messagesFetcher, { revalidateOnFocus: false });

  const handleReactionAdded = async (messageId: string, reaction: Reaction) => {
    if (!userId || !conversationId) return;

    const api = new API({ url: URL!, userId });

    try {
      await api.addOrRemoveReaction(conversationId, messageId, reaction);

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

    setCanSend(false); // Disable sending more messages until the current generation is done

    const newMessages = [
      ...messages!,
      {
        text: message,
        isUser: true,
        id: '',
      },
      {
        text: '',
        isUser: false,
        id: '',
      },
    ];
    mutateMessages(newMessages, { revalidate: false });

    // sleep for 1 second to give the user the illusion of typing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const reader = await conversations!
      .find((conversation) => conversation.conversationId === conversationId)!
      .chat(message);

    const messageContainer = messageContainerRef.current;
    if (messageContainer) {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }

    let isThinking = true;
    setThought('');

    let currentModelOutput = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Only decrement free messages after successful completion
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
      if (isThinking) {
        if (value.includes('❀')) {
          // a bloom delimiter
          isThinking = false;
          continue;
        }
        setThought((prev) => prev + value);
      } else {
        if (value.includes('❀')) {
          setCanSend(true); // Bloom delimeter
          continue;
        }

        currentModelOutput += value;

        mutateMessages(
          [
            ...(newMessages?.slice(0, -1) || []),
            {
              text: currentModelOutput,
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
    }

    mutateMessages();
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
        api={new API({ url: URL!, userId: userId! })}
        isSubscribed={isSubscribed}
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
                URL={URL}
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
                  text: '',
                  id: '',
                  isUser: false,
                  metadata: { reaction: null },
                }}
                loading={true}
                setThought={setThought}
                setIsThoughtsOpen={setIsThoughtsOpen}
                onReactionAdded={handleReactionAdded}
                userId={userId}
                URL={URL}
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
                className={`flex-1 px-3 py-1 lg:px-5 lg:py-3 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl border-2 resize-none ${
                  canSend && canUseApp
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
