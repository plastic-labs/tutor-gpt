import { useState } from 'react';
import { Copy, Check, ThumbsUp, ThumbsDown } from 'lucide-react';
import { MarkdownWrapper } from '@/components/chat/MarkdownWrapper';
import type { Message } from '@bloom/shared/types';

interface AIMessageProps {
  message: Message;
}

export function AIMessage({ message }: AIMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reaction = (message.metadata as { reaction?: string })?.reaction;

  return (
    <div className="group">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <MarkdownWrapper text={message.content} />
      </div>

      {/* Action buttons */}
      {message.id !== 'default' && message.id !== 'streaming' && (
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
            aria-label="Copy message"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            className={`p-1 rounded ${
              reaction === 'thumbs_up'
                ? 'text-blue-500'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label="Thumbs up"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            className={`p-1 rounded ${
              reaction === 'thumbs_down'
                ? 'text-red-500'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label="Thumbs down"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
