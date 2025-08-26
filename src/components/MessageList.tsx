'use client'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import AIMessage, { type Reaction } from '@/components/messages/AIMessage'
import UserMessage from '@/components/messages/UserMessage'
import { ScrollArea } from '@/components/ui/scroll-area'
import useAutoScroll from '@/hooks/autoscroll'
import { useReactions } from '@/hooks/useReactions'
import type { Message } from '@/utils/types'

interface MessageListProps {
  messages: Message[] | undefined
  defaultMessage: Message
  userId: string
  conversationId?: string
  messagesLoading: boolean
  handleReactionAdded: (messageId: string, reaction: Reaction) => Promise<void>
}

export interface MessageListRef {
  scrollToBottom: () => void
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
    },
    ref
  ) => {
    const messageContainerRef = useRef<HTMLDivElement>(null)
    const [, scrollToBottom] = useAutoScroll(messageContainerRef)

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
    })

    // Expose scrollToBottom method to parent
    useImperativeHandle(ref, () => ({
      scrollToBottom: () => {
        scrollToBottom()
      },
    }))

    const allMessages = [defaultMessage, ...(messages || [])]

    return (
      <ScrollArea className="min-h-0 w-full flex-1" ref={messageContainerRef}>
        <div className="mx-auto max-w-[740px] px-10 pt-5 pb-[50vh]">
          {allMessages.map((message, index) => {
            // Use a combination of id and index to ensure unique keys
            const messageKey = message.id || `temp-${index}`

            if (message.isUser) {
              return <UserMessage key={messageKey} message={message} />
            } else {
              return (
                <AIMessage
                  key={messageKey}
                  message={message}
                  messagesLoading={messagesLoading}
                  onReaction={handleReaction}
                  pendingReaction={pendingReactions[message.id]}
                  error={reactionErrors[message.id]}
                />
              )
            }
          })}
        </div>
      </ScrollArea>
    )
  }
)

MessageList.displayName = 'MessageList'

export default MessageList
