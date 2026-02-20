import { renderHook, act } from '@testing-library/react';

// Create mock functions in vi.hoisted so they're available to vi.mock factories
const { mockFetchStream } = vi.hoisted(() => ({
  mockFetchStream: vi.fn(),
}));

// Mock supabase before any store imports
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

// Mock the api module using the hoisted mock
// Use both alias and relative path to ensure mock matches
vi.mock('@/lib/api', () => ({
  api: {},
  fetchStream: mockFetchStream,
}));
vi.mock('../../src/lib/api', () => ({
  api: {},
  fetchStream: mockFetchStream,
}));

// Mock the byokStore
vi.mock('@/stores/byokStore', () => ({
  useBYOKStore: Object.assign(
    () => ({ enabled: false }),
    {
      getState: () => ({
        enabled: false,
        provider: 'openai',
        getApiKey: vi.fn().mockResolvedValue(''),
        model: 'gpt-4o',
        baseUrl: '',
      }),
    }
  ),
}));

import { useChatStream } from '../../src/hooks/useChatStream';
import { useChatStore } from '../../src/stores/chatStore';

describe('useChatStream', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({
      activeConversationId: null,
      canSend: true,
      inputValue: '',
    });
  });

  it('initial state is not streaming', () => {
    const { result } = renderHook(() =>
      useChatStream('conv-1', mockOnComplete)
    );

    expect(result.current.streaming).toBe(false);
    expect(result.current.responseText).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.toolCalls).toEqual([]);
    expect(result.current.artifact).toBeNull();
  });

  it('sendMessage does nothing when conversationId is null', async () => {
    const { result } = renderHook(() =>
      useChatStream(null, mockOnComplete)
    );

    await act(async () => {
      await result.current.sendMessage('hello');
    });

    expect(mockFetchStream).not.toHaveBeenCalled();
    expect(result.current.streaming).toBe(false);
  });

  it('sendMessage does nothing for empty messages', async () => {
    const { result } = renderHook(() =>
      useChatStream('conv-1', mockOnComplete)
    );

    await act(async () => {
      await result.current.sendMessage('   ');
    });

    expect(mockFetchStream).not.toHaveBeenCalled();
  });

  it('starting a stream sets isStreaming and disables canSend', async () => {
    // Create a stream that we can control
    let resolveStream!: (value: Response) => void;
    const streamPromise = new Promise<Response>((resolve) => {
      resolveStream = resolve;
    });

    mockFetchStream.mockReturnValue(streamPromise);

    const { result } = renderHook(() =>
      useChatStream('conv-1', mockOnComplete)
    );

    // Start sending (don't await - it will hang until we resolve)
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.sendMessage('hello');
    });

    // The state should show streaming
    expect(result.current.streaming).toBe(true);
    expect(useChatStore.getState().canSend).toBe(false);

    // Resolve the stream with a mock response to end the test cleanly
    const mockReader = {
      read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
    };
    const mockResponse = {
      body: { getReader: () => mockReader },
    } as unknown as Response;

    await act(async () => {
      resolveStream(mockResponse);
      await sendPromise!;
    });

    // After stream completes, streaming should be false
    expect(result.current.streaming).toBe(false);
    expect(useChatStore.getState().canSend).toBe(true);
  });

  it('processes response chunks correctly', async () => {
    const encoder = new TextEncoder();
    const chunks =
      [
        JSON.stringify({ type: 'response', text: 'Hello ' }),
        JSON.stringify({ type: 'response', text: 'world!' }),
        JSON.stringify({ type: 'done' }),
      ].join('\n') + '\n';

    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode(chunks),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    };

    const mockResponse = {
      body: { getReader: () => mockReader },
    } as unknown as Response;

    mockFetchStream.mockResolvedValue(mockResponse);

    const { result } = renderHook(() =>
      useChatStream('conv-1', mockOnComplete)
    );

    await act(async () => {
      await result.current.sendMessage('test');
    });

    expect(result.current.responseText).toBe('Hello world!');
    expect(mockOnComplete).toHaveBeenCalledWith('test', 'Hello world!');
  });

  it('handles stream errors gracefully', async () => {
    mockFetchStream.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useChatStream('conv-1', mockOnComplete)
    );

    await act(async () => {
      await result.current.sendMessage('test');
    });

    expect(mockFetchStream).toHaveBeenCalled();
    expect(result.current.streaming).toBe(false);
    expect(result.current.error).toBe('Network error');
    expect(useChatStore.getState().canSend).toBe(true);
  });

  it('abort function is available', () => {
    const { result } = renderHook(() =>
      useChatStream('conv-1', mockOnComplete)
    );

    expect(typeof result.current.abort).toBe('function');
  });
});
