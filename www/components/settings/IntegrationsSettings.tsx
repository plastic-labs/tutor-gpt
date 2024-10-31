'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserIdentity } from '@supabase/supabase-js';
import Swal from 'sweetalert2';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const RESEND_COOLDOWN = 60000;

const fetcher = async () => {
  const supabase = createClient();

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

  return {
    isDiscordConnected: !!discordIdentity,
    discordTag:
      discordIdentity?.identity_data?.global_name ||
      discordIdentity?.identity_data?.name ||
      null,
    discordAvatar: discordIdentity?.identity_data?.avatar_url || null,
    discordEmail: discordIdentity?.identity_data?.email || null,
  };
};

export function IntegrationsSettings() {
  const { data, error, mutate } = useSWR('discordConnection', fetcher);
  const [isLinking, setIsLinking] = useState(false);
  const [canDisconnect, setCanDisconnect] = useState(true);
  const [showEmailSetup, setShowEmailSetup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailSetupInitiated, setEmailSetupInitiated] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkEmailVerification = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (user) {
        const hasEmailIdentity = user.identities?.some(
          (identity) => identity.provider === 'email'
        );
        setCanDisconnect(hasEmailIdentity!);
        if (!hasEmailIdentity && user.email) {
          setEmail(user.email);
        }
      }
    };
    checkEmailVerification();

    // Check if email setup has been initiated
    const initiated = localStorage.getItem('emailSetupInitiated') === 'true';
    setEmailSetupInitiated(initiated);
  }, [supabase.auth]);

  const handleSetupEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLinking(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setShowEmailSetup(false);
      setEmailSetupInitiated(true);
      localStorage.setItem('emailSetupInitiated', 'true');
      await resendVerificationEmail();
      Swal.fire({
        title: 'Verification Email Sent',
        text: 'Please check your email and click the verification link to complete the setup.',
        icon: 'info',
        confirmButtonColor: '#3085d6',
      });
    } catch (error) {
      console.error('Error setting up email and password:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to set up email and password. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const resendVerificationEmail = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      Swal.fire({
        title: 'Email Sent',
        text: 'Verification email has been resent. Please check your inbox.',
        icon: 'success',
        confirmButtonColor: '#3085d6',
      });
    } catch (error) {
      console.error('Error resending verification email:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to resend verification email. Please try again later.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  useEffect(() => {
    const checkEmailVerification = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (user) {
        const hasEmailIdentity = user.identities?.some(
          (identity) => identity.provider === 'email'
        );
        setCanDisconnect(hasEmailIdentity!);
        if (!hasEmailIdentity && user.email) {
          setEmail(user.email);
        }
      }
    };
    checkEmailVerification();
  }, [supabase.auth]);

  useEffect(() => {
    const checkIdentities = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!error && user) {
        const hasEmailIdentity = user.identities?.some(
          (identity) => identity.provider === 'email'
        );
        setCanDisconnect(hasEmailIdentity!);
        if (!hasEmailIdentity && user.email) {
          setEmail(user.email);
        }
      }
    };
    checkIdentities();
  }, [supabase.auth]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('discord_auth') === 'success';

    if (authSuccess) {
      console.log('Discord auth success detected');
      Swal.fire({
        title: 'Success!',
        text: 'Discord account successfully linked!',
        icon: 'success',
        confirmButtonColor: '#3085d6',
      });
      mutate();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [mutate]);

  const handleDiscordConnect = async () => {
    console.log('Connecting Discord');
    setIsLinking(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${location.origin}/auth?discord_auth=pending`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        console.log('Redirecting to Discord auth URL:', data.url);
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error connecting Discord:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to connect Discord. Please try again.',
        icon: 'error',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setIsLinking(false);
    }
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
      mutate();
    }
  };

  if (error) {
    console.log('SWR error:', error);
    return <div>Failed to load</div>;
  }
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
              {canDisconnect ? (
                <Button
                  onClick={handleDiscordDisconnect}
                  className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors duration-300"
                >
                  <FaDiscord className="mr-2 h-4 w-4" />
                  Disconnect Discord Account
                </Button>
              ) : emailSetupInitiated ? (
                <Button
                  onClick={resendVerificationEmail}
                  className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors duration-300"
                >
                  Resend Verification Email
                </Button>
              ) : (
                <Button
                  onClick={() => setShowEmailSetup(true)}
                  className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors duration-300"
                >
                  Set Up Email and Password
                </Button>
              )}
              {!canDisconnect && (
                <p className="text-sm text-yellow-500">
                  To disconnect Discord, you need to verify your email address.
                </p>
              )}
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

      <Dialog open={showEmailSetup} onOpenChange={setShowEmailSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Up Email and Password</DialogTitle>
            <DialogDescription>
              Please set up an email and password to enable Discord
              disconnection.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSetupEmailPassword}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="col-span-3"
                  required
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLinking}>
                {isLinking ? 'Setting Up...' : 'Set Up Email and Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
