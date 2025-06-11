import arcjet, {
    detectBot
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
    /applebot/i,            // Apple Spotlight
    /petalbot/i,            // Huawei search
    /sogou/i,               // Sogou search
    /bingpreview/i,         // Bing link preview
];

// Check if a user agent represents a legitimate search engine crawler
function isSearchEngineCrawler(userAgent: string): boolean {
    if (!userAgent) return false;

    return SEARCH_ENGINE_PATTERNS.some(pattern =>
        pattern.test(userAgent)
    );
}

// Create the main Arcjet instance
export const aj = arcjet({
    key: process.env.ARCJET_KEY!,
    characteristics: ['ip.src'],
    rules: [
        detectBot({
            mode: process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN',
            // Block all bots except search engine crawlers
            allow: [
                'CATEGORY:SEARCH_ENGINE', // Google, Bing, etc
                // Additional legitimate bot categories (uncomment as needed)
                // 'CATEGORY:MONITOR',    // Uptime monitoring services
                // 'CATEGORY:PREVIEW',    // Link previews e.g. Slack, Discord
            ]
        })
    ]
});

// Enhanced logging function for bot protection events
export function logBotProtectionEvent(
    request: any,
    decision: any,
    action: 'ALLOWED' | 'BLOCKED',
    reason: string
) {
    const userAgent = request.headers?.get?.('user-agent') ||
        request.headers?.['user-agent'] ||
        'unknown';

    const logData = {
        timestamp: new Date().toISOString(),
        action,
        reason,
        ip: request.ip || 'unknown',
        userAgent,
        path: request.url || request.nextUrl?.pathname || 'unknown',
        method: request.method || 'unknown',
        isSearchEngine: isSearchEngineCrawler(userAgent),
        arcjetResult: {
            id: decision.id,
            conclusion: decision.conclusion,
            reason: decision.reason,
            ttl: decision.ttl
        }
    };

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
        console.log('🛡️ Arcjet Bot Protection:', JSON.stringify(logData, null, 2));
    }

    // Log to Sentry for production monitoring
    if (action === 'BLOCKED') {
        captureException(new Error('Bot Protection: Request Blocked'), {
            tags: {
                component: 'arcjet',
                action: 'bot_blocked'
            },
            extra: logData
        });
    }

    // You could also send to your analytics service here
    // analytics.track('bot_protection_event', logData);
}

// Main function to check bot protection with enhanced logic
export async function checkBotProtection(request: any) {
    const userAgent = request.headers?.get?.('user-agent') ||
        request.headers?.['user-agent'] ||
        '';

    // First, check if this is a legitimate search engine crawler
    if (isSearchEngineCrawler(userAgent)) {
        logBotProtectionEvent(request, {
            id: 'search-engine-allow',
            conclusion: 'ALLOW',
            reason: 'Search engine crawler detected',
            ttl: 0
        }, 'ALLOWED', 'Search engine crawler');

        return {
            allowed: true,
            reason: 'Search engine crawler',
            conclusion: 'ALLOW' as const
        };
    }

    // Run Arcjet bot detection
    const decision = await aj.protect(request);

    // Log the result
    const action = decision.conclusion === 'ALLOW' ? 'ALLOWED' : 'BLOCKED';
    const reason = decision.reason?.toString() || 'Arcjet bot detection';

    logBotProtectionEvent(request, decision, action, reason);

    return {
        allowed: decision.conclusion === 'ALLOW',
        reason: decision.reason || 'Bot detected',
        conclusion: decision.conclusion,
        decision
    };
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