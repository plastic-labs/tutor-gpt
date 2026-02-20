import { MarkdownWrapper } from '@/components/chat/MarkdownWrapper';
import type { Message } from '@bloom/shared/types';

interface UserMessageProps {
  message: Message;
}

export function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-secondary text-secondary-foreground">
        <MarkdownWrapper text={message.content} />
      </div>
    </div>
  );
}
