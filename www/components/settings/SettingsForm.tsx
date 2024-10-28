'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Swal from 'sweetalert2';

interface SettingsFormProps {
  user: User | null | undefined;
  type: 'account' | 'security';
}

export function SettingsForm({ user, type }: SettingsFormProps) {
  const [email, setEmail] = useState<string>(user?.email || '');
  const [displayName, setDisplayName] = useState<string>(
    user?.user_metadata?.full_name || '',
  );
  const [avatarUrl, setAvatarUrl] = useState<string>(
    user?.user_metadata?.avatar_url || '',
  );
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const supabase = createClient();

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setDisplayName(user.user_metadata?.full_name || '');
      setAvatarUrl(user.user_metadata?.avatar_url || '');
    }
  }, [user]);

  const handleEmailChange = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.updateUser(
        { email: email },
        {
          emailRedirectTo: `${location.origin}/settings`,
        },
      );
      if (error) throw error;
      Swal.fire({
        title: 'Success!',
        text: 'Please check your new email for a confirmation link',
        icon: 'success',
        confirmButtonText: 'Close',
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: 'Error!',
        text: 'Something went wrong while updating your email',
        icon: 'error',
        confirmButtonText: 'Close',
      });
    }
  };

  const handleProfileUpdate = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName, avatar_url: avatarUrl },
      });
      if (error) throw error;
      Swal.fire({
        title: 'Success!',
        text: 'Your profile has been updated',
        icon: 'success',
        confirmButtonText: 'Close',
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: 'Error!',
        text: 'Something went wrong while updating your profile',
        icon: 'error',
        confirmButtonText: 'Close',
      });
    }
  };

  const handlePasswordChange = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      Swal.fire({
        title: 'Error!',
        text: 'Passwords do not match',
        icon: 'error',
        confirmButtonText: 'Close',
      });
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      Swal.fire({
        title: 'Success!',
        text: 'Your password has been updated',
        icon: 'success',
        confirmButtonText: 'Close',
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: 'Error!',
        text: 'Something went wrong while updating your password',
        icon: 'error',
        confirmButtonText: 'Close',
      });
    }
  };

  return (
    <Card className="bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-primary">
          {type === 'account' ? 'Account Information' : 'Security Settings'}
        </CardTitle>
        <CardDescription>
          {type === 'account'
            ? 'Update your account settings here.'
            : 'Manage your security settings and change your password.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {type === 'account' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-foreground">
                Display Name
              </Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-grow bg-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatarUrl" className="text-foreground">
                Avatar URL
              </Label>
              <Input
                id="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="flex-grow bg-input text-foreground"
              />
              <Button
                onClick={handleProfileUpdate}
                className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-neon-green dark:text-dark-green dark:hover:bg-neon-green/90"
              >
                Save
              </Button>
            </div>
          </>
        )}
        {type === 'security' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-foreground">
                Current Password
              </Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-foreground">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-input text-foreground"
              />
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-start border-t pt-6">
        {type === 'account' && (
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-grow bg-input text-foreground"
            />
          </div>
        )}
        <Button
          onClick={
            type === 'account' ? handleEmailChange : handlePasswordChange
          }
          className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-neon-green dark:text-dark-green dark:hover:bg-neon-green/90"
        >
          Save
        </Button>
      </CardFooter>
    </Card>
  );
}
