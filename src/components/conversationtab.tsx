import { Edit, MoreHorizontal, Trash2 } from 'lucide-react'
import Skeleton from 'react-loading-skeleton'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { departureMono } from '@/utils/fonts'
import type { Conversation } from '@/utils/types'

interface ConversationTabRegularProps {
  conversation: Conversation
  select: () => void
  selected: boolean
  edit: () => void
  del: () => void
  loading?: false
}

interface ConversationTabLoadingProps {
  conversation?: undefined
  select?: undefined
  selected?: undefined
  edit?: undefined
  del?: undefined
  loading: true
}

type ConversationTabProps =
  | ConversationTabRegularProps
  | ConversationTabLoadingProps

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    // Today - show time
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } else if (days === 1) {
    return 'Yesterday'
  } else if (days < 7) {
    return `${days} days ago`
  } else {
    // Older - show date
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    })
  }
}

export function ConversationTab({
  conversation,
  select,
  selected,
  edit,
  del,
  loading,
}: ConversationTabProps) {
  const handleOptionsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  if (loading) {
    return (
      <div
        className={`${departureMono.className} flex min-h-[48px] w-full items-center justify-between overflow-hidden rounded-xl px-2.5 py-2`}
      >
        <div className="flex-1">
          <Skeleton height={20} className="mb-1" />
          <Skeleton height={12} width={60} />
        </div>
      </div>
    )
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`${departureMono.className} flex min-h-[48px] w-full cursor-pointer items-center justify-between overflow-hidden rounded-xl px-2.5 py-2 transition-colors hover:bg-secondary-background ${
            selected ? 'bg-secondary-background' : ''
          }`}
          onClick={select}
        >
          <div className="flex min-w-0 flex-1 flex-col items-start justify-start gap-0.5">
            <div className="w-full truncate font-normal text-foreground text-sm">
              {conversation.name || 'Untitled'}
            </div>
            <div className="font-normal text-[10px] text-muted-foreground">
              {/* TODO: Add timestamp to Conversation type */}
              {formatTimestamp(new Date().toISOString())}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="ml-2 flex h-4 w-4 flex-shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                onClick={handleOptionsClick}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuItem
                onClick={edit}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={del}
                className="flex items-center gap-2 text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={edit} className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          onClick={del}
          className="flex items-center gap-2 text-red-600"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
