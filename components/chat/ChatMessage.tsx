import { cn } from '@/utils/cn'
import { Message } from '@/app/types'
import { IconUser } from '@/components/icons'
import { Markdown } from '@/components/ui/markdown'

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user' || message.isUser

  return (
    <div
      className={cn(
        'flex items-start gap-4 pr-5 pl-2 py-4',
        isUser ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'bg-white dark:bg-zinc-900'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow',
          isUser
            ? 'bg-white dark:bg-zinc-800'
            : 'bg-black text-white dark:bg-white dark:text-black'
        )}
      >
        {isUser ? (
          <IconUser />
        ) : (
          <svg
            width="25"
            height="25"
            viewBox="0 0 25 25"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12.5 2L2 7.5L12.5 13L23 7.5L12.5 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 17.5L12.5 23L23 17.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12.5L12.5 18L23 12.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-hidden px-1">
        <Markdown>{message.content}</Markdown>
      </div>
    </div>
  )
} 