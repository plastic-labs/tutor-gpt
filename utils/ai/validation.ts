import { createClient } from '@/utils/supabase/server';
import { getChatAccessWithUser } from '@/utils/supabase/actions';
import { getUserData } from '@/utils/ai';
import { ValidationResult } from './types';

export async function validateUser(): Promise<ValidationResult> {
  const supabase = await createClient();
  const honchoUserData = await getUserData();

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!honchoUserData || !supabaseUser) {
    return { isAuthorized: false, error: 'Unauthorized', status: 401 };
  }

  const { canChat } = await getChatAccessWithUser(supabaseUser.id);

  if (!canChat) {
    return { isAuthorized: false, error: 'Subscription required', status: 402 };
  }

  return {
    isAuthorized: true,
    userData: {
      appId: honchoUserData.appId,
      userId: honchoUserData.userId,
    },
    supabaseUser,
  };
}
