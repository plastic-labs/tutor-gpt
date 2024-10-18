'use client';

import { useState, useEffect } from 'react';
import { FaDiscord } from 'react-icons/fa';
import { createClient } from '@/utils/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface User {
  id: string;
  email: string;
}

interface IntegrationsSettingsProps {
  user: User;
}

export function IntegrationsSettings({ user }: IntegrationsSettingsProps) {
  const [isDiscordConnected, setIsDiscordConnected] = useState(false);
  const [discordTag, setDiscordTag] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    checkDiscordConnection();
  }, [user.id]);

  const checkDiscordConnection = async () => {
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (supabaseUser?.app_metadata?.provider === 'discord') {
      setIsDiscordConnected(true);
      setDiscordTag(supabaseUser.user_metadata?.full_name || null);
    } else {
      setIsDiscordConnected(false);
      setDiscordTag(null);
    }
  };

  const handleDiscordConnect = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${location.origin}/settings?tab=integrations`,
        scopes: 'identify email',
      },
    });

    if (error) {
      console.error('Error connecting Discord:', error);
    }
  };

  const handleDiscordDisconnect = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error disconnecting Discord:', error);
    } else {
      setIsDiscordConnected(false);
      setDiscordTag(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold text-primary">Integrations</h2>
      <Card>
        <CardHeader>
          <CardTitle>Discord Integration</CardTitle>
          <CardDescription>Connect your Discord account</CardDescription>
        </CardHeader>
        <CardContent>
          {isDiscordConnected ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Connected as:{' '}
                <span className="font-semibold">{discordTag}</span>
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
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-[#5865F2] hover:bg-[#4752C4] rounded-md transition-colors duration-300"
            >
              <FaDiscord className="mr-2 h-4 w-4" />
              Connect Discord Account
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
