import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Conversation } from '@bloom/shared/types';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await api.conversations.get();
      if (error) throw error;
      return data as Conversation[];
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await api.conversations.post();
      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: (newConvo) => {
      queryClient.setQueryData<Conversation[]>(
        ['conversations'],
        (old) => [newConvo, ...(old ?? [])]
      );
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.conversations({ id }).delete();
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Conversation[]>(
        ['conversations'],
        (old) => old?.filter((c) => c.conversationId !== deletedId) ?? []
      );
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await api.conversations({ id }).patch({ name });
      if (error) throw error;
      return { id, name };
    },
    onSuccess: ({ id, name }) => {
      queryClient.setQueryData<Conversation[]>(
        ['conversations'],
        (old) =>
          old?.map((c) =>
            c.conversationId === id ? { ...c, name } : c
          ) ?? []
      );
    },
  });
}
