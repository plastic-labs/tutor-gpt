import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const supabase = createClient();
  const user = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No user found');
  }

  const session = await supabase.auth.getSession();

  if (!session.data.session?.access_token) {
    throw new Error('No session found');
  }

  const authToken = session.data.session?.access_token;

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${authToken}`,
    },
  });
}
