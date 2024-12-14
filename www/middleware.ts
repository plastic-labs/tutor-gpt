import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { verifyTurnstile } from './utils/turnstile';
import { ipAddress } from '@vercel/functions';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/captcha')) {
    return NextResponse.next();
  }
  const response = await updateSession(request);
  if (!request.nextUrl.pathname.startsWith('/captcha')) {
    const token = request.cookies.get('cf-turnstile-response');
    // console.log(token);
    // console.log(request.cookies.getAll());
    if (
      token === undefined ||
      !verifyTurnstile(token.value, ipAddress(request) as string)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/captcha';
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|api/webhook|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/auth/reset',
  ],
};
