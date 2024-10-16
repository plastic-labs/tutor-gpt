"use client";

import { useState, useEffect } from "react";
import { FaDiscord } from "react-icons/fa";
import { createClient } from "@/utils/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  email: string;
  // Add other user properties as needed
}

interface IntegrationsSettingsProps {
  user: User;
}

export function IntegrationsSettings({ user }: IntegrationsSettingsProps) {
  const [isDiscordConnected, setIsDiscordConnected] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Check if Discord is connected
    // This is a placeholder - you'll need to implement the actual check
    const checkDiscordConnection = async () => {
      // Example: const { data, error } = await supabase.from('profiles').select('discord_connected').eq('id', user.id).single();
      // setIsDiscordConnected(data?.discord_connected || false);
    };

    checkDiscordConnection();
  }, [user.id]);

  const handleDiscordConnect = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${location.origin}/settings?tab=integrations`,
      },
    });

    if (error) {
      console.error("Error connecting Discord:", error);
      // You might want to show an error message to the user here
    }
  };

  const handleDiscordDisconnect = async () => {
    // Implement disconnect logic here
    // This might involve removing the Discord token from your database
    // and updating the UI state
    console.log("Disconnecting Discord");
    // setIsDiscordConnected(false);
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
            <Button
              onClick={handleDiscordDisconnect}
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors duration-300"
            >
              <FaDiscord className="mr-2 h-4 w-4" />
              Disconnect Discord Account
            </Button>
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
