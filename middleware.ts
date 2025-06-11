import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { checkBotProtection, checkChatWAF } from "@/utils/arcjet";

export async function middleware(request: NextRequest) {
  // First, run Arcjet bot protection
  try {
    const botProtectionResult = await checkBotProtection(request);

    if (!botProtectionResult.allowed) {
      // Log the blocked request for monitoring
      console.warn('🛡️ Arcjet: Blocked bot request', {
        path: request.nextUrl.pathname,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        reason: botProtectionResult.reason
      });

      // Return a 403 Forbidden response for blocked bots
      return NextResponse.json(
        {
          error: 'Access denied',
          message: 'Automated requests are not permitted'
        },
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          }
        }
      );
    }

    // Log allowed requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🛡️ Arcjet: Request allowed', {
        path: request.nextUrl.pathname,
        reason: botProtectionResult.reason
      });
    }
  } catch (error) {
    // Fail open - if Arcjet fails, continue with the request
    console.error('🛡️ Arcjet: Error in bot protection, failing open:', error);
  }

  // Check if this is a chat endpoint request
  const isChatEndpoint = request.nextUrl.pathname.startsWith('/api/chat');

  // Apply WAF protection to chat endpoints
  if (isChatEndpoint) {
    try {
      const wafResult = await checkChatWAF(request);

      if (!wafResult.allowed) {
        console.warn('🛡️ Arcjet WAF: Blocked suspicious request', {
          path: request.nextUrl.pathname,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          reason: wafResult.reason
        });

        // Return a 403 Forbidden response for WAF violations
        return NextResponse.json(
          {
            error: 'Request blocked',
            message: 'Your request appears to be malicious and has been blocked for security reasons'
          },
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            }
          }
        );
      }

      // Log allowed WAF requests in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🛡️ Arcjet WAF: Request allowed', {
          path: request.nextUrl.pathname,
          reason: wafResult.reason
        });
      }
    } catch (error) {
      // Fail open - if WAF fails, continue with the request
      console.error('🛡️ Arcjet WAF: Error in WAF protection, failing open:', error);
    }
  }

  // Continue with existing Supabase session management
  const response = await updateSession(request);
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
    "/((?!_next/static|_next/image|api/webhook|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/auth/reset",
  ],
};
