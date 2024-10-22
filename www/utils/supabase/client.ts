import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function fetchWithAuth(url: string) {
  const supabase = createClient();
  const user = await supabase.auth.getUser();
  if (!user) {
    return;
  }
  console.log(user);

  const session = await supabase.auth.getSession();

  if (!session) {
    return;
  }

  const authToken = session.data.session?.access_token;

  console.log(authToken);
  fetch(url, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${authToken}`,
    },
  })
    .then((res) => res.json())
    .then((data) => console.log(data))
    .catch((err) => console.log(err));
}
