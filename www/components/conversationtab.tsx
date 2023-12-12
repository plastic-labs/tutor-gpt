import { Conversation } from "@/utils/api";
import { FaEdit, FaTrash } from "react-icons/fa";
import Skeleton from "react-loading-skeleton";

interface ConversationTabRegularProps {
  conversation: Conversation;
  select: () => void;
  selected: boolean;
  edit: () => void;
  del: () => void;
  loading?: false;
}

interface ConversationTabLoadingProps {
  conversation?: undefined;
  select?: undefined;
  selected?: undefined;
  edit?: undefined;
  del?: undefined;
  loading: true;
}

type ConversationTabProps =
  | ConversationTabRegularProps
  | ConversationTabLoadingProps;

export function ConversationTab({
  conversation,
  select,
  selected,
  edit,
  del,
  loading,
}: ConversationTabProps) {
  return (
    <div
      className={`flex justify-between items-center p-4 cursor-pointer hover:bg-gray-200 hover:dark:bg-gray-800  ${
        selected ? "bg-gray-200 dark:bg-gray-800" : ""
      }`}
      onClick={select}
    >
      {loading ? (
        <div className="flex-1">
          <Skeleton />
        </div>
      ) : (
        <>
          <div>
            <h2 className="font-bold overflow-ellipsis overflow-hidden ">
              {conversation.name || "Untitled"}
            </h2>
          </div>
          <div className="flex flex-row justify-end gap-2 items-center w-1/5">
            <button className="text-gray-500" onClick={edit}>
              <FaEdit />
            </button>
            <button className="text-red-500" onClick={del}>
              <FaTrash />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
