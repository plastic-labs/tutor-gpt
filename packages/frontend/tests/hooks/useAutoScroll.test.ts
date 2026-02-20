import { renderHook, act } from '@testing-library/react';
import { useAutoScroll } from '../../src/hooks/useAutoScroll';

describe('useAutoScroll', () => {
  it('containerRef is created', () => {
    const { result } = renderHook(() => useAutoScroll());
    expect(result.current.containerRef).toBeDefined();
    expect(result.current.containerRef.current).toBeNull();
  });

  it('isAtBottom starts as true', () => {
    const { result } = renderHook(() => useAutoScroll());
    expect(result.current.isAtBottom).toBe(true);
  });

  it('scrollToBottom is a function', () => {
    const { result } = renderHook(() => useAutoScroll());
    expect(typeof result.current.scrollToBottom).toBe('function');
  });

  it('scrollToBottom sets scrollTop to scrollHeight when container exists', () => {
    const { result } = renderHook(() => useAutoScroll());

    // Create a mock container element
    const mockContainer = {
      scrollTop: 0,
      scrollHeight: 500,
      clientHeight: 300,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLDivElement;

    // Assign the mock container to the ref
    Object.defineProperty(result.current.containerRef, 'current', {
      writable: true,
      value: mockContainer,
    });

    act(() => {
      result.current.scrollToBottom();
    });

    expect(mockContainer.scrollTop).toBe(500);
  });

  it('scrollToBottom does nothing when container is null', () => {
    const { result } = renderHook(() => useAutoScroll());

    // containerRef.current is null by default - should not throw
    act(() => {
      result.current.scrollToBottom();
    });

    expect(result.current.containerRef.current).toBeNull();
  });
});
