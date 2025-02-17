import { SettingsForm } from '@/components/settings/SettingsForm';
import { User } from '@supabase/supabase-js';

interface AccountSettingsProps {
  user: User | null;
}

export function AccountSettings({ user }: AccountSettingsProps) {
  if (!user) return <div>Please log in to view account settings.</div>;
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold text-primary">Account Settings</h2>
      <SettingsForm user={user} type="account" />
    </div>
  );
}
