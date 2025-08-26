import { FcGoogle } from 'react-icons/fc'
import { createClient } from '@/utils/supabase/client'

type GoogleSignInProps = {
  text: string
}

export default function GoogleSignIn({ text }: GoogleSignInProps) {
  const supabase = createClient()

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('Error signing in with Google:', error)
    }
  }

  return (
    <button
      onClick={handleGoogleSignIn}
      className="mt-4 flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm shadow-xs hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-neon-green focus:ring-offset-2"
    >
      <FcGoogle className="mr-2 h-5 w-5" />
      {text} with Google
    </button>
  )
}
