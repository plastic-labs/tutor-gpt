import { createClient } from '@/utils/supabase/client';
import { FcGoogle } from 'react-icons/fc';

type GoogleSignInProps = {
  text: string;
};

export default function GoogleSignIn({ text }: GoogleSignInProps) {
  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      className="flex items-center justify-center w-full px-4 py-2 mt-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-xs hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-neon-green"
    >
      <FcGoogle className="w-5 h-5 mr-2" />
      {text} with Google
    </button>
  );
}
