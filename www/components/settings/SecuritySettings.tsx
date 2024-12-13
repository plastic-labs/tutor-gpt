import { User } from '@supabase/supabase-js';
import { SettingsForm } from './SettingsForm';

interface SecuritySettingsProps {
  user: User | null;
}

export function SecuritySettings({ user }: SecuritySettingsProps) {
  if (!user) return <div>Please log in to view security settings.</div>;
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold text-primary">Security Settings</h2>
      <SettingsForm user={user} type="security" />
    </div>
  );
}
