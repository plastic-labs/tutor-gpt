import { Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { usePostHog } from 'posthog-js/react'
import { useState } from 'react'
import { FaUser } from 'react-icons/fa'
import { toast } from 'sonner'
import useSWR, { type KeyedMutator, useSWRConfig } from 'swr'
import {
  createConversation,
  deleteConversation,
  updateConversation,
} from '@/app/actions/conversations'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { departureMono } from '@/utils/fonts'
import { createClient } from '@/utils/supabase/client'
import { clearSWRCache } from '@/utils/swrCache'
import type { Conversation } from '@/utils/types'
import { ConversationTab } from './conversationtab'

export default function Sidebar({
  conversations,
  mutateConversations,
  conversationId,
  setConversationId,
  canUseApp,
  onNewChat,
}: {
  conversations: Conversation[]
  mutateConversations: KeyedMutator<Conversation[]>
  conversationId: string | undefined
  setConversationId: (id: typeof conversationId) => void
  canUseApp: boolean
  onNewChat: () => void
}) {
  const postHog = usePostHog()
  const supabase = createClient()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingConversation, setEditingConversation] =
    useState<Conversation | null>(null)
  const [deletingConversation, setDeletingConversation] =
    useState<Conversation | null>(null)
  const [newName, setNewName] = useState('')
  const router = useRouter()
  const { mutate } = useSWRConfig()

  function editConversation(cur: Conversation) {
    setEditingConversation(cur)
    setNewName(cur.name || '')
    setEditDialogOpen(true)
  }

  async function handleEditSave() {
    if (!editingConversation || !newName.trim()) return

    // Optimistically update the UI
    mutateConversations(
      conversations.map((conversation) =>
        conversation.conversationId === editingConversation.conversationId
          ? { ...conversation, name: newName.trim() }
          : conversation
      ),
      false // Skip revalidation
    )

    try {
      await updateConversation(
        editingConversation.conversationId,
        newName.trim()
      )
      setEditDialogOpen(false)
      setEditingConversation(null)
      setNewName('')
    } catch (error) {
      // Revert on error
      mutateConversations(conversations)
      toast.error('Failed to update conversation name')
      console.error('Failed to update conversation name:', error)
    }
  }

  function removeConversation(conversation: Conversation) {
    setDeletingConversation(conversation)
    setDeleteDialogOpen(true)
  }

  async function handleDeleteConfirm() {
    if (!deletingConversation) return

    // Store original state for rollback
    const originalConversations = conversations

    // Optimistically update UI
    const newConversations = conversations.filter(
      (cur) => cur.conversationId !== deletingConversation.conversationId
    )
    mutateConversations(newConversations, false)

    if (deletingConversation.conversationId === conversationId) {
      if (newConversations.length >= 1) {
        setConversationId(newConversations[0].conversationId)
      }
    }

    try {
      await deleteConversation(deletingConversation.conversationId)
      postHog?.capture('user_deleted_conversation')

      // If we need to create a new conversation because we deleted the last one
      if (newConversations.length === 0) {
        const newConv = await createConversation()
        setConversationId(newConv?.conversationId)
        mutateConversations([newConv!])
      }

      setDeleteDialogOpen(false)
      setDeletingConversation(null)
    } catch (error) {
      // Revert on error
      mutateConversations(originalConversations)
      setConversationId(conversationId)
      toast.error('Failed to delete conversation')
      console.error('Failed to delete conversation:', error)
      setDeleteDialogOpen(false)
      setDeletingConversation(null)
    }
  }

  async function _addChat() {
    // Create a temporary conversation with a loading state
    const tempId = `temp-${Date.now()}`
    const tempConversation: Conversation = {
      conversationId: tempId,
      name: 'Untitled',
    }

    // Optimistically add the temporary conversation
    mutateConversations([tempConversation, ...conversations], false)
    setConversationId(tempId)
    onNewChat()

    try {
      const newConversation = await createConversation()
      postHog?.capture('user_created_conversation')

      // Replace temporary conversation with the real one
      mutateConversations([
        newConversation!,
        ...conversations.filter((c) => c.conversationId !== tempId),
      ])
      setConversationId(newConversation?.conversationId)
    } catch (error) {
      // Remove temporary conversation on error
      mutateConversations(conversations)
      setConversationId(conversationId)
      toast.error('Failed to create new chat')
      console.error('Failed to create new chat:', error)
    }
  }

  const fetchUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  }

  const { data: user, isLoading: isUserLoading } = useSWR('user', fetchUser)

  return (
    <div className={`${departureMono.className} h-full w-full`}>
      <div className="flex h-full flex-col items-start justify-between overflow-hidden border-border border-r bg-background">
        {/* Top section with conversations */}
        <div className="flex min-h-0 flex-1 flex-col items-start justify-start gap-2 self-stretch overflow-hidden px-2.5 py-5">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-center gap-2.5 px-2.5 py-1">
            <div className="font-normal text-muted-foreground text-xs">
              Past Chats
            </div>
          </div>

          {/* Conversation list */}
          <div className="group scrollbar-hover-only flex min-h-0 w-full flex-col gap-2 overflow-y-auto">
            <div className="flex w-full flex-col gap-2">
              {conversations.length > 0
                ? conversations.map((cur, i) => (
                    <div key={i} className="shrink-0">
                      <ConversationTab
                        conversation={cur}
                        select={() => setConversationId(cur.conversationId)}
                        selected={conversationId === cur.conversationId}
                        edit={() => editConversation(cur)}
                        del={() => removeConversation(cur)}
                      />
                    </div>
                  ))
                : Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="shrink-0">
                      <ConversationTab loading />
                    </div>
                  ))}
            </div>
          </div>
        </div>

        {/* Bottom section with user info */}
        <div className="flex items-center justify-between self-stretch overflow-hidden px-5 py-2.5">
          <div className="flex items-center justify-start gap-2.5">
            {isUserLoading ? (
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted"></div>
            ) : user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <FaUser className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="font-normal text-base text-foreground">
              {isUserLoading
                ? 'Loading...'
                : user?.user_metadata?.full_name || user?.email || 'User Name'}
            </div>
          </div>

          {/* Settings dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-6 w-6 items-center justify-center text-foreground transition-colors hover:text-muted-foreground">
                <Settings className="h-5 w-5" />
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
                  clearSWRCache()
                  mutate(() => true, undefined, { revalidate: false })
                  await supabase.auth.signOut()
                  window.location.href = '/'
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
        <DialogContent
          className={`sm:max-w-[425px] ${departureMono.className}`}
        >
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
                  handleEditSave()
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
              className="bg-foreground font-mono text-background hover:bg-foreground/90"
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
              Are you sure you want to delete &ldquo;
              {deletingConversation?.name || 'this conversation'}&rdquo;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 font-mono hover:bg-red-700 focus-visible:ring-red-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
