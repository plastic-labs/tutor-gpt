import { SettingsForm } from "./SettingsForm";

interface User {
  id: string;
  email: string;
  // Add other user properties as needed
}

export function SecuritySettings({ user }: { user: User }) {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold text-primary">Security Settings</h2>
      <SettingsForm user={user} type="security" />
    </div>
  );
}
