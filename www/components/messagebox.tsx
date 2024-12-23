import { useState, useMemo } from 'react';
import Image from 'next/image';
import icon from '@/public/bloomicon.jpg';
import usericon from '@/public/usericon.svg';
import Skeleton from 'react-loading-skeleton';
import MarkdownWrapper from './markdownWrapper';
import {
  FaLightbulb,
  FaThumbsDown,
  FaThumbsUp,
  FaChevronDown,
  FaChevronRight,
} from 'react-icons/fa';
import { type Message } from '@/utils/types';
import Spinner from './spinner';
import { getThought } from '@/app/actions/messages';

export type Reaction = 'thumbs_up' | 'thumbs_down' | null;

interface MessageBoxProps {
  isUser?: boolean;
  userId?: string;
  conversationId?: string;
  message: Message;
  loading?: boolean;
  isThoughtOpen?: boolean;
  setIsThoughtsOpen: (isOpen: boolean) => void;
  setThought: (thought: string) => void;
  onReactionAdded: (messageId: string, reaction: Reaction) => Promise<void>;
}

export default function MessageBox({
  isUser,
  userId,
  // URL,
  message,
  loading = false,
  isThoughtOpen,
  setIsThoughtsOpen,
  conversationId,
  onReactionAdded,
  setThought,
}: MessageBoxProps) {
  const [isThoughtLoading, setIsThoughtLoading] = useState(false);
  const [pendingReaction, setPendingReaction] = useState<Reaction>(null);
  const [error, setError] = useState<string | null>(null);

  const { id: messageId, content, metadata } = message;
  const reaction = metadata?.reaction || null;
  const shouldShowButtons = messageId !== '';

  const handleReaction = async (newReaction: Exclude<Reaction, null>) => {
    if (!messageId || !conversationId || !userId) return;
    console.log('Reaction');

    setPendingReaction(newReaction);

    try {
      const reactionToSend = reaction === newReaction ? null : newReaction;
      await onReactionAdded(messageId, reactionToSend as Reaction);
    } catch (err) {
      console.error(err);
      setError('Failed to update reaction.');
    } finally {
      setPendingReaction(null);
    }
  };

  const handleFetchThought = async () => {
    if (!messageId || !conversationId || !userId) return;
    if (isThoughtOpen) {
      // If thought is already open, close it
      setIsThoughtsOpen(false);
      return;
    }
    setIsThoughtLoading(true);
    setError(null);

    try {
      const thought = await getThought(conversationId, messageId);

      if (thought) {
        setIsThoughtsOpen(true);
        setThought(thought);
      } else {
        setError('No thought found.');
      }
    } catch (err) {
      setError('Failed to fetch thought.');
      console.error(err);
    } finally {
      setIsThoughtLoading(false);
    }
  };

  const memoizedImage = useMemo(
    () => (
      <Image
        src={isUser ? usericon : icon}
        alt="icon"
        className="rounded-full w-6 h-6 lg:w-12 lg:h-12"
      />
    ),
    [isUser, usericon, icon]
  );

  const memoizedSkeleton = useMemo(() => <Skeleton count={4} />, []);

  return (
    <article
      className={
        'flex p-5 lg:p-8 gap-2 lg:gap-5 lg:rounded-2xl ' +
        (isUser ? 'bg-accent' : '')
      }
    >
      {loading ? memoizedSkeleton : memoizedImage}
      <div className="flex flex-col gap-2 w-full">
        {loading ? memoizedSkeleton : <MarkdownWrapper text={content} />}
        {!loading && !isUser && shouldShowButtons && (
          <div className="flex justify-start gap-2 mt-2">
            <button
              className={`p-2 rounded-full ${
                reaction === 'thumbs_up'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              } ${pendingReaction === 'thumbs_up' ? 'opacity-50' : ''}`}
              onClick={() => handleReaction('thumbs_up')}
              disabled={pendingReaction !== null}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {pendingReaction === 'thumbs_up' ? (
                  <Spinner size={16} />
                ) : (
                  <FaThumbsUp />
                )}
              </div>
            </button>
            <button
              className={`p-2 rounded-full ${
                reaction === 'thumbs_down'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              } ${pendingReaction === 'thumbs_down' ? 'opacity-50' : ''}`}
              onClick={() => handleReaction('thumbs_down')}
              disabled={pendingReaction !== null}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {pendingReaction === 'thumbs_down' ? (
                  <Spinner size={16} />
                ) : (
                  <FaThumbsDown />
                )}
              </div>
            </button>
            <button
              className={`p-2 rounded-full ${
                isThoughtOpen
                  ? 'bg-neon-green text-gray-800'
                  : 'bg-accent text-foreground'
              }`}
              onClick={handleFetchThought}
              disabled={isThoughtLoading}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {isThoughtLoading ? <Spinner size={16} /> : <FaLightbulb />}
              </div>
            </button>
          </div>
        )}
        {error && <p className="text-red-500">Error: {error}</p>}
      </div>
    </article>
  );
}
