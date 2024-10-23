import { SettingsForm } from '@/components/settings/SettingsForm';

interface User {
  id: string;
  email: string;
}

export function AccountSettings({ user }: { user: User }) {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold text-primary">Account Settings</h2>
      <SettingsForm user={user} type="account" />
    </div>
  );
}
