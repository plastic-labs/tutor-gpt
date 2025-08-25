import { useState } from 'react';
import { Message } from '@/utils/types';
import { Reaction } from '@/components/messages/AIMessage';

interface UseReactionsProps {
  messages: Message[] | undefined;
  conversationId?: string;
  userId: string;
  handleReactionAdded: (messageId: string, reaction: Reaction) => Promise<void>;
}

export const useReactions = ({
  messages,
  conversationId,
  userId,
  handleReactionAdded,
}: UseReactionsProps) => {
  const [pendingReactions, setPendingReactions] = useState<
    Record<string, Reaction>
  >({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleReaction = async (
    messageId: string,
    newReaction: Exclude<Reaction, null>
  ) => {
    if (!messageId || !conversationId || !userId) return;

    setPendingReactions((prev) => ({ ...prev, [messageId]: newReaction }));

    try {
      const currentReaction =
        (messages?.find((m) => m.id === messageId)?.metadata
          ?.reaction as Reaction) || null;
      const reactionToSend =
        currentReaction === newReaction ? null : newReaction;
      await handleReactionAdded(messageId, reactionToSend);
    } catch (err) {
      console.error(err);
      setErrors((prev) => ({
        ...prev,
        [messageId]: 'Failed to update reaction.',
      }));
    } finally {
      setPendingReactions((prev) => {
        const newState = { ...prev };
        delete newState[messageId];
        return newState;
      });
    }
  };

  return {
    pendingReactions,
    errors,
    handleReaction,
  };
};
