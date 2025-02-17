import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      let redirectUrl;

      if (isLocalEnv) {
        redirectUrl = `${origin}${next}`;
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${next}`;
      } else {
        redirectUrl = `${origin}${next}`;
      }

      return NextResponse.redirect(`${redirectUrl}?auth=success`);
    } else {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(
        `${origin}/auth?error=Authentication failed: ${error.message}`
      );
    }
  }

  // If no code is present in the URL
  return NextResponse.redirect(
    `${origin}/auth?error=No authentication code provided`
  );
}
