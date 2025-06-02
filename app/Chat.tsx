'use client';
import useSWR from 'swr';

import dynamic from 'next/dynamic';

import { FiMenu } from 'react-icons/fi';
import { ArrowUp, Square, Paperclip, X, Menu, Plus } from 'lucide-react';
import BloomLogo from '@/components/bloomlogo';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

import { useRef, useEffect, useState, useMemo } from 'react';
// import { useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';

// import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { getFreeMessageCount, useFreeTrial } from '@/utils/supabase/actions';
import {
  getConversations,
  createConversation,
  updateConversation,
} from './actions/conversations';
import { getMessages, addOrRemoveReaction } from './actions/messages';
import { Conversation, Message, ThinkingData } from '@/utils/types';
import { localStorageProvider } from '@/utils/swrCache';

import useAutoScroll from '@/hooks/autoscroll';
import MessageList from '@/components/MessageList';
import { MessageListRef } from '@/components/MessageList';
import { Reaction } from '@/components/messages/AIMessage';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/ui/prompt-input';
import { Button } from '@/components/ui/button';
import {
  FileUpload,
  FileUploadContent,
  FileUploadTrigger,
} from '@/components/ui/file-upload';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { departureMono } from '@/utils/fonts';

const Sidebar = dynamic(() => import('@/components/sidebar'), {
  ssr: false,
});

const supabase = createClient();
const fetchUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

