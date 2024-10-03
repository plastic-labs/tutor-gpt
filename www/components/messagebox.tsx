import { useCallback, useState } from "react";
import Image from "next/image";
import icon from "@/public/bloomicon.jpg";
import usericon from "@/public/usericon.svg";
import Skeleton from "react-loading-skeleton";
import { FaLightbulb, FaThumbsDown, FaThumbsUp } from "react-icons/fa";
import { API } from "@/utils/api";
import useSWR, { mutate } from "swr";

interface MessageBoxProps {
  isUser?: boolean;
  messageId?: string;
  conversationId?: string;
  api?: API;
  text: string;
  loading?: boolean;
  isThoughtsOpen?: boolean;
  setIsThoughtsOpen: (isOpen: boolean) => void;
  setThought: (thought: string) => void;
}

const fetchThought = async (key: string) => {
  const [_, conversationId, messageId, userId] = key.split(":");
  const api = new API({ url: process.env.NEXT_PUBLIC_API_URL!, userId });
  return api.getThoughtById(conversationId, messageId);
};

export default function MessageBox({
  isUser,
  messageId,
  api,
  text,
  loading = false,
  setIsThoughtsOpen,
  conversationId,
  setThought,
}: MessageBoxProps) {
  const [shouldFetch, setShouldFetch] = useState(false);
  const shouldShowButtons = messageId !== "";

  const {
    data: thought,
    error,
    isValidating,
  } = useSWR(
    shouldFetch && messageId && api
      ? `thought:${conversationId}:${messageId}:${api.userId}`
      : null,
    fetchThought,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      onSuccess: (data) => {
        console.log(data);
        if (data) {
          setIsThoughtsOpen(true);
          setThought(data);
        }
      },
    },
  );

  const handleFetchThought = useCallback(() => {
    setShouldFetch(true);
    if (messageId && api) {
      const key = `thought:${conversationId}:${messageId}:${api.userId}`;
      mutate(key);
    }
  }, [messageId, api, conversationId]);

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
          <div className="flex justify-center gap-2 mt-2">
            <button className="p-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <FaThumbsUp />
            </button>
            <button className="p-2 rounded-full bg-gray-200 dark:bg-gray-700">
              <FaThumbsDown />
            </button>
            <button
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
              onClick={handleFetchThought}
              disabled={isValidating}
            >
              <FaLightbulb />
            </button>
          </div>
        )}
        {isValidating && <p>Loading thought...</p>}
        {error && <p className="text-red-500">Error: {error.message}</p>}
      </div>
    </article>
  );
}
