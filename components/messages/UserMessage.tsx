import React from 'react';
import { Message } from '@/utils/types';
import MarkdownWrapper from '../markdownWrapper';

interface UserMessageProps {
  message: Message;
}

function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[80%] bg-secondary-background text-black rounded-2xl px-4 py-3">
        <MarkdownWrapper text={message.content} />
      </div>
    </div>
  );
}

export default UserMessage;
