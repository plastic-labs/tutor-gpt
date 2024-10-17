import { Suspense } from "react";
import SettingsLayout from "./SettingsLayout";
import { createClient } from "@/utils/supabase/server";
import { getSubscription, getProducts } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const subscription = await getSubscription(supabase);
  const products = await getProducts(supabase);

  if (!user) {
    redirect("/auth");
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsLayout
        user={user}
        subscription={subscription}
        products={products}
      />
    </Suspense>
  );
}
