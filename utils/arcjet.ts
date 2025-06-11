import arcjet, {
    detectBot,
    fixedWindow,
    shield
} from '@arcjet/next';
import { captureException } from '@sentry/nextjs';

// Search engine user agents that should always be allowed
const SEARCH_ENGINE_PATTERNS = [
    // Google
    /googlebot/i,
    /google/i,
    /bingbot/i,
    /msnbot/i,
    // Yahoo
    /slurp/i,
    /yahoo/i,
    // DuckDuckGo
    /duckduckbot/i,
    /duckduckgo/i,
    // Baidu
    /baiduspider/i,
    /baidu/i,
    // Yandex
    /yandexbot/i,
    /yandex/i,
    // Other legitimate search engines
    /facebookexternalhit/i, // Facebook crawler for link previews
    /twitterbot/i,          // Twitter crawler for link previews
    /linkedinbot/i,         // LinkedIn crawler
    /telegrambot/i,         // Telegram crawler
    /whatsapp/i,            // WhatsApp crawler
    /discordbot/i,          // Discord crawler
    /applebot/i,            // Apple crawler
];

/**
 * Check if a user agent is from a legitimate search engine crawler
 */
function isSearchEngineCrawler(userAgent: string | null): boolean {
    if (!userAgent) return false;
    return SEARCH_ENGINE_PATTERNS.some(pattern => pattern.test(userAgent));
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
    key: process.env.ARCJET_KEY!,
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
    key: process.env.ARCJET_KEY!,
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
    key: process.env.ARCJET_KEY!,
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
        const userAgent = request.headers.get('user-agent');
        if (isSearchEngineCrawler(userAgent)) {
            logBotProtectionEvent(request, { conclusion: 'ALLOW' }, 'ALLOWED', 'Search engine crawler detected');
            return { allowed: true, reason: 'Search engine crawler' };
        }

        // Run Arcjet bot detection
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
        // Check if it's a search engine crawler first (they bypass rate limits)
        const userAgent = request.headers.get('user-agent');
        if (isSearchEngineCrawler(userAgent)) {
            return {
                allowed: true,
                reason: 'Search engine crawler - rate limit bypassed'
            };
        }

        // Run Arcjet protection (bot detection + rate limiting)
        const decision = await chatRateLimitClient.protect(request);

        // Extract rate limiting information from decision
        const rateLimitResult = decision.results.find(result =>
            result.reason.isRateLimit?.()
        );

        let remaining: number | undefined;
        let resetTime: number | undefined;

        if (rateLimitResult && rateLimitResult.reason.isRateLimit?.()) {
            const reason = rateLimitResult.reason as any;
            remaining = reason.remaining;
            resetTime = reason.reset;
        }

        // Log the decision
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
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
            const isRateLimit = decision.reason.isRateLimit?.();
            const isBot = decision.reason.isBot?.();

            let reason = 'Request denied';
            if (isRateLimit) {
                reason = 'Rate limit exceeded - you can make 8 requests per minute';
            } else if (isBot) {
                reason = 'Bot detected';
            }

            return {
                allowed: false,
                reason,
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
export function testUserAgent(userAgent: string): {
    isSearchEngine: boolean;
    wouldBlock: boolean;
    matchedPatterns: string[];
} {
    const isSearchEngine = isSearchEngineCrawler(userAgent);
    const matchedPatterns: string[] = [];

    // Check against search engine patterns
    SEARCH_ENGINE_PATTERNS.forEach((pattern, index) => {
        if (pattern.test(userAgent)) {
            matchedPatterns.push(pattern.source);
        }
    });

    return {
        isSearchEngine,
        wouldBlock: !isSearchEngine,
        matchedPatterns
    };
} 