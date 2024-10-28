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
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

const fetcher = async () => {
  const supabase = createClient();

  // Get the user's identities
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (sessionError || !user) {
    console.error('User session is invalid:', sessionError);
    return { error: 'Invalid session', sessionInvalid: true };
  }

  if (!user.identities) {
    console.error('No identities found');
    return { error: 'No identities found' };
  }

  const discordIdentity = user.identities.find(
    (identity: UserIdentity) => identity.provider === 'discord'
  );

  const urlParams = new URLSearchParams(window.location.search);
  const authSuccess = urlParams.get('auth') === 'success';
  const error = urlParams.get('error');

  return {
    isDiscordConnected: !!discordIdentity,
    discordTag:
      discordIdentity?.identity_data?.global_name ||
      discordIdentity?.identity_data?.name ||
      null,
    discordAvatar: discordIdentity?.identity_data?.avatar_url || null,
    discordEmail: discordIdentity?.identity_data?.email || null,
    authSuccess,
    error,
  };
};

export function IntegrationsSettings() {
  const { data, error, mutate } = useSWR('discordConnection', fetcher);
  const [isLinking, setIsLinking] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (data) {
      if (data.sessionInvalid) {
        router.push('/auth');
        return;
      }

      if (data.authSuccess) {
        Swal.fire({
          title: 'Success!',
          text: 'Discord account successfully linked!',
          icon: 'success',
          confirmButtonColor: '#3085d6',
        });
        mutate();
      } else if (data.error) {
        Swal.fire({
          title: 'Error',
          text: `Error: ${data.error}`,
          icon: 'error',
          confirmButtonColor: '#3085d6',
        });
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [data, mutate, router]);

  const handleDiscordConnect = async () => {
    setIsLinking(true);

    // Check if Discord account is already linked to another user
    const { data: existingDiscordUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('discord_id', 'NOT NULL');

    if (checkError) {
      console.error('Error checking existing Discord users:', checkError);
      Swal.fire({
        title: 'Error',
        text: 'Unable to verify Discord account status. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
      setIsLinking(false);
      return;
    }

    if (existingDiscordUsers && existingDiscordUsers.length > 0) {
      Swal.fire({
        title: 'Error',
        text: 'This Discord account is already linked to another user.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
      setIsLinking(false);
      return;
    }
    const { data: linkData, error: linkError } =
      await supabase.auth.linkIdentity({
        provider: 'discord',
        options: {
          redirectTo: `${location.origin}/settings`,
        },
      });

    if (linkError) {
      console.error('Error connecting Discord:', linkError);
      Swal.fire({
        title: 'Error',
        text: 'Error connecting Discord. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } else if (linkData?.url) {
      Swal.fire({
        title: 'Redirecting...',
        text: 'Redirecting to Discord for authentication...',
        icon: 'info',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      }).then(() => {
        window.location.href = linkData.url;
      });
    }
    setIsLinking(false);
  };

  const handleDiscordDisconnect = async () => {
    const { data: identitiesData, error: identitiesError } =
      await supabase.auth.getUserIdentities();

    if (identitiesError) {
      console.error('Error fetching user identities:', identitiesError);
      Swal.fire({
        title: 'Error',
        text: 'Error disconnecting Discord. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    if (!identitiesData || !identitiesData.identities) {
      console.error('No identities found');
      Swal.fire({
        title: 'Error',
        text: 'No Discord connection found to disconnect.',
        icon: 'warning',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const discordIdentity = identitiesData.identities.find(
      (identity: UserIdentity) => identity.provider === 'discord'
    );

    if (!discordIdentity) {
      console.error('Discord identity not found');
      Swal.fire({
        title: 'Error',
        text: 'No Discord connection found to disconnect.',
        icon: 'warning',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    const { error: unlinkError } =
      await supabase.auth.unlinkIdentity(discordIdentity);
    if (unlinkError) {
      console.error('Error disconnecting Discord:', unlinkError);
      Swal.fire({
        title: 'Error',
        text: 'Error disconnecting Discord. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } else {
      Swal.fire({
        title: 'Success!',
        text: 'Discord account successfully disconnected.',
        icon: 'success',
        confirmButtonColor: '#3085d6',
      });
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
