import { useState } from 'react'
import { LuCheck, LuClipboard, LuThumbsDown, LuThumbsUp } from 'react-icons/lu'
import type { AIMessage as AIMessageType } from '@/utils/types'
import MarkdownWrapper from '../markdownWrapper'
import Spinner from '../spinner'
import ThinkBox from '../ThinkBox'

export type Reaction = 'thumbs_up' | 'thumbs_down' | null

interface AIMessageProps {
  message: AIMessageType
  messagesLoading: boolean
  onReaction: (messageId: string, reaction: Exclude<Reaction, null>) => void
  pendingReaction?: Reaction
  error?: string
}

function AIMessage({
  message,
  messagesLoading,
  onReaction,
  pendingReaction,
  error,
}: AIMessageProps) {
  const { id: messageId, content, metadata, thinking } = message
  const reaction = (metadata?.reaction as Reaction) || null
  const shouldShowButtons = messageId !== ''
  const [isCopied, setIsCopied] = useState(false)

  // Check if we should show the ThinkBox
  // Show for AI messages that either have thinking data OR are being streamed (empty content with thinking object)
  const shouldShowThinkBox =
    thinking &&
    (thinking.thoughtContent ||
      thinking.honchoQuery ||
      thinking.honchoResponse ||
      thinking.pdfQuery ||
      thinking.pdfResponse ||
      (!thinking.thoughtFinished && content === '')) // Show for new AI messages being streamed

  const handleCopyToClipboard = async () => {
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  return (
    <div className="mb-6">
      {/* ThinkBox - render before AI message content */}
      {shouldShowThinkBox && thinking && (
        <ThinkBox
          thoughtContent={thinking.thoughtContent}
          finished={thinking.thoughtFinished || false}
          honchoQuery={thinking.honchoQuery || ''}
          honchoResponse={thinking.honchoResponse || ''}
          pdfQuery={thinking.pdfQuery || ''}
          pdfResponse={thinking.pdfResponse || ''}
        />
      )}

      {/* AI message content - no background, just text on page background */}
      <div className="mb-3 text-foreground">
        <MarkdownWrapper text={content} />
      </div>

      {/* Action buttons for AI messages */}
      {!messagesLoading && shouldShowButtons && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-start gap-4">
            <button
              className={`group p-0 transition-colors ${
                reaction === 'thumbs_up'
                  ? 'text-blue-500'
                  : 'text-muted-foreground hover:text-foreground'
              } ${pendingReaction === 'thumbs_up' ? 'opacity-50' : ''}`}
              onClick={() => onReaction(messageId, 'thumbs_up')}
              disabled={pendingReaction !== undefined}
              aria-label="Thumbs up"
            >
              <div className="flex h-6 w-5 items-center justify-center">
                {pendingReaction === 'thumbs_up' ? (
                  <Spinner size={22} />
                ) : (
                  <LuThumbsUp className="h-5 w-5" />
                )}
              </div>
            </button>
            <button
              className={`group p-0 transition-colors ${
                reaction === 'thumbs_down'
                  ? 'text-red-500'
                  : 'text-muted-foreground hover:text-foreground'
              } ${pendingReaction === 'thumbs_down' ? 'opacity-50' : ''}`}
              onClick={() => onReaction(messageId, 'thumbs_down')}
              disabled={pendingReaction !== undefined}
              aria-label="Thumbs down"
            >
              <div className="flex h-6 w-5 items-center justify-center">
                {pendingReaction === 'thumbs_down' ? (
                  <Spinner size={22} />
                ) : (
                  <LuThumbsDown className="h-5 w-5" />
                )}
              </div>
            </button>
            <button
              className={`group rounded-none border-none bg-transparent p-0 transition-colors focus:outline-none ${
                isCopied
                  ? 'text-green-500'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={handleCopyToClipboard}
              title={isCopied ? 'Copied!' : 'Copy to clipboard'}
              aria-label={isCopied ? 'Copied!' : 'Copy to clipboard'}
            >
              <div className="flex h-6 w-5 items-center justify-center">
                {isCopied ? (
                  <LuCheck className="h-5 w-5" />
                ) : (
                  <LuClipboard className="h-5 w-5" />
                )}
              </div>
            </button>
          </div>
          {error && <div className="text-red-400 text-sm">Error: {error}</div>}
        </div>
      )}
    </div>
  )
}

export default AIMessage
