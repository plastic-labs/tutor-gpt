import { useChatStore } from '../../src/stores/chatStore';

describe('chatStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useChatStore.setState({
      activeConversationId: null,
      canSend: true,
      inputValue: '',
    });
  });

  it('has correct initial state', () => {
    const state = useChatStore.getState();
    expect(state.activeConversationId).toBeNull();
    expect(state.canSend).toBe(true);
    expect(state.inputValue).toBe('');
  });

  it('setActiveConversationId updates the ID', () => {
    useChatStore.getState().setActiveConversationId('conv-123');
    expect(useChatStore.getState().activeConversationId).toBe('conv-123');
  });

  it('setActiveConversationId to null works', () => {
    useChatStore.getState().setActiveConversationId('conv-123');
    expect(useChatStore.getState().activeConversationId).toBe('conv-123');

    useChatStore.getState().setActiveConversationId(null);
    expect(useChatStore.getState().activeConversationId).toBeNull();
  });

  it('setCanSend toggles canSend', () => {
    expect(useChatStore.getState().canSend).toBe(true);

    useChatStore.getState().setCanSend(false);
    expect(useChatStore.getState().canSend).toBe(false);

    useChatStore.getState().setCanSend(true);
    expect(useChatStore.getState().canSend).toBe(true);
  });

  it('setInputValue updates inputValue', () => {
    useChatStore.getState().setInputValue('Hello world');
    expect(useChatStore.getState().inputValue).toBe('Hello world');
  });
});
