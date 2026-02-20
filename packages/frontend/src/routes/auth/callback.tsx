import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // The Supabase onAuthStateChange listener in the store will
    // automatically pick up the SIGNED_IN event from the OAuth callback
    if (user) {
      navigate({ to: '/' });
    }
  }, [user, navigate]);

  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-muted-foreground">Completing sign in...</p>
    </div>
  );
}
