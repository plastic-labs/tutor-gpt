import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Message } from '@bloom/shared/types';

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await api
        .conversations({ id: conversationId })
        .messages.get();
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
  });
}
