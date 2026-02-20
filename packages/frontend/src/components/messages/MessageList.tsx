import { useEffect } from 'react';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { AIMessage } from './AIMessage';
import { UserMessage } from './UserMessage';
import { ThinkBox } from '@/components/chat/ThinkBox';
import type { Message, ThinkingData } from '@bloom/shared/types';

interface MessageListProps {
  messages: Message[] | undefined;
  defaultMessage: Message;
  messagesLoading: boolean;
  streaming: boolean;
  toolCalls?: { tool: string; args: Record<string, unknown>; result?: string }[];
  thinkingData?: ThinkingData;
}

export function MessageList({
  messages,
  defaultMessage,
  messagesLoading,
  streaming,
  toolCalls,
  thinkingData,
}: MessageListProps) {
  const { containerRef, isAtBottom, scrollToBottom } = useAutoScroll();

  // Auto-scroll when new content arrives during streaming
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, streaming, isAtBottom, scrollToBottom]);

  const displayMessages = messages && messages.length > 0 ? messages : [defaultMessage];

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-4 py-6 space-y-6"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {messagesLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-muted rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          displayMessages.map((msg, index) =>
            msg.isUser ? (
              <UserMessage key={msg.id ?? index} message={msg} />
            ) : (
              <div key={msg.id ?? index} className="space-y-2">
                {/* Show ThinkBox for the last AI message during streaming */}
                {streaming && index === displayMessages.length - 1 && thinkingData && (
                  <ThinkBox
                    toolCalls={toolCalls ?? []}
                    finished={thinkingData.thoughtFinished}
                  />
                )}
                {/* Show historical thinking data */}
                {!msg.isUser && msg.thinking && (
                  <ThinkBox
                    toolCalls={[]}
                    finished={true}
                    historicalData={msg.thinking}
                  />
                )}
                <AIMessage message={msg} />
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}
