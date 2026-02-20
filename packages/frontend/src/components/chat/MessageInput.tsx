import { useRef, useEffect } from 'react';
import { Send, PanelLeftClose, PanelLeft } from 'lucide-react';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  disabled: boolean;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  disabled,
  onToggleSidebar,
  sidebarOpen,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSend(value);
      }
    }
  };

  return (
    <div className="border-t p-4">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-muted-foreground hover:text-foreground rounded-md"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeft className="h-5 w-5" />
          )}
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
            className="w-full resize-none px-4 py-3 pr-12 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            onClick={() => onSend(value)}
            disabled={disabled || !value.trim()}
            className="absolute right-2 bottom-2 p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
