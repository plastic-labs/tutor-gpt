import React, { useState } from 'react';
import { AIMessage as AIMessageType } from '@/utils/types';
import { LuThumbsUp, LuThumbsDown, LuClipboard, LuCheck } from 'react-icons/lu';
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
  const [isCopied, setIsCopied] = useState(false);

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

  const handleCopyToClipboard = async () => {
    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
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
              className={`group p-0 rounded-none border-none bg-transparent transition-colors focus:outline-none ${
                isCopied 
                  ? 'text-green-500' 
                  : 'text-gray-500 hover:text-black'
              }`}
              onClick={handleCopyToClipboard}
              title={isCopied ? "Copied!" : "Copy to clipboard"}
              aria-label={isCopied ? "Copied!" : "Copy to clipboard"}
            >
              <div className="w-5 h-6 flex items-center justify-center">
                {isCopied ? (
                  <LuCheck className="w-5 h-5" />
                ) : (
                  <LuClipboard className="w-5 h-5" />
                )}
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
