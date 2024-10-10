import { useEffect, useState } from "react";
import Image from "next/image";
import icon from "@/public/bloomicon.jpg";
import usericon from "@/public/usericon.svg";
import Skeleton from "react-loading-skeleton";
import { FaLightbulb, FaThumbsDown, FaThumbsUp } from "react-icons/fa";
import { API, type Message } from "@/utils/api";

export type Reaction = "thumbs_up" | "thumbs_down" | null;

interface MessageBoxProps {
  isUser?: boolean;
  userId?: string;
  URL?: string;
  conversationId?: string;
  message: Message;
  loading?: boolean;
  isThoughtsOpen?: boolean;
  setIsThoughtsOpen: (isOpen: boolean) => void;
  setThought: (thought: string) => void;
  onReactionAdded: (
    messageId: string,
    reaction: Exclude<Reaction, null>,
  ) => Promise<void>;
}

export default function MessageBox({
  isUser,
  userId,
  URL,
  message,
  loading = false,
  setIsThoughtsOpen,
  conversationId,
  onReactionAdded,
  setThought,
}: MessageBoxProps) {
  const [isThoughtLoading, setIsThoughtLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReactionPending, setIsReactionPending] = useState<boolean>(false);

  const { id: messageId, text, metadata } = message;
  const reaction = metadata?.reaction || null;
  const shouldShowButtons = messageId !== "";

  const handleReaction = async (newReaction: Exclude<Reaction, null>) => {
    if (!messageId || !conversationId || !userId || !URL) return;

    setIsReactionPending(true);

    try {
      await onReactionAdded(messageId, newReaction);
    } catch (err) {
      console.error(err);
      setError("Failed to add reaction.");
    } finally {
      setIsReactionPending(false);
    }
  };

  const handleFetchThought = async () => {
    if (!messageId || !conversationId || !userId || !URL) return;

    setIsThoughtLoading(true);
    setError(null);

    try {
      const api = new API({ url: URL, userId });
      const thought = await api.getThoughtById(conversationId, messageId);

      if (thought) {
        setIsThoughtsOpen(true);
        setThought(thought);
      } else {
        setError("No thought found.");
      }
    } catch (err) {
      setError("Failed to fetch thought.");
      console.error(err);
    } finally {
      setIsThoughtLoading(false);
    }
  };

  return (
    <article
      className={
        "flex p-5 lg:p-8 gap-2 lg:gap-5 lg:rounded-2xl " +
        (isUser ? "bg-gray-100 dark:bg-gray-800" : "")
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
        {loading ? (
          <Skeleton count={4} />
        ) : (
          <div className="message-content">{text}</div>
        )}
        {!loading && !isUser && shouldShowButtons && (
          <div className="flex justify-start gap-2 mt-2">
            <button
              className={`p-2 rounded-full ${
                reaction === "thumbs_up"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              } ${isReactionPending ? "opacity-50" : ""}`}
              onClick={() => handleReaction("thumbs_up")}
              disabled={reaction !== null || isReactionPending}
            >
              <FaThumbsUp />
            </button>
            <button
              className={`p-2 rounded-full ${
                reaction === "thumbs_down"
                  ? "bg-red-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              } ${isReactionPending ? "opacity-50" : ""}`}
              onClick={() => handleReaction("thumbs_down")}
              disabled={reaction !== null || isReactionPending}
            >
              <FaThumbsDown />
            </button>
            <button
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
              onClick={handleFetchThought}
              disabled={isThoughtLoading}
            >
              <FaLightbulb />
            </button>
          </div>
        )}
        {isReactionPending && (
          <p className="text-sm text-gray-500">Saving reaction...</p>
        )}
        {isThoughtLoading && <p>Loading thought...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
      </div>
    </article>
  );
}
