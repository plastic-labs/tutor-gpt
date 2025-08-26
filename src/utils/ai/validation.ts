import { getChatAccessWithUser } from '@/utils/supabase/actions'
import { createClient } from '@/utils/supabase/server'
import type { UserData, ValidationResult } from './types'

export async function validateUser(): Promise<ValidationResult> {
  const supabase = await createClient()

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser()

  if (!supabaseUser) {
    return { isAuthorized: false, error: 'Unauthorized', status: 401 }
  }

  const { canChat } = await getChatAccessWithUser(supabaseUser.id)

  if (!canChat) {
    return { isAuthorized: false, error: 'Subscription required', status: 402 }
  }

  return {
    isAuthorized: true,
    userData: {
      userId: supabaseUser.id, // User ID is now the peer ID
    },
    supabaseUser,
  }
}
