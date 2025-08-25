import { FaDiscord } from 'react-icons/fa'
import { createClient } from '@/utils/supabase/client'

type DiscordSignInProps = {
  text: string
}

export default function DiscordSignIn({ text }: DiscordSignInProps) {
  const supabase = createClient()

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('Error signing in with Discord:', error)
    }
  }

  return (
    <button
      onClick={handleSignIn}
      className="flex w-full items-center justify-center rounded-md bg-[#5865F2] px-4 py-2 font-medium text-sm text-white transition-colors duration-300 hover:bg-[#4752C4]"
    >
      <FaDiscord className="mr-2 h-4 w-4" />
      {text} with Discord
    </button>
  )
}
