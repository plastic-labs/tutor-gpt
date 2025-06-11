import arcjet, {
    detectBot,
    fixedWindow,
    shield
} from '@arcjet/next';
import { captureException } from '@sentry/nextjs';

// Validate ARCJET_KEY is available at module load time
const ARCJET_KEY = process.env.ARCJET_KEY;
if (!ARCJET_KEY) {
    throw new Error(
        'ARCJET_KEY environment variable is required. Please add it to your .env.local file.\n' +
        'Get Bloom Key from p1password or create your own for testing: https://app.arcjet.com/auth/signin'
    );
}



/**
 * Log bot protection events for monitoring and analysis
 */
function logBotProtectionEvent(
    request: Request,
    decision: any,
    action: 'ALLOWED' | 'BLOCKED',
    reason: string
): void {
    const userAgent = request.headers.get('user-agent');
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    console.info('🛡️ Arcjet Bot Protection:', {
        action,
        reason,
        userAgent,
        ip,
        path: new URL(request.url).pathname,
        decision: decision.conclusion,
        timestamp: new Date().toISOString()
    });
}

/**
 * Main Arcjet client for global bot protection
 */
const aj = arcjet({
    key: ARCJET_KEY,
    rules: [
        detectBot({
            mode: 'LIVE',
            // Allow search engines but block all other bots
            allow: [
                'CATEGORY:SEARCH_ENGINE'
            ]
        })
    ]
});

/**
 * Arcjet client specifically for chat endpoint rate limiting
 */
const chatRateLimitClient = arcjet({
    key: ARCJET_KEY,
    characteristics: ['ip.src'], // Track by IP address
    rules: [
        // Allow search engines but block other bots
        detectBot({
            mode: 'LIVE',
            allow: [
                'CATEGORY:SEARCH_ENGINE'
            ]
        }),
        // Rate limit: 8 requests per minute
        fixedWindow({
            mode: 'LIVE',
            window: '1m',
            max: 8,
        })
    ]
});

/**
 * Arcjet client for WAF protection on chat endpoints
 */
const chatWAFClient = arcjet({
    key: ARCJET_KEY,
    rules: [
        // Shield WAF protection
        shield({
            mode: 'LIVE'
        })
    ]
});

/**
 * Check bot protection for global middleware use
 */
export async function checkBotProtection(request: Request): Promise<{
    allowed: boolean;
    reason?: string;
}> {
    try {
        // Run Arcjet bot detection (includes built-in search engine allowlist)
        const decision = await aj.protect(request);

        // Log result
        const action = decision.conclusion === 'ALLOW' ? 'ALLOWED' : 'BLOCKED';
        const reason = decision.reason?.toString() || 'Arcjet bot detection';

        logBotProtectionEvent(request, decision, action, reason);

        if (decision.isDenied()) {
            return {
                allowed: false,
                reason: `Bot detected: ${reason}`
            };
        }

        return { allowed: true };
    } catch (error) {
        // Log error but fail open for security
        console.error('🚨 Arcjet bot protection error:', error);
        captureException(error);

        return {
            allowed: true,
            reason: 'Bot protection service unavailable - failing open'
        };
    }
}

/**
 * Check rate limiting specifically for chat endpoints
 */
export async function checkChatRateLimit(request: Request): Promise<{
    allowed: boolean;
    reason?: string;
    remaining?: number;
    resetTime?: number;
}> {
    try {
        // Run Arcjet protection (bot detection + rate limiting)
        // Search engines are automatically allowed via CATEGORY:SEARCH_ENGINE
        const decision = await chatRateLimitClient.protect(request);

        // Extract rate limiting information from decision
        const rateLimitResult = decision.results.find(
            r => r.reason?.isRateLimit?.()
        );

        let remaining: number | undefined;
        let resetTime: number | undefined;

        if (rateLimitResult?.reason?.isRateLimit?.()) {
            const rl = rateLimitResult.reason as any;
            remaining = rl.remaining;
            resetTime = rl.reset;
        }

        // Log the decision
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const userAgent = request.headers.get('user-agent');
        console.info('💬 Chat Rate Limit Check:', {
            ip,
            userAgent,
            decision: decision.conclusion,
            remaining,
            resetTime,
            timestamp: new Date().toISOString()
        });

        if (decision.isDenied()) {
            // Check if it was denied due to rate limiting or bot detection
            const isRateLimit = decision.reason?.isRateLimit?.() ?? false;
            const isBot = decision.reason?.isBot?.() ?? false;

            let denialReason = 'Request denied';
            if (isRateLimit) {
                denialReason = 'Rate limit exceeded - you can make 8 requests per minute';
            } else if (isBot) {
                denialReason = 'Bot detected';
            }

            return {
                allowed: false,
                reason: denialReason,
                remaining,
                resetTime
            };
        }

        return {
            allowed: true,
            remaining,
            resetTime
        };
    } catch (error) {
        // Log error but fail open for security
        console.error('🚨 Chat rate limit error:', error);
        captureException(error);

        return {
            allowed: true,
            reason: 'Rate limiting service unavailable - failing open'
        };
    }
}

/**
 * Check WAF protection specifically for chat endpoints
 */
export async function checkChatWAF(request: Request): Promise<{
    allowed: boolean;
    reason?: string;
}> {
    try {
        // Run Arcjet Shield WAF protection
        const decision = await chatWAFClient.protect(request);

        // Log the decision
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const userAgent = request.headers.get('user-agent');

        console.info('🛡️ Chat WAF Check:', {
            ip,
            userAgent,
            path: new URL(request.url).pathname,
            decision: decision.conclusion,
            reason: decision.reason?.toString(),
            timestamp: new Date().toISOString()
        });

        if (decision.isDenied()) {
            return {
                allowed: false,
                reason: `WAF protection triggered: ${decision.reason?.toString() || 'Suspicious request detected'}`
            };
        }

        return { allowed: true };
    } catch (error) {
        // Log error but fail open for security
        console.error('🚨 Arcjet WAF protection error:', error);
        captureException(error);

        return {
            allowed: true,
            reason: 'WAF protection service unavailable - failing open'
        };
    }
}

// Development helper to test different user agents
// Note: This now relies exclusively on Arcjet's built-in CATEGORY:SEARCH_ENGINE detection
export function testUserAgent(userAgent: string): {
    userAgent: string;
    note: string;
} {
    return {
        userAgent,
        note: 'Search engine detection now handled exclusively by Arcjet CATEGORY:SEARCH_ENGINE. Use Arcjet dashboard for testing and monitoring.'
    };
} 