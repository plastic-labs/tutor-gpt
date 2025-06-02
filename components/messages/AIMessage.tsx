import React from 'react';
import { AIMessage as AIMessageType } from '@/utils/types';
import { LuThumbsUp, LuThumbsDown, LuClipboard } from 'react-icons/lu';
import MarkdownWrapper from '../markdownWrapper';
import Spinner from '../spinner';
import ThinkBox from '../ThinkBox';

export type Reaction = 'thumbs_up' | 'thumbs_down' | null;

interface AIMessageProps {
  message: AIMessageType;
  messagesLoading: boolean;
  onReaction: (messageId: string, reaction: Exclude<Reaction, null>) => void;
  pendingReaction?: Reaction;
  error?: string;
}

/**
 * Renders an AI-generated message with optional interactive elements, including reaction buttons, a copy-to-clipboard feature, and status indicators.
 *
 * Displays a "thinking" indicator if the AI is still generating a response or streaming content. Shows thumbs up/down buttons for user feedback and a button to copy the message content. If an error is provided, it is displayed below the action buttons.
 *
 * @param message - The AI message object containing content, metadata, and optional thinking state.
 * @param messagesLoading - Indicates if messages are currently loading, disabling interaction if true.
 * @param onReaction - Callback invoked when a reaction button is clicked, receiving the message ID and selected reaction.
 * @param pendingReaction - The reaction currently being processed, if any.
 * @param error - Optional error message to display below the action buttons.
 */
function AIMessage({
  message,
  messagesLoading,
  onReaction,
  pendingReaction,
  error,
}: AIMessageProps) {
  const { id: messageId, content, metadata, thinking } = message;
  const reaction = (metadata?.reaction as Reaction) || null;
  const shouldShowButtons = messageId !== '';

  // Check if we should show the ThinkBox
  // Show for AI messages that either have thinking data OR are being streamed (empty content with thinking object)
  const shouldShowThinkBox =
    thinking &&
    (thinking.thoughtContent ||
      thinking.honchoQuery ||
      thinking.honchoResponse ||
      thinking.pdfQuery ||
      thinking.pdfResponse ||
      (!thinking.thoughtFinished && content === '')); // Show for new AI messages being streamed

  const handleCopyToClipboard = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(content);
    }
  };

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
      <div className="text-black mb-3">
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
                  : 'text-gray-500 hover:text-black'
              } ${pendingReaction === 'thumbs_up' ? 'opacity-50' : ''}`}
              onClick={() => onReaction(messageId, 'thumbs_up')}
              disabled={pendingReaction !== undefined}
              aria-label="Thumbs up"
            >
              <div className="w-5 h-6 flex items-center justify-center">
                {pendingReaction === 'thumbs_up' ? (
                  <Spinner size={22} />
                ) : (
                  <LuThumbsUp className="w-5 h-5" />
                )}
              </div>
            </button>
            <button
              className={`group p-0 transition-colors ${
                reaction === 'thumbs_down'
                  ? 'text-red-500'
                  : 'text-gray-500 hover:text-black'
              } ${pendingReaction === 'thumbs_down' ? 'opacity-50' : ''}`}
              onClick={() => onReaction(messageId, 'thumbs_down')}
              disabled={pendingReaction !== undefined}
              aria-label="Thumbs down"
            >
              <div className="w-5 h-6 flex items-center justify-center">
                {pendingReaction === 'thumbs_down' ? (
                  <Spinner size={22} />
                ) : (
                  <LuThumbsDown className="w-5 h-5" />
                )}
              </div>
            </button>
            <button
              className="group p-0 rounded-none border-none bg-transparent transition-colors text-gray-500 hover:text-black focus:outline-none"
              onClick={handleCopyToClipboard}
              title="Copy to clipboard"
              aria-label="Copy to clipboard"
            >
              <div className="w-5 h-6 flex items-center justify-center">
                <LuClipboard className="w-5 h-5" />
              </div>
            </button>
          </div>
          {error && <div className="text-red-400 text-sm">Error: {error}</div>}
        </div>
      )}
    </div>
  );
}

export default AIMessage;
