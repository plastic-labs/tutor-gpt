import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { ChatView } from '@/components/chat/ChatView';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const { user, loading } = useAuthStore.getState();
    if (!loading && !user) {
      throw redirect({ to: '/auth' });
    }
  },
  component: ChatPage,
});

function ChatPage() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return <ChatView />;
}