interface StreamResponseChunk {
  type: 'thought' | 'honcho' | 'response' | 'pdf' | 'honchoQuery' | 'pdfQuery';
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
        toast.error('Subscription Required', {
          description:
            'You have no active subscription. Subscribe to continue using Bloom!',
          action: {
            label: 'Subscribe',
            onClick: () => (window.location.href = '/settings'),
          },
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
  const [inputValue, setInputValue] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  const [canSend, setCanSend] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] =
    useState<boolean>(false);

  const posthog = usePostHog();
  const messageContainerRef = useRef<HTMLElement>(null);
  useAutoScroll(messageContainerRef);

  const messageListRef = useRef<MessageListRef>(null);
  const sidebarPanelRef = useRef<any>(null);

  const { data: user, isLoading: isUserLoading } = useSWR('user', fetchUser);

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

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      posthog?.identify(initialUserId, { email: initialEmail });
      posthog?.capture('page_view', {
        page: 'chat',
      });
    }
  }, [posthog, initialUserId, initialEmail]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

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

  const handleFilesAdded = (newFiles: File[]) => {
    const fileSizeLimit = 5 * 1024 * 1024; // 5MB
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    newFiles.forEach((file) => {
      if (file.size > fileSizeLimit) {
        invalidFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      toast.error('File Too Large', {
        description: `The following files are larger than 5MB and cannot be uploaded: ${invalidFiles.join(', ')}`,
      });
    }

    if (validFiles.length > 0) {
      // Only allow one file - take the first valid file and replace any existing files
      setSelectedFiles([validFiles[0]]);
    }
  };

  const removeFile = () => {
    setSelectedFiles([]);
  };

  async function addChat() {
    // Create a temporary conversation with a loading state
    const tempId = 'temp-' + Date.now();
    const tempConversation: Conversation = {
      conversationId: tempId,
      name: 'Untitled',
    };

    // Optimistically add the temporary conversation
    mutateConversations([tempConversation, ...conversations!], false);
    setConversationId(tempId);

    try {
      const newConversation = await createConversation();
      posthog?.capture('user_created_conversation');

      // Replace temporary conversation with the real one
      mutateConversations([
        newConversation!,
        ...conversations!.filter((c) => c.conversationId !== tempId),
      ]);
      setConversationId(newConversation?.conversationId);
    } catch (error) {
      // Remove temporary conversation on error
      mutateConversations(conversations!);
      setConversationId(conversationId);
      toast.error('Failed to create new chat');
      console.error('Failed to create new chat:', error);
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

  useEffect(() => {
    // Collapse sidebar by default on mobile
    if (isMobile && sidebarPanelRef.current) {
      sidebarPanelRef.current.collapse();
      setIsMobileSidebarOpen(false);
    }
  }, [isMobile]);

  async function chat(message?: string) {
    const rawMessage = message || inputValue;
    if (!userId || !rawMessage) return;

    // Process message to have double newline for markdown
    let messageToSend = rawMessage.replace(/\n/g, '\n\n');

    if (selectedFiles.length > 0) {
      const fileName = selectedFiles[0].name;
      messageToSend += `\n\n<file-name>${fileName}</file-name>`;
    }

    // Clear selected files immediately after appending to message to prevent re-attachment
    setSelectedFiles([]);

    if (inputValue) setInputValue('');

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
        thinking: {
          thoughtContent: '',
          thoughtFinished: false,
          honchoQuery: '',
          honchoResponse: '',
          pdfQuery: '',
          pdfResponse: '',
        },
      },
    ];
    await mutateMessages(newMessages, { revalidate: false });
    messageListRef.current?.scrollToBottom();

    await new Promise((resolve) => setTimeout(resolve, 1000));

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

      // Get the consolidated stream - use first file if multiple files are selected
      const stream = await fetchConsolidatedStream(
        messageToSend,
        conversationId!,
        selectedFiles[0] || undefined
      );

      const streamReader = new StreamReader(stream);

      // Process the stream
      while (true) {
        const { done, chunk } = await streamReader.read();
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

        if (!chunk) {
          continue;
        }

        switch (chunk.type) {
          case 'thought':
            // Add thought content directly since server now sends clean content
            if (chunk.text.trim()) {
              mutateMessages(
                (currentMessages) => {
                  const msgs = currentMessages || [];
                  const lastMessage = msgs[msgs.length - 1];
                  if (lastMessage && !lastMessage.isUser) {
                    const updatedThinking: ThinkingData = {
                      thoughtContent:
                        (lastMessage.thinking?.thoughtContent || '') +
                        chunk.text,
                      thoughtFinished: false,
                      honchoQuery: lastMessage.thinking?.honchoQuery,
                      honchoResponse: lastMessage.thinking?.honchoResponse,
                      pdfQuery: lastMessage.thinking?.pdfQuery,
                      pdfResponse: lastMessage.thinking?.pdfResponse,
                    };
                    return [
                      ...msgs.slice(0, -1),
                      {
                        ...lastMessage,
                        thinking: updatedThinking,
                      },
                    ];
                  }
                  return msgs;
                },
                { revalidate: false }
              );
            }
            break;

          case 'honchoQuery':
            mutateMessages(
              (currentMessages) => {
                const msgs = currentMessages || [];
                const lastMessage = msgs[msgs.length - 1];
                if (lastMessage && !lastMessage.isUser) {
                  const updatedThinking: ThinkingData = {
                    thoughtContent: lastMessage.thinking?.thoughtContent || '',
                    thoughtFinished: false,
                    honchoQuery:
                      (lastMessage.thinking?.honchoQuery || '') + chunk.text,
                    honchoResponse: lastMessage.thinking?.honchoResponse,
                    pdfQuery: lastMessage.thinking?.pdfQuery,
                    pdfResponse: lastMessage.thinking?.pdfResponse,
                  };
                  return [
                    ...msgs.slice(0, -1),
                    {
                      ...lastMessage,
                      thinking: updatedThinking,
                    },
                  ];
                }
                return msgs;
              },
              { revalidate: false }
            );
            break;

          case 'pdfQuery':
            mutateMessages(
              (currentMessages) => {
                const msgs = currentMessages || [];
                const lastMessage = msgs[msgs.length - 1];
                if (lastMessage && !lastMessage.isUser) {
                  const updatedThinking: ThinkingData = {
                    thoughtContent: lastMessage.thinking?.thoughtContent || '',
                    thoughtFinished: false,
                    honchoQuery: lastMessage.thinking?.honchoQuery,
                    honchoResponse: lastMessage.thinking?.honchoResponse,
                    pdfQuery:
                      (lastMessage.thinking?.pdfQuery || '') + chunk.text,
                    pdfResponse: lastMessage.thinking?.pdfResponse,
                  };
                  return [
                    ...msgs.slice(0, -1),
                    {
                      ...lastMessage,
                      thinking: updatedThinking,
                    },
                  ];
                }
                return msgs;
              },
              { revalidate: false }
            );
            break;

          case 'honcho':
            mutateMessages(
              (currentMessages) => {
                const msgs = currentMessages || [];
                const lastMessage = msgs[msgs.length - 1];
                if (lastMessage && !lastMessage.isUser) {
                  const updatedThinking: ThinkingData = {
                    thoughtContent: lastMessage.thinking?.thoughtContent || '',
                    thoughtFinished: false,
                    honchoQuery: lastMessage.thinking?.honchoQuery,
                    honchoResponse:
                      (lastMessage.thinking?.honchoResponse || '') + chunk.text,
                    pdfQuery: lastMessage.thinking?.pdfQuery,
                    pdfResponse: lastMessage.thinking?.pdfResponse,
                  };
                  return [
                    ...msgs.slice(0, -1),
                    {
                      ...lastMessage,
                      thinking: updatedThinking,
                    },
                  ];
                }
                return msgs;
              },
              { revalidate: false }
            );
            break;

          case 'pdf':
            if (chunk.text.length > 0) {
              mutateMessages(
                (currentMessages) => {
                  const msgs = currentMessages || [];
                  const lastMessage = msgs[msgs.length - 1];
                  if (lastMessage && !lastMessage.isUser) {
                    const updatedThinking: ThinkingData = {
                      thoughtContent:
                        lastMessage.thinking?.thoughtContent || '',
                      thoughtFinished: false,
                      honchoQuery: lastMessage.thinking?.honchoQuery,
                      honchoResponse: lastMessage.thinking?.honchoResponse,
                      pdfQuery: lastMessage.thinking?.pdfQuery,
                      pdfResponse:
                        (lastMessage.thinking?.pdfResponse || '') + chunk.text,
                    };
                    return [
                      ...msgs.slice(0, -1),
                      {
                        ...lastMessage,
                        thinking: updatedThinking,
                      },
                    ];
                  }
                  return msgs;
                },
                { revalidate: false }
              );
            }
            break;

          case 'response':
            currentModelOutput += chunk.text;
            mutateMessages(
              (currentMessages) => {
                const msgs = currentMessages || [];
                const lastMessage = msgs[msgs.length - 1];
                if (lastMessage && !lastMessage.isUser) {
                  const updatedThinking: ThinkingData = {
                    thoughtContent: lastMessage.thinking?.thoughtContent || '',
                    thoughtFinished: true,
                    honchoQuery: lastMessage.thinking?.honchoQuery,
                    honchoResponse: lastMessage.thinking?.honchoResponse,
                    pdfQuery: lastMessage.thinking?.pdfQuery,
                    pdfResponse: lastMessage.thinking?.pdfResponse,
                  };
                  return [
                    ...msgs.slice(0, -1),
                    {
                      ...lastMessage,
                      content: currentModelOutput,
                      thinking: updatedThinking,
                    },
                  ];
                }
                return msgs;
              },
              { revalidate: false }
            );
            messageListRef.current?.scrollToBottom();
            break;
        }
      }

      streamReader.release();

      // selectedFiles already cleared above to prevent re-attachment

      await mutateMessages();

      messageListRef.current?.scrollToBottom();
      setCanSend(true);
    } catch (error) {
      console.error('Chat error:', error);

      // Clear selected files in error case as well
      setSelectedFiles([]);

      // Preserve the message even in case of error if we have content
      if (currentModelOutput) {
        mutateMessages(
          (currentMessages) => {
            const msgs = currentMessages || [];
            const lastMessage = msgs[msgs.length - 1];
            if (lastMessage && !lastMessage.isUser) {
              const updatedThinking: ThinkingData = {
                thoughtContent: lastMessage.thinking?.thoughtContent || '',
                thoughtFinished: true,
                honchoQuery: lastMessage.thinking?.honchoQuery,
                honchoResponse: lastMessage.thinking?.honchoResponse,
                pdfQuery: lastMessage.thinking?.pdfQuery,
                pdfResponse: lastMessage.thinking?.pdfResponse,
              };
              return [
                ...msgs.slice(0, -1),
                {
                  ...lastMessage,
                  content:
                    currentModelOutput ||
                    'Sorry, there was an error generating a response.',
                  thinking: updatedThinking,
                },
              ];
            }
            return msgs;
          },
          { revalidate: false }
        );
      } else {
        await mutateMessages();
      }

      messageListRef.current?.scrollToBottom();
      setCanSend(true);
    }
  }

  return (
    <main className="relative flex flex-1 w-full bg-background min-h-0">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel
          ref={sidebarPanelRef}
          defaultSize={25}
          minSize={20}
          maxSize={40}
          collapsible
          className={isMobile ? 'hidden' : ''}
        >
          <Sidebar
            conversations={conversations || []}
            mutateConversations={mutateConversations}
            conversationId={conversationId}
            setConversationId={setConversationId}
            canUseApp={canUseApp}
          />
        </ResizablePanel>
        {!isMobile && <ResizableHandle />}
        <ResizablePanel defaultSize={isMobile ? 100 : 75}>
          <div className="flex flex-col h-full w-full">
            {!isSubscribed && (
              <section className="h-[63px] w-full bg-neon-green text-black text-center flex items-center justify-center shrink-0">
                <p>
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
                  {freeMessages === 0
                    ? 'to use Bloom!'
                    : 'for unlimited access!'}
                </p>
              </section>
            )}

            <div className="flex flex-col h-full relative">
              {/* Chat Header */}
              <div className="px-4 py-3.5 border-b-2 border-zinc-300 flex justify-start items-center gap-3.5 overflow-hidden ">
                <button
                  onClick={() => {
                    if (isMobile) {
                      setIsMobileSidebarOpen(!isMobileSidebarOpen);
                    } else {
                      if (sidebarPanelRef.current) {
                        if (sidebarPanelRef.current.isCollapsed()) {
                          sidebarPanelRef.current.expand();
                        } else {
                          sidebarPanelRef.current.collapse();
                        }
                      }
                    }
                  }}
                  className="w-6 h-6 flex items-center justify-center"
                >
                  <Menu className="w-6 h-6 text-black" />
                </button>
                <div className="flex flex-col justify-center items-start gap-1">
                  <div
                    className={`text-black text-xl font-normal ${departureMono.className}`}
                  >
                    {conversations?.find(
                      (c) => c.conversationId === conversationId
                    )?.name || 'New Chat'}
                  </div>
                  <div className="flex justify-start items-center gap-1.5">
                    <span className="text-neutral-500 text-base font-normal font-mono">
                      A chat with{' '}
                      {isHydrated
                        ? user?.user_metadata?.full_name || 'You'
                        : 'You'}{' '}
                      and
                      <div className="inline-block pl-2">
                        <div className="flex justify-start items-center gap-1">
                          <BloomLogo className="w-5 text-neutral-500" />
                          <span className="text-neutral-500 text-base font-normal font-mono">
                            Bloom
                          </span>
                        </div>
                      </div>
                    </span>
                  </div>
                </div>
                <div className="flex-1" />
                <div className="flex justify-start items-center gap-1.5">
                  <button
                    onClick={addChat}
                    disabled={!canUseApp}
                    className="w-10 h-10 bg-lime-300 rounded-full flex justify-center items-center overflow-hidden hover:bg-lime-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 text-black" />
                  </button>
                </div>
              </div>
              <MessageList
                ref={messageListRef}
                messages={messages}
                defaultMessage={defaultMessage}
                userId={userId}
                conversationId={conversationId}
                messagesLoading={messagesLoading}
                handleReactionAdded={handleReactionAdded}
              />
              <div className="absolute bottom-0 left-0 right-0 z-10">
                <div className="h-3 lg:h-5  bg-gradient-to-b from-transparent to-background" />
                <div className="bg-background py-3">
                  {messages!.length > 1 && (
                    <div className="disclaimer-text text-center mb-2 text-gray-400">
                      Bloom can make mistakes. Always double-check important
                      information.
                    </div>
                  )}
                  <div className="relative max-w-[740px] mx-auto px-10">
                    <FileUpload
                      onFilesAdded={handleFilesAdded}
                      accept=".pdf,.txt"
                      multiple={false}
                    >
                      <PromptInput
                        value={inputValue}
                        onValueChange={setInputValue}
                        isLoading={!canSend}
                        onSubmit={() => {
                          if (canSend && inputValue && canUseApp) {
                            posthog.capture('user_sent_message');
                            chat();
                          }
                        }}
                        className="w-full border-border bg-white"
                      >
                        {selectedFiles.length > 0 && (
                          <div className="flex flex-wrap gap-2 pb-2">
                            {selectedFiles.map((file, index) => (
                              <div
                                key={index}
                                className="bg-gray-100 flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-sm border"
                              >
                                <div className="flex items-center gap-2">
                                  <Paperclip className="size-4 text-gray-600" />
                                  <span className="max-w-[120px] truncate text-sm font-medium">
                                    {file.name}
                                  </span>
                                </div>
                                <button
                                  onClick={() => removeFile()}
                                  className="hover:bg-gray-200 rounded-full p-1 transition-colors"
                                  disabled={!canUseApp}
                                >
                                  <X className="size-4 text-gray-500" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <PromptInputTextarea
                          placeholder={
                            canUseApp
                              ? selectedFiles.length > 0
                                ? `Message with file...`
                                : 'Type a message or drop a file...'
                              : 'Subscribe to send messages'
                          }
                          disabled={!canUseApp}
                          className="placeholder:text-gray-400"
                        />
                        <PromptInputActions className="justify-end pt-2">
                          <PromptInputAction tooltip="Attach files">
                            <FileUploadTrigger asChild>
                              <Button
                                size="icon"
                                className={`h-10 w-10 rounded-full bg-white border border-border hover:bg-gray-50 transition-colors`}
                                disabled={!canUseApp}
                                type="button"
                              >
                                <Paperclip className={`size-4 text-gray-600`} />
                              </Button>
                            </FileUploadTrigger>
                          </PromptInputAction>
                          <Button
                            variant="default"
                            size="icon"
                            className="h-10 w-10 rounded-full bg-black text-white hover:bg-gray-800 transition-colors"
                            disabled={!canSend || !canUseApp}
                            type="button"
                            onClick={() => {
                              if (canSend && inputValue && canUseApp) {
                                posthog.capture('user_sent_message');
                                chat();
                              }
                            }}
                          >
                            {!canSend ? (
                              <Square className="size-4 fill-current" />
                            ) : (
                              <ArrowUp className="size-4" />
                            )}
                          </Button>
                        </PromptInputActions>
                      </PromptInput>

                      <FileUploadContent>
                        <div className="flex min-h-[200px] w-full items-center justify-center">
                          <div className="bg-white/95 backdrop-blur-sm m-4 w-full max-w-md rounded-xl border-2 border-dashed border-gray-300 p-8 shadow-xl">
                            <div className="mb-4 flex justify-center">
                              <div className="bg-blue-50 rounded-full p-3">
                                <svg
                                  className="text-blue-500 size-8"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                                  />
                                </svg>
                              </div>
                            </div>
                            <h3 className="mb-2 text-center text-lg font-semibold text-gray-800">
                              Drop a file to upload
                            </h3>
                            <p className="text-gray-600 text-center text-sm">
                              Release to add a PDF or text file to your message
                            </p>
                            <p className="text-gray-400 text-center text-xs mt-2">
                              Maximum file size: 5MB
                            </p>
                          </div>
                        </div>
                      </FileUploadContent>
                    </FileUpload>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Mobile Sidebar Overlay */}
      {isMobile && isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="h-full flex flex-col">
            {/* Mobile sidebar header */}
            <div className="px-4 py-3.5 border-b-2 border-zinc-300 flex justify-between items-center">
              <button
                onClick={() => {
                  addChat();
                  setIsMobileSidebarOpen(false);
                }}
                disabled={!canUseApp}
                className="w-10 h-10 bg-lime-300 rounded-full flex justify-center items-center overflow-hidden hover:bg-lime-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4 text-black" />
              </button>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="w-6 h-6 flex items-center justify-center"
              >
                <X className="w-6 h-6 text-black" />
              </button>
            </div>
            {/* Mobile sidebar content */}
            <div className="flex-1">
              <Sidebar
                conversations={conversations || []}
                mutateConversations={mutateConversations}
                conversationId={conversationId}
                setConversationId={(id) => {
                  setConversationId(id);
                  setIsMobileSidebarOpen(false); // Close sidebar when selecting conversation
                }}
                canUseApp={canUseApp}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
