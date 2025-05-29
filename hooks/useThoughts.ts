import { useState } from 'react';
import { Message } from '@/utils/types';
import { getThought } from '@/app/actions/messages';

interface UseThoughtsProps {
  messages: Message[] | undefined;
  defaultMessage: Message;
  conversationId?: string;
  userId: string;
  setThoughtParent: (thought: string) => void;
  setIsThoughtsOpen: (
    isOpen: boolean,
    messageId?: string | null | undefined
  ) => void;
  openThoughtMessageId: string | null;
}

export const useThoughts = ({
  messages,
  defaultMessage,
  conversationId,
  userId,
  setThoughtParent,
  setIsThoughtsOpen,
  openThoughtMessageId,
}: UseThoughtsProps) => {
  const [isThoughtLoading, setIsThoughtLoading] = useState<boolean>(false);
  const [thoughtError, setThoughtError] = useState<{
    messageId: string;
    error: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGetThought = async (messageId: string) => {
    if (!conversationId || !userId) return;

    // Find the last user message before this AI message
    const allMessages = [defaultMessage, ...(messages || [])];
    const messageIndex = allMessages.findIndex((msg) => msg.id === messageId);

    // Look backwards for the last user message
    let lastUserMessageId = null;
    for (let i = messageIndex; i >= 0; i--) {
      if (allMessages[i].isUser) {
        lastUserMessageId = allMessages[i].id;
        break;
      }
    }

    try {
      // Try with last user message first
      if (lastUserMessageId) {
        const thought = await getThought(conversationId, lastUserMessageId);
        if (thought) {
          setThoughtParent(thought);
          setIsThoughtsOpen(true, messageId);
          return;
        }
      }

      // If that didn't work, try with current AI message
      const thought = await getThought(conversationId, messageId);
      if (thought) {
        setThoughtParent(thought);
        setIsThoughtsOpen(true, messageId);
        return;
      }

      // If neither worked
      setThoughtError({ messageId, error: 'No thought data available.' });
      console.log(messageId, 'No thought data available.');
    } catch (error) {
      console.error('Failed to fetch thought:', error);
      setThoughtError({ messageId, error: 'Failed to fetch thought.' });
    } finally {
      setIsThoughtLoading(false);
    }
  };

  const handleFetchThought = async (messageId: string) => {
    if (!messageId || !conversationId || !userId) return;
    if (openThoughtMessageId === messageId) {
      // If thought is already open, close it
      setIsThoughtsOpen(false);
      return;
    }

    setIsThoughtLoading(true);
    setErrors((prev) => {
      const newState = { ...prev };
      delete newState[messageId];
      return newState;
    });

    try {
      await handleGetThought(messageId);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [messageId]: 'Failed to fetch thought.',
      }));
      console.error(err);
    } finally {
      setIsThoughtLoading(false);
    }
  };

  return {
    isThoughtLoading,
    thoughtError,
    errors,
    handleFetchThought,
  };
};
