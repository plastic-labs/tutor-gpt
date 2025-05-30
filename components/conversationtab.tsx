import { Conversation } from '@/utils/types';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import { departureMono } from '@/utils/fonts';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    // Today - show time
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    // Older - show date
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    });
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
    e.stopPropagation();
  };

  if (loading) {
    return (
      <div
        className={`${departureMono.className} px-2.5 py-2 rounded-xl flex justify-between items-center overflow-hidden w-full`}
      >
        <div className="flex-1">
          <Skeleton height={20} className="mb-1" />
          <Skeleton height={12} width={60} />
        </div>
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`${departureMono.className} px-2.5 py-2 rounded-xl flex justify-between items-center overflow-hidden cursor-pointer hover:bg-secondary-background transition-colors w-full ${
            selected ? 'bg-secondary-background' : ''
          }`}
          onClick={select}
        >
          <div className="flex flex-col justify-start items-start gap-0.5 flex-1 min-w-0">
            <div className="text-black text-sm font-normal truncate w-full">
              {conversation.name || 'Untitled'}
            </div>
            <div className="text-neutral-500 text-[10px] font-normal">
              {/* TODO: Add timestamp to Conversation type */}
              {formatTimestamp(new Date().toISOString())}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-4 h-4 flex items-center justify-center text-neutral-500 hover:text-neutral-700 transition-colors ml-2 flex-shrink-0"
                onClick={handleOptionsClick}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuItem onClick={edit} className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={del} className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={edit} className="flex items-center gap-2">
          <Edit className="w-4 h-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          onClick={del}
          className="flex items-center gap-2 text-red-600"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
