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
import { createClient, fetchWithAuth } from '@/utils/supabase/client';
import { Reaction } from '@/components/messagebox';
import { FiMenu } from 'react-icons/fi';

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

interface urlContext {
  url?: string,
  parsedUrlContent?: string,
}

export default function Home({ url, parsedUrlContent }: urlContext = {}) {
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

  // Checks whether the parsed content from jina has been loaded into the page
  const [parsedURLContentHasInitialised, setParsedURLContentHasInitialised] = useState(false);
  // Add new state for tracking URL-based conversation creation
  const [urlConversationCreated, setUrlConversationCreated] = useState(false);

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
      // Check for an error or no user
      if (!user || error) {
        await Swal.fire({
          title: 'Notice: Bloombot now requires signing in for usage',
          text: 'Due to surging demand for Bloom we are requiring users to stay signed in to user Bloom',
          icon: 'warning',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Sign In',
        });
        router.push('/auth');
      } else {
        setUserId(user.id);
        posthog?.identify(userId, { email: user.email });

        // Check subscription status
        if (process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'false') {
          setIsSubscribed(true);
        } else {
          const sub = await getSubscription(supabase);
          setIsSubscribed(!!sub);
        }
      }
    })();
  }, [supabase, posthog, userId]);

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
    if (!isSubscribed) {
      Swal.fire({
        title: 'Subscription Required',
        text: 'Please subscribe to send messages.',
        icon: 'warning',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Subscribe',
      }).then((result) => {
        if (result.isConfirmed) {
          // Redirect to subscription page
          window.location.href = '/settings';
        }
      });
      return;
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

  // # This section applies to loading content into Bloom via an appended url

  // initiates a new conversation window with Bloom -> this fn is based off addChat() in Sidebar
  async function createChatFromUrl() {
    try {
      const api = new API({ url: URL!, userId: userId! });
      const conversation = await api.new();

      posthog?.capture('user_created_conversation');
      setConversationId(conversation?.conversationId);
      mutateConversations([conversation, ...(conversations || [])]);

      // Mark that we've created the URL-based conversation to prevent duplicate creation
      setUrlConversationCreated(true);
    } catch (error) {
      console.error('Error in createUrlChat:', error);
    }
  }

  // First useEffect: Creates the conversation container
  // Only runs when we have a URL but haven't created the conversation yet
  useEffect(() => {
    if (url && !urlConversationCreated && userId) {
      createChatFromUrl();
    }
  }, [url, userId]);

  // Second useEffect: Initiates the actual conversation with the URL content
  // Only runs after the conversation container is created and we have all required data
  useEffect(() => {
    // Multiple safety checks to ensure we have everything needed
    if (!url || !isSubscribed || parsedURLContentHasInitialised || !userId || !messages || !urlConversationCreated) {
      return;
    }

    async function handleUrlContent() {
      try {
        if (parsedUrlContent) {
          // Prevent this from running multiple times
          setParsedURLContentHasInitialised(true);

          // Format the initial message to Bloom with the URL content
          // The specific response format is requested to ensure consistent handling
          const formattedInitialQuery = `Here's the content from ${url}:\n\n${parsedUrlContent}\n\nPlease read through this and prepare to discuss it. Once you are ready to continue the conversation, please say ONLY: 'Okay i'm ready to discuss this content with you.'`;
          input.current!.value = formattedInitialQuery;

          // Initiate the conversation using the main chat function
          await chat();
        }
      } catch (error) {
        console.error('Error in handleUrlContent:', error);
      }
    }

    handleUrlContent();
  }, [url, parsedUrlContent, isSubscribed, userId, messages, urlConversationCreated]);

  // # section end

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
            className="absolute top-4 left-4 z-30 lg:hidden bg-neon-green text-black rounded-lg p-2"
            onClick={() => setIsSidebarOpen(true)}
          >
            <FiMenu size={24} />
          </button>
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
                if (canSend && input.current?.value && isSubscribed) {
                  posthog.capture('user_sent_message');
                  chat();
                }
              }}
            >
              <textarea
                ref={input}
                placeholder={
                  isSubscribed
                    ? 'Type a message...'
                    : 'Subscribe to send messages'
                }
                className={`flex-1 px-3 py-1 lg:px-5 lg:py-3 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl border-2 resize-none ${canSend && isSubscribed
                  ? 'border-green-200'
                  : 'border-red-200 opacity-50'
                  }`}
                rows={1}
                disabled={!isSubscribed}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend && input.current?.value && isSubscribed) {
                      posthog.capture('user_sent_message');
                      chat();
                    }
                  }
                }}
              />
              <button
                className="bg-dark-green text-neon-green rounded-full px-4 py-2 lg:px-7 lg:py-3 flex justify-center items-center gap-2"
                type="submit"
                disabled={!canSend || !isSubscribed}
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
