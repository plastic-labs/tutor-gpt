import { getProducts, getSubscription } from '@/utils/supabase/queries'
import { createClient } from '@/utils/supabase/server'
import SettingsLayout from './SettingsLayout'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const subscription = await getSubscription(supabase)
  const products = await getProducts(supabase)

  return (
    <div className={`min-h-screen`}>
      <SettingsLayout
        user={user}
        subscription={subscription}
        products={products}
      />
    </div>
  )
}
