import { getSubscription } from '@/utils/supabase/queries';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Chat from './Chat';
import { getFreeMessageCount } from '@/utils/supabase/actions';
import { getConversations } from './actions/conversations';
import { getMessages } from './actions/messages';
import { type Message } from '@/utils/types';

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
<<<<<<< HEAD
      freeMessages = await getFreeMessageCount(user.id);
=======
      const currentCount = await getFreeMessageCount(userId);
      if (currentCount <= 0) {
        Swal.fire({
          title: 'Free Messages Depleted',
          text: 'You have used all your free messages. Subscribe to continue using Bloom!',
          icon: 'warning',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Subscribe',
          showCancelButton: true,
        });
        return;
      }
    }

    const textbox = input.current!;
    // process message to have double newline for markdown
    const message = textbox.value.replace(/\n/g, '\n\n');
    textbox.value = '';

    setCanSend(false);

    const newMessages = [
      ...messages!,
      {
        content: message,
        isUser: true,
        id: '',
      },
      {
        content: '',
        isUser: false,
        id: '',
      },
    ];
    mutateMessages(newMessages, { revalidate: false });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    let thoughtReader: ReadableStreamDefaultReader | null = null;
    let responseReader: ReadableStreamDefaultReader | null = null;

    try {
      // Get thought stream
      const thoughtStream = await fetchStream(
        'thought',
        message,
        conversationId!
      );
      if (!thoughtStream) throw new Error('Failed to get thought stream');

      thoughtReader = thoughtStream.getReader();
      let thoughtText = '';
      setThought('');

      // Process thought stream
      while (true) {
        const { done, value } = await thoughtReader.read();
        if (done) break;

        thoughtText += new TextDecoder().decode(value);

        setThought(thoughtText);
      }

      // Cleanup thought stream
      thoughtReader.releaseLock();
      thoughtReader = null;

      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Get response stream using the thought
      const responseStream = await fetchStream(
        'response',
        message,
        conversationId!,
        thoughtText,
        ''
      );
      if (!responseStream) throw new Error('Failed to get response stream');

      responseReader = responseStream.getReader();
      let currentModelOutput = '';

      // Process response stream
      while (true) {
        const { done, value } = await responseReader.read();
        if (done) {
          if (!isSubscribed) {
            const success = await useFreeTrial(userId);
            if (success) {
              const newCount = await getFreeMessageCount(userId);
              setFreeMessages(newCount);
            }
          }
          setCanSend(true);
          break;
        }

        currentModelOutput += new TextDecoder().decode(value);

        mutateMessages(
          [
            ...(newMessages?.slice(0, -1) || []),
            {
              content: currentModelOutput,
              isUser: false,
              id: '',
            },
          ],
          { revalidate: false }
        );

        if (isAtBottom.current) {
          const messageContainer = messageContainerRef.current;
          if (messageContainer) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
          }
        }
      }

      responseReader.releaseLock();
      responseReader = null;

      mutateMessages();
    } catch (error) {
      console.error('Chat error:', error);
      setCanSend(true);
      mutateMessages();
    } finally {
      // Cleanup
      if (thoughtReader) {
        try {
          thoughtReader.releaseLock();
        } catch (e) {
          console.error('Error releasing thought reader:', e);
        }
      }
      if (responseReader) {
        try {
          responseReader.releaseLock();
        } catch (e) {
          console.error('Error releasing response reader:', e);
        }
      }
>>>>>>> ff4d641 (Maybe it's the middleware)
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
    <Chat
      initialUserId={user.id}
      initialEmail={user.email}
      initialIsSubscribed={isSubscribed}
      initialFreeMessages={freeMessages}
      initialConversations={conversations}
      initialMessages={initialMessages}
      initialConversationId={initialConversationId}
    />
  );
}
