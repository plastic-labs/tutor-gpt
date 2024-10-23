import { useState } from 'react';
import Image from 'next/image';
import icon from '@/public/bloomicon.jpg';
import usericon from '@/public/usericon.svg';
import Skeleton from 'react-loading-skeleton';
import MarkdownWrapper from './markdownWrapper';
import { FaLightbulb, FaThumbsDown, FaThumbsUp } from 'react-icons/fa';
import { API, type Message } from '@/utils/api';
import Spinner from './spinner';

export type Reaction = 'thumbs_up' | 'thumbs_down' | null;

interface MessageBoxProps {
  isUser?: boolean;
  userId?: string;
  URL?: string;
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
  URL,
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

  const { id: messageId, text, metadata } = message;
  const reaction = metadata?.reaction || null;
  const shouldShowButtons = messageId !== '';

  const handleReaction = async (newReaction: Exclude<Reaction, null>) => {
    if (!messageId || !conversationId || !userId || !URL) return;

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
    if (!messageId || !conversationId || !userId || !URL) return;
    if (isThoughtOpen) {
      // If thought is already open, close it
      setIsThoughtsOpen(false);
      return;
    }
    setIsThoughtLoading(true);
    setError(null);

    try {
      const api = new API({ url: URL, userId });
      const thought = await api.getThoughtById(conversationId, messageId);

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

  return (
    <article
      className={
        'flex p-5 lg:p-8 gap-2 lg:gap-5 lg:rounded-2xl ' +
        (isUser ? 'bg-gray-100 dark:bg-gray-800' : '')
      }
    >
      {loading ? (
        <Skeleton circle={true} className="lg:!w-12 lg:!h-12 !w-6 !h-6 " />
      ) : (
        <Image
          src={isUser ? usericon : icon}
          alt="icon"
          className="rounded-full w-6 h-6 lg:w-12 lg:h-12"
        />
      )}
      <div className="flex flex-col gap-2 w-full">
        {loading ? <Skeleton count={4} /> : <MarkdownWrapper text={text} />}
        {!loading && !isUser && shouldShowButtons && (
          <div className="flex justify-start gap-2 mt-2">
            <button
              className={`p-2 rounded-full ${reaction === 'thumbs_up'
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
              className={`p-2 rounded-full ${reaction === 'thumbs_down'
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
              className={`p-2 rounded-full ${isThoughtOpen
                  ? 'bg-neon-green text-gray-800'
                  : 'bg-gray-200 dark:bg-gray-700'
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
