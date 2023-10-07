import { useRouter } from "next/navigation";
import { FaEdit, FaTrash } from "react-icons/fa";
import { GrClose } from "react-icons/gr";
import { Session } from "@supabase/supabase-js";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

import Swal from "sweetalert2";

interface Conversation {
  conversation_id: string;
  name: string;
}

const URL = process.env.NEXT_PUBLIC_API_URL;

export default function Sidebar({
  conversations,
  authSession,
  currentConversation,
  setCurrentConversation,
  setConversations,
  newChat,
  userId,
  isSidebarOpen,
  setIsSidebarOpen,
}: {
  conversations: Array<Conversation>;
  authSession: Session | null;
  currentConversation: Conversation;
  setCurrentConversation: Function;
  setConversations: Function;
  newChat: Function;
  userId: string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: Function;
}) {
  // const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter();
  const supabase = createClientComponentClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    // console.log("Signed out");
    location.reload();
  }

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
    // console.log(newName);
    if (!newName || newName === cur.name) return;
    const data = await fetch(`${URL}/api/conversations/update`, {
      method: "POST",
      body: JSON.stringify({
        conversation_id: cur.conversation_id,
        name: newName,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const copy = { ...cur };
    copy.name = newName;
    setConversations(
      conversations.map((conversation) =>
        conversation.conversation_id === copy.conversation_id
          ? copy
          : conversation
      )
    );
  }

  async function deleteConversation(conversation: Conversation) {
    Swal.fire({
      title: "Are you sure you want to delete this conversation?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { conversation_id } = conversation;
        await fetch(
          `${URL}/api/conversations/delete?user_id=${userId}&conversation_id=${conversation_id}`
        ).then((res) => res.json());
        // Delete the conversation_id from the conversations state variable
        setConversations((conversations: Array<Conversation>) => {
          const newConversations = conversations.filter(
            (cur: Conversation) => cur.conversation_id !== conversation_id
          );
          // console.log("New Conversations", newConversations);
          // If it was the currentConversation, change the currentConversation to the next one in the list
          if (conversation === currentConversation) {
            if (newConversations.length > 1) {
              setCurrentConversation(newConversations[0]);
              // console.log("Current Conversation", newConversations[0]);
            } else {
              // If there is no current conversation create a new one
              newChat().then((newConversationId: string) => {
                setCurrentConversation(newConversationId);
                // console.log("Current Conversation", newConversationId);
                setConversations([newConversationId]);
              });
            }
          }
          return newConversations;
        });
      }
    });
  }

  async function addChat() {
    const conversationId = await newChat();
    const newConversation: Conversation = {
      name: "Untitled",
      conversation_id: conversationId,
    };
    setCurrentConversation(newConversation);
    setConversations([newConversation, ...conversations]);
  }

  return (
    <div
      className={`fixed lg:static z-20 inset-0 flex-none h-full w-full lg:absolute lg:h-auto lg:overflow-visible lg:pt-0 lg:w-60 xl:w-72 lg:block lg:shadow-lg border-r border-gray-300 ${isSidebarOpen ? "" : "hidden"
        }`}
    >
      <div
        className={`h-full scrollbar-trigger overflow-hidden bg-white sm:w-3/5 w-4/5 lg:w-full flex flex-col ${isSidebarOpen ? "fixed lg:static" : "sticky"
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
                    className={`flex justify-between items-center p-4 cursor-pointer hover:bg-gray-200 ${currentConversation === cur ? "bg-gray-200" : ""
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
                        onClick={() => editConversation(cur)}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="text-red-500"
                        onClick={() => deleteConversation(cur)}
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
  {
    authSession ? (
      <button
        className="bg-neon-green rounded-lg px-4 py-2 w-full"
        onClick={handleSignOut}
      >
        Sign Out
      </button>
    ) : (
      <button
        className="bg-neon-green rounded-lg px-4 py-2 w-full"
        onClick={() => router.push("/auth")}
      >
        Sign In
      </button>
    )
  }
        </div >
      </div >
    </div >
  );
}
