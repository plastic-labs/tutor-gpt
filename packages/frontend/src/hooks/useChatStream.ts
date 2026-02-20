import { useState, useCallback, useRef } from 'react';
import { fetchStream } from '@/lib/api';
import { useBYOKStore } from '@/stores/byokStore';
import { useChatStore } from '@/stores/chatStore';
import type { StreamChunk, Message, ThinkingData, ArtifactMeta } from '@bloom/shared/types';

interface StreamState {
  streaming: boolean;
  responseText: string;
  thinkingData: ThinkingData;
  toolCalls: { tool: string; args: Record<string, unknown>; result?: string }[];
  artifact: { action: 'create' | 'update'; artifact: ArtifactMeta } | null;
  error: string | null;
}

const initialThinkingData: ThinkingData = {
  thoughtContent: '',
  thoughtFinished: false,
};

export function useChatStream(
  conversationId: string | null,
  onComplete: (userMsg: string, aiMsg: string) => void
) {
  const [state, setState] = useState<StreamState>({
    streaming: false,
    responseText: '',
    thinkingData: initialThinkingData,
    toolCalls: [],
    artifact: null,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const setCanSend = useChatStore((s) => s.setCanSend);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!conversationId || !message.trim()) return;

      // Reset state
      setState({
        streaming: true,
        responseText: '',
        thinkingData: { ...initialThinkingData },
        toolCalls: [],
        artifact: null,
        error: null,
      });
      setCanSend(false);

      const abort = new AbortController();
      abortRef.current = abort;

      // Build BYOK config if enabled
      const byokState = useBYOKStore.getState();
      let byokConfig: Record<string, unknown> | undefined;
      if (byokState.enabled) {
        const apiKey = await byokState.getApiKey();
        byokConfig = {
          enabled: true,
          provider: byokState.provider,
          apiKey,
          model: byokState.model,
          baseUrl: byokState.baseUrl || undefined,
        };
      }

      let fullResponse = '';

      try {
        const response = await fetchStream(
          '/chat',
          { message, conversationId },
          { byokConfig, signal: abort.signal }
        );

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const chunk: StreamChunk = JSON.parse(line);
              switch (chunk.type) {
                case 'response':
                  fullResponse += chunk.text;
                  setState((s) => ({
                    ...s,
                    responseText: s.responseText + chunk.text,
                  }));
                  break;
                case 'toolCall':
                  setState((s) => ({
                    ...s,
                    toolCalls: [
                      ...s.toolCalls,
                      { tool: chunk.tool, args: chunk.args },
                    ],
                  }));
                  break;
                case 'toolResult':
                  setState((s) => ({
                    ...s,
                    toolCalls: s.toolCalls.map((tc) =>
                      tc.tool === chunk.tool && !tc.result
                        ? { ...tc, result: chunk.result }
                        : tc
                    ),
                  }));
                  break;
                case 'artifact':
                  setState((s) => ({
                    ...s,
                    artifact: {
                      action: chunk.action,
                      artifact: chunk.artifact,
                    },
                  }));
                  break;
                case 'error':
                  setState((s) => ({ ...s, error: chunk.message }));
                  break;
                case 'done':
                  break;
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        onComplete(message, fullResponse);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // User cancelled
        } else {
          setState((s) => ({
            ...s,
            error: err instanceof Error ? err.message : 'Stream failed',
          }));
        }
      } finally {
        setState((s) => ({
          ...s,
          streaming: false,
          thinkingData: { ...s.thinkingData, thoughtFinished: true },
        }));
        setCanSend(true);
        abortRef.current = null;
      }
    },
    [conversationId, setCanSend, onComplete]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { ...state, sendMessage, abort };
}
