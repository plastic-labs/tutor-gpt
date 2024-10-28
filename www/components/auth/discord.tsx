import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { FaDiscord } from 'react-icons/fa';

export default function DiscordSignIn() {
  const supabase = createClient();
  const router = useRouter();

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Error signing in with Discord:', error);
    }
  };

  return (
    <button
      onClick={handleSignIn}
      className="flex w-full items-center justify-center rounded-md bg-[#5865F2] px-4 py-2 text-sm font-medium text-white transition-colors duration-300 hover:bg-[#4752C4]"
    >
      <FaDiscord className="mr-2 h-4 w-4" />
      Sign in with Discord
    </button>
  );
}
