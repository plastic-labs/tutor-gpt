import { create } from 'zustand';

interface ChatState {
  activeConversationId: string | null;
  canSend: boolean;
  inputValue: string;

  setActiveConversationId: (id: string | null) => void;
  setCanSend: (canSend: boolean) => void;
  setInputValue: (value: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  canSend: true,
  inputValue: '',

  setActiveConversationId: (id) => set({ activeConversationId: id }),
  setCanSend: (canSend) => set({ canSend }),
  setInputValue: (value) => set({ inputValue: value }),
}));
