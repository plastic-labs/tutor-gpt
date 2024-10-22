import { GrClose } from 'react-icons/gr';
import { Conversation, API } from '@/utils/api';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

import { usePostHog } from 'posthog-js/react';
import Swal from 'sweetalert2';
import { ConversationTab } from './conversationtab';
import { useState } from 'react';
export default function Sidebar({
  conversations,
  mutateConversations,
  conversationId,
  setConversationId,
  isSidebarOpen,
  setIsSidebarOpen,
  api,
  isSubscribed,
}: {
  conversations: Conversation[];
  mutateConversations: Function;
  conversationId: string | undefined;
  setConversationId: Function;
  isSidebarOpen: boolean;
  setIsSidebarOpen: Function;
  api: API | undefined;
  isSubscribed: boolean;
}) {
  const postHog = usePostHog();
  const supabase = createClient();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  async function editConversation(cur: Conversation) {
    const { value: newName } = await Swal.fire({
      title: 'Enter a new name for the conversation',
      input: 'text',
      inputLabel: 'Conversation Name',
      inputValue: cur.name,
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write something!';
        }
      },
    });

    await cur.setName(newName);

    // Force a re-render by directly updating the state
    mutateConversations(
      conversations.map((conversation) =>
        conversation.conversationId === cur.conversationId
          ? new Conversation({ ...conversation, name: newName })
          : conversation
      )
    );
  }

  async function deleteConversation(conversation: Conversation) {
    const { isConfirmed } = await Swal.fire({
      title: 'Are you sure you want to delete this conversation?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    });

    if (isConfirmed) {
      await conversation.delete();
      postHog?.capture('user_deleted_conversation');
      // Delete the conversation_id from the conversations state variable
      const newConversations = conversations.filter(
        (cur) => cur.conversationId != conversation.conversationId
      );
      if (conversation.conversationId == conversationId) {
        if (newConversations.length > 1) {
          setConversationId(newConversations[0].conversationId);
        } else {
          const newConv = await api?.new();
          setConversationId(newConv?.conversationId);
          mutateConversations([newConv]);
        }
      }
      mutateConversations(newConversations);
    }
  }

  async function addChat() {
    const conversation = await api?.new();
    postHog?.capture('user_created_conversation');
    setConversationId(conversation?.conversationId);
    mutateConversations([conversation, ...conversations]);
  }

  return (
    <div
      className={`fixed lg:static z-20 inset-0 flex-none h-full w-full lg:absolute lg:h-auto lg:overflow-visible lg:pt-0 lg:w-60 xl:w-72 lg:block lg:shadow-lg border-r border-gray-300 dark:border-gray-700 ${isSidebarOpen ? '' : 'hidden'
        }`}
    >
      <div
        className={`h-full scrollbar-trigger overflow-hidden bg-white dark:bg-gray-950 dark:text-white sm:w-3/5 w-4/5 lg:w-full flex flex-col ${isSidebarOpen ? 'fixed lg:static' : 'sticky'
          } top-0 left-0`}
      >
        {/* Section 1: Top buttons */}
        <div className="flex justify-between items-center p-4 gap-2 border-b border-gray-300 dark:border-gray-700">
          <button
            className="bg-neon-green text-black rounded-lg px-4 py-2 w-full lg:w-full h-10"
            onClick={addChat}
            disabled={!isSubscribed}
          >
            New Chat
          </button>
          <button
            className="lg:hidden bg-neon-green text-black rounded-lg px-4 py-2 h-10"
            onClick={() => setIsSidebarOpen(false)}
          >
            <GrClose />
          </button>
        </div>

        {/* Section 2: Scrollable items */}
        <div className="flex flex-col flex-1 overflow-y-auto divide-y divide-gray-300 dark:divide-gray-700">
          {conversations.length > 0
            ? conversations.map((cur, i) => (
              <ConversationTab
                conversation={cur}
                select={() => setConversationId(cur.conversationId)}
                selected={conversationId === cur.conversationId}
                edit={() => editConversation(cur)}
                del={() => deleteConversation(cur)}
                key={i}
              />
            ))
            : Array.from({ length: 5 }).map((_, i) => (
              <ConversationTab loading key={i} />
            ))}
        </div>

        {/* Section 3: Authentication information */}
        <div className="border-t border-gray-300 dark:border-gray-700 p-4 w-full flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-300 mr-2"></div>
            <span className="text-sm font-medium">User Name</span>
          </div>
          <div className="relative">
            <button
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10">
                <button
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                  onClick={() => {
                    router.push('/subscription');
                  }}
                >
                  Manage Subscription
                </button>
                <button
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    location.reload();
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
