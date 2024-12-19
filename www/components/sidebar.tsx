import { GrClose } from 'react-icons/gr';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import localFont from 'next/font/local';

import { usePostHog } from 'posthog-js/react';
import Swal from 'sweetalert2';
import { ConversationTab } from './conversationtab';
import { useState, useCallback } from 'react';
import useSWR, { KeyedMutator, useSWRConfig } from 'swr';
import { FaUser } from 'react-icons/fa';
import {
  createConversation,
  deleteConversation,
  updateConversation,
} from '@/app/actions/conversations';
import { type Conversation, type Message } from '@/utils/types';
import { clearSWRCache } from '@/utils/swrCache';
import { useMemo } from 'react';

const departureMono = localFont({
  src: '../fonts/DepartureMono-Regular.woff2',
});

export default function Sidebar({
    conversations,
    mutateConversations,
    conversationId,
    setConversationId,
    isSidebarOpen,
    toggleSidebar,
    isSubscribed,
  }: {
    conversations: Conversation[];
    mutateConversations: KeyedMutator<Conversation[]>;
    conversationId: string | undefined;
    setConversationId: (id: typeof conversationId) => void;
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    isSubscribed: boolean;
  }) {
    const postHog = usePostHog();
    const supabase = createClient();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();
    const { mutate } = useSWRConfig();

    const toggleMenu = useCallback(() => {
      setIsMenuOpen((prev) => !prev);
    }, []);

    const goToSettings = useCallback(() => {
      router.push('/settings');
    }, [router]);

    const handleSignOut = useCallback(async () => {
      clearSWRCache();
      mutate(() => true, undefined, { revalidate: false });
      await supabase.auth.signOut();
      window.location.href = '/';
    }, [mutate, supabase]);

    const editConversation = useCallback(async (cur: Conversation) => {
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

      if (!newName) return;

      // Optimistically update the UI
      mutateConversations(
        conversations.map((conversation) =>
          conversation.conversationId === cur.conversationId
            ? { ...conversation, name: newName }
            : conversation
        ),
        false // Skip revalidation
      );

      try {
        await updateConversation(cur.conversationId, newName as string);
      } catch (error) {
        // Revert on error
        mutateConversations(conversations);
        Swal.fire('Error', 'Failed to update conversation name', 'error');
      }
    }, [conversations, mutateConversations]);

    const removeConversation = useCallback(async (conversation: Conversation) => {
      const { isConfirmed } = await Swal.fire({
        title: 'Are you sure you want to delete this conversation?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!',
      });

      if (!isConfirmed) return;

      // Store original state for rollback
      const originalConversations = conversations;

      // Optimistically update UI
      const newConversations = conversations.filter(
        (cur) => cur.conversationId !== conversation.conversationId
      );
      mutateConversations(newConversations, false);

      if (conversation.conversationId === conversationId) {
        if (newConversations.length >= 1) {
          setConversationId(newConversations[0].conversationId);
        }
      }

      try {
        await deleteConversation(conversation.conversationId);
        postHog?.capture('user_deleted_conversation');

        // If we need to create a new conversation because we deleted the last one
        if (newConversations.length === 0) {
          const newConv = await createConversation();
          setConversationId(newConv?.conversationId);
          mutateConversations([newConv!]);
        }
      } catch (error) {
        // Revert on error
        mutateConversations(originalConversations);
        setConversationId(conversationId);
        Swal.fire('Error', 'Failed to delete conversation', 'error');
      }
    }, [conversations, conversationId, mutateConversations, postHog, setConversationId]);

    const addChat = useCallback(async () => {
      // Create a temporary conversation with a loading state
      const tempId = 'temp-' + Date.now();
      const tempConversation: Conversation = {
        conversationId: tempId,
        name: 'Untitled',
      };

      // Optimistically add the temporary conversation
      mutateConversations([tempConversation, ...conversations], false);
      setConversationId(tempId);

      try {
        const newConversation = await createConversation();
        postHog?.capture('user_created_conversation');

        // Replace temporary conversation with the real one
        mutateConversations([
          newConversation!,
          ...conversations.filter((c) => c.conversationId !== tempId),
        ]);
        setConversationId(newConversation?.conversationId);
      } catch (error) {
        // Remove temporary conversation on error
        mutateConversations(conversations);
        setConversationId(conversationId);
        Swal.fire('Error', 'Failed to create new chat', 'error');
      }
    }, [conversations, conversationId, mutateConversations, postHog]);

    const selectCallback = useCallback((cur: Conversation) => 
      () => setConversationId(cur.conversationId)
    , [setConversationId]);
    
    const editCallback = useCallback((cur: Conversation) => 
      () => editConversation(cur)
    , [editConversation]);
    
    const deleteCallback = useCallback((cur: Conversation) => 
      () => removeConversation(cur)
    , [removeConversation]);

    const fetchUser = useCallback(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    }, [supabase]);

    const { data: user, isLoading: isUserLoading } = useSWR('auth/user', fetchUser);
    
    const header = useMemo(() => (
      <div className="flex justify-between items-center p-4 gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          className="bg-neon-green text-black rounded-lg px-4 py-2 w-full lg:w-full h-10"
          onClick={addChat}
          disabled={!isSubscribed}
        >
          New Chat
        </button>
        <button
          className="lg:hidden bg-neon-green text-black rounded-lg px-4 py-2 h-10"
          onClick={toggleSidebar}
        >
          <GrClose />
        </button>
      </div>
    ), [addChat, toggleSidebar, isSubscribed]);

    return (
      <div
        className={`${departureMono.className} absolute lg:relative top-0 left-0 z-40 h-full w-80 transition-transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full overflow-hidden bg-background dark:text-white flex flex-col border-gray-200 dark:border-gray-700 border-r">
          {/* Section 1: Top buttons */}
          {header}

          {/* Section 2: Scrollable items */}
          <div className="flex flex-col flex-1 overflow-y-auto divide-y divide-gray-300 dark:divide-gray-700">
            {conversations.length > 0
              ? conversations.map((cur, i) => (
                  <ConversationTab
                    conversation={cur}
                    select={selectCallback(cur)}
                    selected={conversationId === cur.conversationId}
                    edit={editCallback(cur)}
                    del={deleteCallback(cur)}
                    key={cur.conversationId}
                  />
                ))
              : Array.from({ length: 5 }).map((_, i) => (
                  <ConversationTab loading key={i} />
                ))}
          </div>

          {/* Section 3: Authentication information */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 w-full flex items-center justify-between">
            <div className="flex items-center">
              {isUserLoading ? (
                <div className="w-8 h-8 rounded-full bg-gray-300 mr-2 animate-pulse"></div>
              ) : user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-8 h-8 rounded-full mr-2"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300 mr-2 flex items-center justify-center">
                  <FaUser className="w-5 h-5 text-gray-600" />
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
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                onClick={toggleMenu}
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
                <div className="absolute right-0 bottom-full mb-2 w-48 bg-accent rounded-md shadow-lg py-1 z-10">
                  <button
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                    onClick={goToSettings}
                  >
                    Account Settings
                  </button>
                  <button
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                    onClick={handleSignOut}
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
