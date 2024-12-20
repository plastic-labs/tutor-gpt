import { getSubscription } from '@/utils/supabase/queries';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Chat from './Chat';
import { getFreeMessageCount } from '@/utils/supabase/actions';
import { getConversations } from './actions/conversations';
import { getMessages } from './actions/messages';
import { type Message } from '@/utils/types';
import { CookieConsentBanner } from '@/components/cookieConsentBanner';

export default async function Home() {
  const supabase = createClient();

  // Get user session on server
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect('/auth');
  }

  // Get initial subscription state
  let isSubscribed = false;
  let freeMessages = 0;

  if (process.env.NEXT_PUBLIC_STRIPE_ENABLED === 'false') {
    isSubscribed = true;
  } else {
    const sub = await getSubscription(supabase);
    // Only consider active paid subscriptions, not trials
    isSubscribed = !!(sub && sub.status === 'active' && !sub.trial_end);

    if (!isSubscribed) {
      freeMessages = await getFreeMessageCount(user.id);
    }
  }

  // Get initial conversations
  const conversations = await getConversations();

  // Get messages for the first conversation if it exists
  let initialMessages: Message[] = [];
  let initialConversationId: string | undefined = undefined;
  if (conversations.length > 0) {
    initialConversationId = conversations[0].conversationId;
    initialMessages = await getMessages(initialConversationId);
  }

  return (
    <>
      <CookieConsentBanner />
      <Chat
        initialUserId={user.id}
        initialEmail={user.email}
        initialIsSubscribed={isSubscribed}
        initialFreeMessages={freeMessages}
        initialConversations={conversations}
        initialMessages={initialMessages}
        initialConversationId={initialConversationId}
      />
    </>
  );
}
