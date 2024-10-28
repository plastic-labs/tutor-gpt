import { GrClose } from 'react-icons/gr';
import { Conversation, API } from '@/utils/api';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

import { usePostHog } from 'posthog-js/react';
import Swal from 'sweetalert2';
import { ConversationTab } from './conversationtab';
import { useState, useMemo } from 'react';
import useSWR, { KeyedMutator } from 'swr';
import { FaUser } from 'react-icons/fa';
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
  mutateConversations: KeyedMutator<Conversation[]>;
  conversationId: string | undefined;
  setConversationId: (id: typeof conversationId) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
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
          : conversation,
      ),
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
        (cur) => cur.conversationId != conversation.conversationId,
      );
      if (conversation.conversationId == conversationId) {
        if (newConversations.length > 1) {
          setConversationId(newConversations[0].conversationId);
        } else {
          const newConv = await api?.new();
          setConversationId(newConv?.conversationId);
          mutateConversations([newConv!]);
        }
      }
      mutateConversations(newConversations);
    }
  }

  async function addChat() {
    const conversation = await api?.new();
    postHog?.capture('user_created_conversation');
    setConversationId(conversation?.conversationId);
    mutateConversations([conversation!, ...conversations]);
  }

  const fetchUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  };

  const {
    data: user,
    error: userError,
    isLoading: isUserLoading,
  } = useSWR('user', fetchUser);

  const memoizedConversations = useMemo(() => {
    return conversations.map((cur, i) => (
      <ConversationTab
        conversation={cur}
        select={() => setConversationId(cur.conversationId)}
        selected={conversationId === cur.conversationId}
        edit={() => editConversation(cur)}
        del={() => deleteConversation(cur)}
        key={i}
      />
    ));
  }, [conversations, conversationId]);

  const memoizedGrClose = useMemo(() => <GrClose />, []);
  const memoizedFaUser = useMemo(
    () => <FaUser className="h-5 w-5 text-gray-600" />,
    [],
  );

  return (
    <div
      className={`fixed inset-0 z-20 h-full w-full flex-none border-r border-gray-300 dark:border-gray-700 lg:absolute lg:block lg:h-auto lg:w-60 lg:overflow-visible lg:pt-0 lg:shadow-lg xl:w-72 ${
        isSidebarOpen ? '' : 'hidden'
      }`}
    >
      <div
        className={`scrollbar-trigger flex h-full w-4/5 flex-col overflow-hidden bg-white dark:bg-gray-950 dark:text-white sm:w-3/5 lg:w-full ${
          isSidebarOpen ? 'fixed lg:static' : 'sticky'
        } left-0 top-0`}
      >
        {/* Section 1: Top buttons */}
        <div className="flex items-center justify-between gap-2 border-b border-gray-300 p-4 dark:border-gray-700">
          <button
            className="h-10 w-full rounded-lg bg-neon-green px-4 py-2 text-black lg:w-full"
            onClick={addChat}
            disabled={!isSubscribed}
          >
            New Chat
          </button>
          <button
            className="h-10 rounded-lg bg-neon-green px-4 py-2 text-black lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            {memoizedGrClose}
          </button>
        </div>

        {/* Section 2: Scrollable items */}
        <div className="flex flex-1 flex-col divide-y divide-gray-300 overflow-y-auto dark:divide-gray-700">
          {conversations.length > 0
            ? memoizedConversations
            : Array.from({ length: 5 }).map((_, i) => (
                <ConversationTab loading key={i} />
              ))}
        </div>

        {/* Section 3: Authentication information */}
        <div className="flex w-full items-center justify-between border-t border-gray-300 p-4 dark:border-gray-700">
          <div className="flex items-center">
            {isUserLoading ? (
              <div className="mr-2 h-8 w-8 animate-pulse rounded-full bg-gray-300"></div>
            ) : user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="mr-2 h-8 w-8 rounded-full"
              />
            ) : (
              <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                {memoizedFaUser}
              </div>
            )}
            <span className="text-sm font-medium">
              {isUserLoading
                ? 'Loading...'
                : user?.user_metadata?.full_name || user?.email || 'User Name'}
            </span>
          </div>
          <div className="relative">
            <button
              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg
                className="h-6 w-6"
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
              <div className="absolute bottom-full right-0 z-10 mb-2 w-48 rounded-md bg-white py-1 shadow-lg dark:bg-gray-800">
                <button
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={() => {
                    router.push('/settings');
                  }}
                >
                  Account Settings
                </button>
                <button
                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
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
