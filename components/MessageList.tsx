'use client';
import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { Message } from '@/utils/types';
import useAutoScroll from '@/hooks/autoscroll';
import { useReactions } from '@/hooks/useReactions';
import { useThoughts } from '@/hooks/useThoughts';
import UserMessage from '@/components/messages/UserMessage';
import AIMessage from '@/components/messages/AIMessage';
import ThinkBox, { ThinkBoxProps } from '@/components/ThinkBox';
import { Reaction } from '@/components/messages/AIMessage';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MessageListProps {
  messages: Message[] | undefined;
  defaultMessage: Message;
  userId: string;
  conversationId?: string;
  messagesLoading: boolean;
  handleReactionAdded: (messageId: string, reaction: Reaction) => Promise<void>;
  thinkBoxData?: ThinkBoxProps;
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
      thinkBoxData,
    },
    ref
  ) => {
    const messageContainerRef = useRef<HTMLDivElement>(null);
    const [, scrollToBottom] = useAutoScroll(messageContainerRef);

    // Custom hooks for managing reactions and thoughts
    const {
      pendingReactions,
      errors: reactionErrors,
      handleReaction,
    } = useReactions({
      messages,
      conversationId,
      userId,
      handleReactionAdded,
    });

    // Expose scrollToBottom method to parent
    useImperativeHandle(ref, () => ({
      scrollToBottom: () => {
        scrollToBottom();
      },
    }));

    // const renderMessages = () => {
    //   if (!messages) {
    //     // Show ThinkBox as loading state if we have thought data
    //     if (
    //       thinkBoxData &&
    //       (thinkBoxData.thoughtChunks.length > 0 ||
    //         thinkBoxData.honchoQuery ||
    //         thinkBoxData.pdfQuery)
    //     ) {
    //       return (
    //         <div className="mb-4">
    //           <ThinkBox
    //             thoughtChunks={thinkBoxData.thoughtChunks}
    //             finished={thinkBoxData.finished}
    //             honchoQuery={thinkBoxData.honchoQuery}
    //             honchoResponse={thinkBoxData.honchoResponse}
    //             pdfQuery={thinkBoxData.pdfQuery}
    //             pdfResponse={thinkBoxData.pdfResponse}
    //           />
    //         </div>
    //       );
    //     }
    //     return null;
    //   }

    //   const allMessages = [defaultMessage, ...messages];
    //   const elements: React.ReactElement[] = [];

    //   allMessages.forEach((message, i) => {
    //     // Add the message
    //     if (message.isUser) {
    //       elements.push(
    //         <UserMessage key={message.id || i} message={message} />
    //       );
    //     } else {
    //       elements.push(
    //         <AIMessage
    //           key={message.id || i}
    //           message={message}
    //           messagesLoading={messagesLoading}
    //           onReaction={handleReaction}
    //           pendingReaction={pendingReactions[message.id]}
    //           error={allErrors[message.id]}
    //         />
    //       );
    //     }

    //     // Add thinkbox after the last user message (before AI response)
    //     const isLastMessage = i === allMessages.length - 1;
    //     const isLastUserMessage =
    //       message.isUser &&
    //       i < allMessages.length - 1 &&
    //       !allMessages[i + 1]?.isUser;
    //     const shouldShowThinkBox =
    //       (isLastMessage || isLastUserMessage) &&
    //       thinkBoxData &&
    //       (thinkBoxData.thoughtChunks.length > 0 ||
    //         thinkBoxData.honchoQuery ||
    //         thinkBoxData.pdfQuery);

    //     if (shouldShowThinkBox) {
    //       elements.push(
    //         <div key={`thinkbox-${i}`} className="mb-4">
    //           <ThinkBox
    //             thoughtChunks={thinkBoxData.thoughtChunks}
    //             finished={thinkBoxData.finished}
    //             honchoQuery={thinkBoxData.honchoQuery}
    //             honchoResponse={thinkBoxData.honchoResponse}
    //             pdfQuery={thinkBoxData.pdfQuery}
    //             pdfResponse={thinkBoxData.pdfResponse}
    //           />
    //         </div>
    //       );
    //     }
    //   });

    //   return elements;
    // };

    const allMessages = [defaultMessage, ...(messages || [])];

    return (
      <ScrollArea className="flex-1 w-full min-h-0" ref={messageContainerRef}>
        <div className="max-w-[740px] mx-auto pb-[50vh] pt-5">
          {allMessages.map((message) => {
            if (message.isUser) {
              return <UserMessage key={message.id} message={message} />;
            } else {
              return (
                <AIMessage
                  key={message.id}
                  message={message}
                  messagesLoading={messagesLoading}
                  onReaction={handleReaction}
                  pendingReaction={pendingReactions[message.id]}
                  error={reactionErrors[message.id]}
                />
              );
            }
          })}
        </div>
      </ScrollArea>
    );
  }
);

MessageList.displayName = 'MessageList';

export default MessageList;
