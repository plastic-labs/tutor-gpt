'use client';

import { useState, useEffect } from 'react';
import { FaDiscord } from 'react-icons/fa';
import { createClient } from '@/utils/supabase/client';
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserIdentity } from '@supabase/supabase-js';

const fetcher = async () => {
  const supabase = createClient();

  // Get the user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('Error fetching user:', userError);
    return { error: 'Failed to fetch user data' };
  }

  // Get the user's identities
  const {
    data: { identities },
    error: identitiesError,
  } = await supabase.auth.getUserIdentities();

  if (identitiesError) {
    console.error('Error fetching user identities:', identitiesError);
    return { error: 'Failed to fetch user identities' };
  }

  // Find the Discord identity
  const discordIdentity = identities?.find(
    (identity: UserIdentity) => identity.provider === 'discord'
  );

  const urlParams = new URLSearchParams(window.location.search);
  const authSuccess = urlParams.get('auth') === 'success';
  const error = urlParams.get('error');

  return {
    isDiscordConnected: !!discordIdentity,
    discordTag: discordIdentity
      ? discordIdentity.identity_data.global_name ||
        discordIdentity.identity_data.name
      : null,
    discordAvatar: discordIdentity
      ? discordIdentity.identity_data.avatar_url
      : null,
    discordEmail: discordIdentity ? discordIdentity.identity_data.email : null,
    authSuccess,
    error,
  };
};

export function IntegrationsSettings() {
  const { data, error, mutate } = useSWR('discordConnection', fetcher);
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (data) {
      if (data.authSuccess) {
        setMessage('Discord account successfully linked!');
        mutate(); // Refresh the data
      } else if (data.error) {
        setMessage(`Error: ${data.error}`);
      }
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [data, mutate]);

  const handleDiscordConnect = async () => {
    setIsLinking(true);
    setMessage('');
    const { data: linkData, error: linkError } =
      await supabase.auth.linkIdentity({
        provider: 'discord',
        options: {
          redirectTo: `${location.origin}/settings`,
        },
      });

    if (linkError) {
      console.error('Error connecting Discord:', linkError);
      setMessage('Error connecting Discord. Please try again.');
    } else if (linkData?.url) {
      setMessage('Redirecting to Discord for authentication...');
      setTimeout(() => {
        window.location.href = linkData.url;
      }, 2000); // Short delay to show the message before redirecting
    }
    setIsLinking(false);
  };

  const handleDiscordDisconnect = async () => {
    const { data: identitiesData, error: identitiesError } =
      await supabase.auth.getUserIdentities();

    if (identitiesError) {
      console.error('Error fetching user identities:', identitiesError);
      setMessage('Error disconnecting Discord. Please try again.');
      return;
    }

    if (!identitiesData || !identitiesData.identities) {
      console.error('No identities found');
      setMessage('No Discord connection found to disconnect.');
      return;
    }

    const discordIdentity = identitiesData.identities.find(
      (identity: UserIdentity) => identity.provider === 'discord'
    );

    if (!discordIdentity) {
      console.error('Discord identity not found');
      setMessage('No Discord connection found to disconnect.');
      return;
    }

    const { error: unlinkError } =
      await supabase.auth.unlinkIdentity(discordIdentity);
    if (unlinkError) {
      console.error('Error disconnecting Discord:', unlinkError);
      setMessage('Error disconnecting Discord. Please try again.');
    } else {
      setMessage('Discord account successfully disconnected.');
      mutate(); // Revalidate the data after disconnecting
    }
  };

  if (error) return <div>Failed to load</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold text-primary">Integrations</h2>
      <Card>
        <CardHeader>
          <CardTitle>Discord Integration</CardTitle>
          <CardDescription>Connect your Discord account</CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <p
              className={`text-sm mb-4 ${message.includes('error') ? 'text-red-600' : 'text-blue-600'}`}
            >
              {message}
            </p>
          )}
          {data.isDiscordConnected ? (
            <div className="space-y-4">
              <p className="text-sm dark:text-gray-300">
                Connected as:{' '}
                <span className="font-semibold">{data.discordTag}</span>
              </p>
              <Button
                onClick={handleDiscordDisconnect}
                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors duration-300"
              >
                <FaDiscord className="mr-2 h-4 w-4" />
                Disconnect Discord Account
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleDiscordConnect}
              disabled={isLinking}
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-[#5865F2] hover:bg-[#4752C4] rounded-md transition-colors duration-300"
            >
              {isLinking ? (
                <span>Connecting...</span>
              ) : (
                <>
                  <FaDiscord className="mr-2 h-4 w-4" />
                  Connect Discord Account
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
