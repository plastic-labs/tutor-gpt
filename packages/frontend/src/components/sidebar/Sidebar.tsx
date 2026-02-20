import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { useDeleteConversation, useUpdateConversation } from '@/hooks/useConversations';
import {
  Plus,
  Settings,
  LogOut,
  X,
  Pencil,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import type { Conversation } from '@bloom/shared/types';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onClose: () => void;
  isMobile: boolean;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onClose,
  isMobile,
}: SidebarProps) {
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);
  const user = useAuthStore((s) => s.user);
  const deleteConversation = useDeleteConversation();
  const updateConversation = useUpdateConversation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const submitRename = () => {
    if (editingId && editName.trim()) {
      updateConversation.mutate({ id: editingId, name: editName.trim() });
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this conversation?')) {
      deleteConversation.mutate(id);
      if (activeConversationId === id) {
        const remaining = conversations.filter((c) => c.conversationId !== id);
        if (remaining.length > 0) {
          onSelectConversation(remaining[0].conversationId);
        } else {
          onNewChat();
        }
      }
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      <div
        className={`${
          isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'
        } w-72 bg-card border-r flex flex-col h-full`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-sm">Conversations</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onNewChat}
              className="p-1.5 hover:bg-accent rounded-md"
              aria-label="New conversation"
            >
              <Plus className="h-4 w-4" />
            </button>
            {isMobile && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-accent rounded-md"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.map((convo) => (
            <div
              key={convo.conversationId}
              className={`group flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer ${
                activeConversationId === convo.conversationId
                  ? 'bg-accent'
                  : 'hover:bg-accent/50'
              }`}
              onClick={() => {
                onSelectConversation(convo.conversationId);
                if (isMobile) onClose();
              }}
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />

              {editingId === convo.conversationId ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={submitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRename();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-background border border-input rounded px-1 py-0.5 text-sm"
                  autoFocus
                />
              ) : (
                <span className="flex-1 truncate">{convo.name}</span>
              )}

              <div className="hidden group-hover:flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRename(convo.conversationId, convo.name);
                  }}
                  className="p-1 hover:bg-background rounded"
                  aria-label="Rename"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(convo.conversationId);
                  }}
                  className="p-1 hover:bg-background rounded text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t p-3 space-y-1">
          <button
            onClick={() => navigate({ to: '/settings' })}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded-md"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: '/auth' });
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded-md text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
          {user?.email && (
            <p className="px-3 py-1 text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
