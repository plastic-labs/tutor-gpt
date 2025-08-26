import type { User } from '@supabase/supabase-js'
import { SettingsForm } from './SettingsForm'

interface SecuritySettingsProps {
  user: User | null
}

export function SecuritySettings({ user }: SecuritySettingsProps) {
  if (!user) return <div>Please log in to view security settings.</div>
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-3xl text-primary">Security Settings</h2>
      <SettingsForm user={user} type="security" />
    </div>
  )
}
