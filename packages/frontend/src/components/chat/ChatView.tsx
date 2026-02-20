import { useCallback, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { useArtifactStore } from '@/stores/artifactStore';
import { useConversations, useCreateConversation } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useChatStream } from '@/hooks/useChatStream';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { MessageList } from '@/components/messages/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import type { Message } from '@bloom/shared/types';

const DEFAULT_MESSAGE: Message = {
  id: 'default',
  content: "Hey! I'm Bloom, your personal learning companion. What would you like to explore?",
  isUser: false,
  metadata: {},
};

export function ChatView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId);
  const canSend = useChatStore((s) => s.canSend);
  const inputValue = useChatStore((s) => s.inputValue);
  const setInputValue = useChatStore((s) => s.setInputValue);

  const isMobile = useUIStore((s) => s.isMobile);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const setIsMobile = useUIStore((s) => s.setIsMobile);

  const artifactPanelOpen = useArtifactStore((s) => s.panelOpen);

  const { data: conversations = [] } = useConversations();
  const { data: messages, isLoading: messagesLoading } = useMessages(activeConversationId);
  const createConversation = useCreateConversation();

  // Handle stream completion: refresh messages
  const onStreamComplete = useCallback(
    (userMsg: string, aiMsg: string) => {
      queryClient.invalidateQueries({
        queryKey: ['messages', activeConversationId],
      });
    },
    [queryClient, activeConversationId]
  );

  const {
    streaming,
    responseText,
    thinkingData,
    toolCalls,
    artifact,
    error: streamError,
    sendMessage,
    abort,
  } = useChatStream(activeConversationId, onStreamComplete);

  // Detect mobile
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  // Auto-select first conversation
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].conversationId);
    }
  }, [activeConversationId, conversations, setActiveConversationId]);

  // Open artifact panel when artifact comes through stream
  useEffect(() => {
    if (artifact) {
      useArtifactStore.getState().setPanelOpen(true);
      useArtifactStore.getState().setActiveArtifact(artifact.artifact.id);
    }
  }, [artifact]);

  const handleNewChat = useCallback(async () => {
    const result = await createConversation.mutateAsync();
    setActiveConversationId(result.conversationId);
  }, [createConversation, setActiveConversationId]);

  const handleSend = useCallback(
    async (message: string) => {
      if (!canSend || !message.trim()) return;
      setInputValue('');
      await sendMessage(message);
    },
    [canSend, sendMessage, setInputValue]
  );

  // Build messages to display (including streaming message)
  const displayMessages = [...(messages ?? [])];
  if (streaming && responseText) {
    displayMessages.push({
      id: 'streaming',
      content: responseText,
      isUser: false,
      metadata: {},
    } as Message);
  }

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      {sidebarOpen && (
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
          onNewChat={handleNewChat}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />
      )}

      {/* Main content */}
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={artifactPanelOpen ? 60 : 100} minSize={40}>
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <MessageList
                messages={displayMessages.length > 0 ? displayMessages : undefined}
                defaultMessage={DEFAULT_MESSAGE}
                messagesLoading={messagesLoading}
                streaming={streaming}
                toolCalls={toolCalls}
                thinkingData={streaming ? thinkingData : undefined}
              />
            </div>

            {/* Input */}
            <MessageInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
              disabled={!canSend || streaming}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              sidebarOpen={sidebarOpen}
            />
          </div>
        </Panel>

        {/* Artifact panel */}
        {artifactPanelOpen && (
          <>
            <PanelResizeHandle className="w-1 bg-border hover:bg-primary/20 transition-colors" />
            <Panel defaultSize={40} minSize={25}>
              <ArtifactPanel />
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
}
