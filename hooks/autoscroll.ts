import { useEffect, useRef } from 'react';

export default function useAutoScroll(
  containerRef: React.RefObject<HTMLElement | null>
): [boolean, () => void] {
  const isAtBottom = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const listener = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrolledToBottom =
        Math.abs(scrollHeight - clientHeight - scrollTop) < 1;

      if (scrolledToBottom && !isAtBottom.current) {
        isAtBottom.current = true;
      } else if (!scrolledToBottom && isAtBottom.current) {
        isAtBottom.current = false;
      }
    };

    container.addEventListener('scroll', listener);
    return () => container.removeEventListener('scroll', listener);
  }, [containerRef]);

  const scrollToBottom = () => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  };

  return [isAtBottom.current, scrollToBottom];
}
