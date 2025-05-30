import React from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';

import { usePostHog } from 'posthog-js/react';
import { ConversationTab } from './conversationtab';
import { useState } from 'react';
import useSWR, { KeyedMutator, useSWRConfig } from 'swr';
import { FaUser } from 'react-icons/fa';
import {
  createConversation,
  deleteConversation,
  updateConversation,
} from '@/app/actions/conversations';
import { type Conversation, type Message } from '@/utils/types';
import { clearSWRCache } from '@/utils/swrCache';
import { departureMono } from '@/utils/fonts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Sidebar({
  conversations,
  mutateConversations,
  conversationId,
  setConversationId,
  canUseApp,
}: {
  conversations: Conversation[];
  mutateConversations: KeyedMutator<Conversation[]>;
  conversationId: string | undefined;
  setConversationId: (id: typeof conversationId) => void;
  canUseApp: boolean;
}) {
  const postHog = usePostHog();
  const supabase = createClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingConversation, setEditingConversation] = useState<Conversation | null>(null);
  const [deletingConversation, setDeletingConversation] = useState<Conversation | null>(null);
  const [newName, setNewName] = useState('');
  const router = useRouter();
  const { mutate } = useSWRConfig();

  function editConversation(cur: Conversation) {
    setEditingConversation(cur);
    setNewName(cur.name || '');
    setEditDialogOpen(true);
  }

  async function handleEditSave() {
    if (!editingConversation || !newName.trim()) return;

    // Optimistically update the UI
    mutateConversations(
      conversations.map((conversation) =>
        conversation.conversationId === editingConversation.conversationId
          ? { ...conversation, name: newName.trim() }
          : conversation
      ),
      false // Skip revalidation
    );

    try {
      await updateConversation(editingConversation.conversationId, newName.trim());
      setEditDialogOpen(false);
      setEditingConversation(null);
      setNewName('');
    } catch (error) {
      // Revert on error
      mutateConversations(conversations);
      toast.error('Failed to update conversation name');
      console.error('Failed to update conversation name:', error);
    }
  }

  function removeConversation(conversation: Conversation) {
    setDeletingConversation(conversation);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deletingConversation) return;

    // Store original state for rollback
    const originalConversations = conversations;

    // Optimistically update UI
    const newConversations = conversations.filter(
      (cur) => cur.conversationId != deletingConversation.conversationId
    );
    mutateConversations(newConversations, false);

    if (deletingConversation.conversationId === conversationId) {
      if (newConversations.length >= 1) {
        setConversationId(newConversations[0].conversationId);
      }
    }

    try {
      await deleteConversation(deletingConversation.conversationId);
      postHog?.capture('user_deleted_conversation');

      // If we need to create a new conversation because we deleted the last one
      if (newConversations.length === 0) {
        const newConv = await createConversation();
        setConversationId(newConv?.conversationId);
        mutateConversations([newConv!]);
      }
      
      setDeleteDialogOpen(false);
      setDeletingConversation(null);
    } catch (error) {
      // Revert on error
      mutateConversations(originalConversations);
      setConversationId(conversationId);
      toast.error('Failed to delete conversation');
      console.error('Failed to delete conversation:', error);
      setDeleteDialogOpen(false);
      setDeletingConversation(null);
    }
  }

  async function addChat() {
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
      toast.error('Failed to create new chat');
      console.error('Failed to create new chat:', error);
    }
  }

  const fetchUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  };

  const { data: user, isLoading: isUserLoading } = useSWR('user', fetchUser);

  return (
    <div className={`${departureMono.className} h-full w-full`}>
      <div className="h-full overflow-hidden bg-background border-r border-zinc-300 flex flex-col justify-between items-start">
        {/* Top section with conversations */}
        <div className="self-stretch px-2.5 py-5 flex flex-col justify-start items-start overflow-y-auto flex-1 gap-2">
          {/* Header */}
          <div className="px-2.5 py-1 flex justify-center items-center gap-2.5">
            <div className="text-neutral-500 text-xs font-normal">
              Past Chats
            </div>
          </div>

          {/* Conversation list */}
          {conversations.length > 0
            ? conversations.map((cur, i) => (
                <ConversationTab
                  conversation={cur}
                  select={() => setConversationId(cur.conversationId)}
                  selected={conversationId === cur.conversationId}
                  edit={() => editConversation(cur)}
                  del={() => removeConversation(cur)}
                  key={i}
                />
              ))
            : Array.from({ length: 5 }).map((_, i) => (
                <ConversationTab loading key={i} />
              ))}
        </div>

        {/* Bottom section with user info */}
        <div className="self-stretch px-5 py-2.5 flex justify-between items-center overflow-hidden">
          <div className="flex justify-start items-center gap-2.5">
            {isUserLoading ? (
              <div className="w-10 h-10 rounded-full bg-gray-300 animate-pulse"></div>
            ) : user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                <FaUser className="w-5 h-5 text-gray-600" />
              </div>
            )}
            <div className="text-black text-base font-normal">
              {isUserLoading
                ? 'Loading...'
                : user?.user_metadata?.full_name || user?.email || 'User Name'}
            </div>
          </div>

          {/* Settings dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-6 h-6 flex items-center justify-center text-black hover:text-gray-600 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-48">
              <DropdownMenuItem 
                onClick={() => router.push('/settings')}
                className="cursor-pointer"
              >
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={async () => {
                  clearSWRCache();
                  mutate(() => true, undefined, { revalidate: false });
                  await supabase.auth.signOut();
                  window.location.href = '/';
                }}
                className="cursor-pointer"
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Edit Conversation Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className={`sm:max-w-[425px] ${departureMono.className}`}>
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
            <DialogDescription>
              Enter a new name for this conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Conversation name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleEditSave();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
              className="font-mono"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditSave}
              disabled={!newName.trim()}
              className="bg-black text-white hover:bg-gray-800 font-mono"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className={departureMono.className}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deletingConversation?.name || 'this conversation'}&rdquo;? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 font-mono"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
