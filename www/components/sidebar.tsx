import { useRouter } from "next/navigation";
import { FaEdit, FaTrash } from "react-icons/fa";
import { GrClose } from "react-icons/gr";
import { Session } from "@supabase/supabase-js";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Conversation, API } from "@/utils/api";
import { signOut } from "@/utils/supabase";

import Swal from "sweetalert2";
import Link from "next/link";

const URL = process.env.NEXT_PUBLIC_API_URL;

export default function Sidebar({
  conversations,
  currentConversation,
  setCurrentConversation,
  setConversations,
  isSidebarOpen,
  setIsSidebarOpen,
  api,
}: {
  conversations: Conversation[];
  currentConversation: Conversation | undefined;
  setCurrentConversation: Function;
  setConversations: Function;
  isSidebarOpen: boolean;
  setIsSidebarOpen: Function;
  api: API | undefined;
}) {
  async function editConversation(cur: Conversation) {
    const { value: newName } = await Swal.fire({
      title: "Enter a new name for the conversation",
      input: "text",
      inputLabel: "Conversation Name",
      inputValue: cur.name,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return "You need to write something!";
        }
      },
    });

    await cur.setName(newName);
  }

  async function deleteConversation(conversation: Conversation) {
    const { isConfirmed } = await Swal.fire({
      title: "Are you sure you want to delete this conversation?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (isConfirmed) {
      await conversation.delete();
      // Delete the conversation_id from the conversations state variable
      const newConversations = conversations.filter(
        (cur) => cur.conversationId != conversation.conversationId
      );
      if (conversation == currentConversation) {
        if (newConversations.length > 1) {
          setCurrentConversation(newConversations[0]);
        } else {
          const newConv = await api?.new();
          setCurrentConversation(newConv);
          setConversations([newConv]);
        }
      }
      setConversations(newConversations);
      // setConversations((oldConversations: Conversation[]) => {
      //   const newConversations = oldConversations.filter(
      //     (cur) => cur.conversationId != conversation.conversationId
      //   );
      //   console.log("check type", Array.isArray(newConversations));

      //   // If it was the currentConversation, change the currentConversation to the next one in the list
      //   if (conversation == currentConversation) {
      //     if (newConversations.length > 1) {
      //       setCurrentConversation(newConversations[0]);
      //     } else {
      //       // If there is no current conversation create a new one
      //       const newConv = await api?.new();
      //       setCurrentConversation(newConv);
      //       return [newConv];
      //     }
      //   }
      //   return newConversations;
      // });
    }
  }

  async function addChat() {
    const conversation = await api?.new();
    setCurrentConversation(conversation);
    setConversations([conversation, ...conversations]);
  }

  return (
    <div
      className={`fixed lg:absolute z-20 inset-0 flex-none h-full w-full lg:h-auto lg:overflow-visible lg:pt-0 lg:w-60 xl:w-72 lg:block lg:shadow-lg border-r border-gray-300 ${
        isSidebarOpen ? "" : "hidden"
      }`}
    >
      <div
        className={`h-full scrollbar-trigger overflow-hidden bg-white sm:w-3/5 w-4/5 lg:w-full flex flex-col ${
          isSidebarOpen ? "fixed lg:static" : "sticky"
        } top-0 left-0`}
      >
        {/* Section 1: Top buttons */}
        <div className="flex justify-between items-center p-4 gap-2 border-b border-gray-300">
          <button
            className="bg-neon-green rounded-lg px-4 py-2 w-full lg:w-full h-10"
            onClick={addChat}
          >
            New Chat
          </button>
          <button
            className="lg:hidden bg-neon-green rounded-lg px-4 py-2 h-10"
            onClick={() => setIsSidebarOpen(false)}
          >
            <GrClose />
          </button>
        </div>

        {/* Section 2: Scrollable items */}
        <div className="flex flex-col flex-1 overflow-y-auto divide-y divide-gray-300">
          {conversations.map((cur, i) => (
            <div
              key={i}
              className={`flex justify-between items-center p-4 cursor-pointer hover:bg-gray-200 ${
                currentConversation === cur ? "bg-gray-200" : ""
              }`}
              onClick={() => setCurrentConversation(cur)}
            >
              <div>
                <h2 className="font-bold overflow-ellipsis overflow-hidden">
                  {cur.name || "Untitled"}
                </h2>
              </div>
              <div className="flex flex-row justify-end gap-2 items-center w-1/5">
                <button
                  className="text-gray-500"
                  onClick={async () => await editConversation(cur)}
                >
                  <FaEdit />
                </button>
                <button
                  className="text-red-500"
                  onClick={async () => await deleteConversation(cur)}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Section 3: Authentication information */}
        <div className="border-t border-gray-300 p-4 w-full">
          {/* Replace this with your authentication information */}
          {api?.session ? (
            <button
              className="bg-neon-green rounded-lg px-4 py-2 w-full"
              onClick={() => {
                signOut();
                location.reload();
              }}
            >
              Sign Out
            </button>
          ) : (
            <Link
              className="bg-neon-green rounded-lg px-4 py-2 w-full"
              href={"/auth"}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
