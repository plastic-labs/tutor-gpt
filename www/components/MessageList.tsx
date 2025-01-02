'use client';
import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Message } from '@/utils/types';
import MessageBox from '@/components/messagebox';
import { getThought } from '@/app/actions/messages';
import useAutoScroll from '@/hooks/autoscroll';

interface MessageListProps {
  messages: Message[] | undefined;
  defaultMessage: Message;
  userId: string;
  conversationId?: string;
  messagesLoading: boolean;
  handleReactionAdded: (messageId: string, reaction: any) => Promise<void>;
  setThoughtParent: (thought: string) => void;
  setIsThoughtsOpen: (
    isOpen: boolean,
    messageId?: string | null | undefined
  ) => void;
  openThoughtMessageId: string | null;
}

export interface MessageListRef {
  scrollToBottom: () => void;
}

const MessageList = forwardRef<MessageListRef, MessageListProps>(
  (
    {
      messages,
      defaultMessage,
      userId,
      conversationId,
      messagesLoading,
      handleReactionAdded,
      setThoughtParent,
      setIsThoughtsOpen,
      openThoughtMessageId,
    },
    ref
  ) => {
    const [isThoughtLoading, setIsThoughtLoading] = useState<boolean>(false);
    const [thoughtError, setThoughtError] = useState<{
      messageId: string;
      error: string;
    } | null>(null);

    const messageContainerRef = useRef<HTMLElement>(null);
    const [, scrollToBottom] = useAutoScroll(messageContainerRef);

    // Expose scrollToBottom method to parent
    useImperativeHandle(ref, () => ({
      scrollToBottom: () => {
        scrollToBottom();
      },
    }));

    const handleGetThought = async (messageId: string) => {
      if (!conversationId || !userId) return;

      // Find the last user message before this AI message
      const allMessages = [defaultMessage, ...(messages || [])];
      const messageIndex = allMessages.findIndex((msg) => msg.id === messageId);

      // Look backwards for the last user message
      let lastUserMessageId = null;
      for (let i = messageIndex; i >= 0; i--) {
        if (allMessages[i].isUser) {
          lastUserMessageId = allMessages[i].id;
          break;
        }
      }

      try {
        // Try with last user message first
        if (lastUserMessageId) {
          const thought = await getThought(conversationId, lastUserMessageId);
          if (thought) {
            setThoughtParent(thought);
            setIsThoughtsOpen(true, messageId);
            return;
          }
        }

        // If that didn't work, try with current AI message
        const thought = await getThought(conversationId, messageId);
        if (thought) {
          setThoughtParent(thought);
          setIsThoughtsOpen(true, messageId);
          return;
        }

        // If neither worked
        setThoughtError({ messageId, error: 'No thought data available.' });
        console.log(messageId, 'No thought data available.');
      } catch (error) {
        console.error('Failed to fetch thought:', error);
        setThoughtError({ messageId, error: 'Failed to fetch thought.' });
      } finally {
        setIsThoughtLoading(false);
      }
    };

    return (
      <section
        className="flex-grow overflow-y-auto px-4 lg:px-5 dark:text-white"
        ref={messageContainerRef}
      >
        {messages ? (
          [defaultMessage, ...messages].map((message, i) => (
            <MessageBox
              key={message.id || i}
              isUser={message.isUser}
              userId={userId}
              message={message}
              loading={messagesLoading}
              conversationId={conversationId}
              isThoughtOpen={openThoughtMessageId === message.id}
              setIsThoughtsOpen={(isOpen) =>
                setIsThoughtsOpen(isOpen, message.id)
              }
              onReactionAdded={handleReactionAdded}
              onGetThought={handleGetThought}
              isThoughtLoading={
                isThoughtLoading && openThoughtMessageId === message.id
              }
              thoughtError={
                thoughtError?.messageId === message.id
                  ? thoughtError.error
                  : null
              }
            />
          ))
        ) : (
          <MessageBox
            isUser={false}
            message={{
              content: '',
              id: '',
              isUser: false,
              metadata: { reaction: null },
            }}
            loading={true}
            setIsThoughtsOpen={setIsThoughtsOpen}
            onReactionAdded={handleReactionAdded}
            onGetThought={handleGetThought}
            userId={userId}
            conversationId={conversationId}
          />
        )}
        {messages!.length > 1 && <div className="text-right text-xs text-foreground">
          Bloom can make mistakes. Always double-check important information.
        </div>}
      </section>
    );
  }
);

MessageList.displayName = 'MessageList';

export default MessageList;
