import { useState } from "react";
import Image from "next/image";
import icon from "@/public/bloomicon.jpg";
import usericon from "@/public/usericon.svg";
import Skeleton from "react-loading-skeleton";
import { FaLightbulb } from "react-icons/fa";
import { API } from "@/utils/api";
import MarkdownWrapper from "./markdownWrapper";

interface MessageBoxProps {
  isUser?: boolean;
  userId?: string;
  URL?: string;
  messageId?: string;
  conversationId?: string;
  text: string;
  loading?: boolean;
  isThoughtsOpen?: boolean;
  setIsThoughtsOpen: (isOpen: boolean) => void;
  setThought: (thought: string) => void;
}

export default function MessageBox({
  isUser,
  userId,
  URL,
  messageId,
  text,
  loading = false,
  setIsThoughtsOpen,
  conversationId,
  setThought,
}: MessageBoxProps) {
  const [isThoughtLoading, setIsThoughtLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shouldShowButtons = messageId !== '';

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
    <MarkdownWrapper>
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
            <div className="flex justify-left gap-2 mt-2">
              {/* <button className="p-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <FaThumbsUp />
            </button>
            <button className="p-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <FaThumbsDown />
            </button> */}
              <button
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
                onClick={handleFetchThought}
                disabled={isThoughtLoading}
              >
                <FaLightbulb />
              </button>
            </div>
          )}
          {isThoughtLoading && <p>Loading thought...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
        </div>
      </article>
    </MarkdownWrapper>
  );
}
