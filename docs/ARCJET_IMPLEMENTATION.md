# 🛡️ Arcjet Bot Protection & Rate Limiting Implementation

## 🚀 Quick Summary

**What was implemented:**
- ✅ **Global Bot Protection**: Blocks malicious bots on all routes while allowing search engines
- ✅ **Chat Rate Limiting**: 8 requests/minute limit on `/api/chat` endpoint  
- ✅ **User-Friendly Errors**: Clear error messages when rate limit is exceeded
- ✅ **Search Engine Bypass**: Google, Bing, etc. crawlers work normally
- ✅ **Fail-Safe Design**: If Arcjet is down, requests are allowed through

**Files modified:**
- `utils/arcjet.ts` - Main configuration with rate limiting functions
- `app/api/chat/route.ts` - Chat endpoint with rate limiting
- `middleware.ts` - Global bot protection (preserves existing Supabase middleware)

**Environment setup:**
```bash
# Add to .env.local
ARCJET_KEY=your_arcjet_api_key_here
```

---

## Overview

This implementation adds comprehensive protection to your Bloom application using Arcjet:
- **Global Bot Protection**: Blocks malicious bots while allowing search engine crawlers
- **Chat Rate Limiting**: Limits chat API to 8 requests per minute per IP
- **User-Friendly Error Handling**: Clear error messages for rate limit exceeded

## 🏗️ Architecture

### Files Added/Modified:

1. **`utils/arcjet.ts`** - Centralized Arcjet configuration with bot protection and rate limiting
2. **`middleware.ts`** - Enhanced with global bot protection (preserves existing Supabase integration)
3. **`app/api/chat/route.ts`** - Chat endpoint with rate limiting (8 requests/minute)
4. **`docs/ARCJET_IMPLEMENTATION.md`** - This documentation

### Protection Layers:

1. **Global Middleware Layer** (`middleware.ts`)
   - Bot protection on all routes
   - Preserves Supabase session management
   - Search engine crawler allowlist

2. **Chat Endpoint Layer** (`app/api/chat/route.ts`)
   - Endpoint-specific rate limiting (8 requests/minute)
   - Bot protection (inheritance from global config)
   - User-friendly error messages
   - Rate limit headers in responses

## 🚀 Quick Start

### 1. Install Dependencies
Already completed:
```bash
pnpm add @arcjet/next
```

### 2. Environment Setup
Add your Arcjet API key to `.env.local`:
```bash
ARCJET_KEY=your_arcjet_api_key_here
```

### 3. Get Arcjet API Key
1. Sign up at [https://app.arcjet.com](https://app.arcjet.com)
2. Create a new site
3. Copy your API key
4. Replace the value in `.env.local`

### 4. Start Development Server
```bash
pnpm dev
```

## 🔧 Configuration

### Global Bot Protection:

#### Allowed Traffic:
- ✅ Real browser requests
- ✅ Search engine crawlers (Google, Bing, Yahoo, DuckDuckGo, Baidu, Yandex)
- ✅ Social media crawlers (Facebook, Twitter, LinkedIn, etc.)
- ✅ Legitimate preview bots (Telegram, WhatsApp, Discord)

#### Blocked Traffic:
- ❌ Scrapers and content harvesters
- ❌ Automated tools (curl, wget, etc.)
- ❌ Malicious bots
- ❌ Unauthorized crawlers
- ❌ Security scanners
- ❌ SEO analysis tools
- ❌ AI training bots

### Chat Rate Limiting:

#### Rate Limit Rules:
- **Limit**: 8 requests per minute per IP address
- **Window**: Fixed 1-minute window
- **Scope**: Only `/api/chat` endpoint
- **Bypass**: Search engine crawlers bypass rate limits

#### Response Headers:
```
X-RateLimit-Remaining: 7  # Requests remaining in current window
X-RateLimit-Reset: 45     # Seconds until window resets
```

## 🧪 Testing

### Test Global Bot Blocking:
```bash
# This should be BLOCKED (403 Forbidden)
curl -v http://localhost:3000

# This should be BLOCKED
curl -H "User-Agent: MyBot/1.0" http://localhost:3000
```

### Test Allowed Crawlers:
```bash
# These should be ALLOWED
curl -H "User-Agent: Googlebot/2.1" http://localhost:3000
curl -H "User-Agent: bingbot/2.0" http://localhost:3000
curl -H "User-Agent: facebookexternalhit/1.1" http://localhost:3000
```

### Test Chat Rate Limiting:
```bash
# Make multiple requests to test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/chat \
    -H "Content-Type: multipart/form-data" \
    -F "message=test message $i" \
    -F "conversationId=test-123" \
    -w "Status: %{http_code}\n"
done
```

Expected results:
- First 8 requests: `Status: 200` (or streaming response)
- Subsequent requests: `Status: 429` with rate limit error

### Browser Testing:
- Regular browser requests should work normally
- Chat functionality works with 8 requests/minute limit
- User sees friendly error message if rate limit exceeded

## 📊 Monitoring

### Development Logs:

#### Global Bot Protection:
- ✅ Allowed requests: `🛡️ Arcjet Bot Protection: { "action": "ALLOWED" }`
- ❌ Blocked requests: `🛡️ Arcjet Bot Protection: { "action": "BLOCKED" }`

#### Chat Rate Limiting:
- ✅ Allowed requests: `💬 Chat Rate Limit Check: { "decision": "ALLOW" }`
- ❌ Rate limited: `💬 Chat Rate Limit Check: { "decision": "DENY" }`

### Production Monitoring:
- Blocked bot attempts logged with Sentry integration
- Rate limit exceeded events tracked
- Request metadata includes: path, user agent, IP, reason, remaining requests
- View analytics in Arcjet dashboard

## ⚙️ Customization

### Adjusting Chat Rate Limit:
Edit `utils/arcjet.ts` in the `chatRateLimitClient` configuration:
```typescript
fixedWindow({
  mode: 'LIVE',
  window: '1m',    // Change window (1m, 5m, 1h, etc.)
  max: 8,          // Change request limit
})
```

### Adding Rate Limiting to Other Endpoints:
1. Import `checkChatRateLimit` or create a new rate limit function
2. Add rate limiting check at the beginning of your route handler
3. Return 429 status with user-friendly error messages

Example for `/api/search` endpoint:
```typescript
import { checkChatRateLimit } from '@/utils/arcjet';

export async function POST(req: NextRequest) {
  // Check rate limiting
  const rateLimitResult = await checkChatRateLimit(req);
  
  if (!rateLimitResult.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: rateLimitResult.reason,
      }),
      { status: 429 }
    );
  }
  
  // Your existing logic...
}
```

### Adding New Search Engines:
Edit `utils/arcjet.ts` and add patterns to `SEARCH_ENGINE_PATTERNS`:
```typescript
const SEARCH_ENGINE_PATTERNS = [
  // ... existing patterns ...
  /newcrawlerbot/i,
];
```

## 🔒 Security Features

### Fail-Safe Design:
- If Arcjet service is unavailable, requests are allowed through ("fail open")
- No impact on application availability
- Graceful error handling for both bot protection and rate limiting

### Performance:
- Bot detection runs before other middleware
- Rate limiting checks are fast (usually <20ms)
- Minimal latency impact
- Efficient pattern matching

### Privacy:
- No user data collected for legitimate requests
- Only bot attempts and rate limit violations are logged
- Compliant with privacy regulations

### Chat Endpoint Protection:
- Prevents abuse of AI/chat functionality
- Protects against resource exhaustion
- Maintains good user experience for legitimate users

## 🚨 Troubleshooting

### Common Issues:

1. **"Cannot find module @/utils/arcjet"**
   - Ensure `utils/arcjet.ts` exists
   - Check TypeScript path mapping in `tsconfig.json`

2. **All requests blocked**
   - Check `ARCJET_KEY` in `.env.local`
   - Verify API key is correct
   - Check Arcjet dashboard for configuration

3. **Chat rate limiting not working**
   - Verify `checkChatRateLimit` is imported correctly
   - Check console logs for rate limit decisions
   - Ensure requests are coming from same IP for testing

4. **Search engines blocked**
   - Review user agent patterns in `SEARCH_ENGINE_PATTERNS`
   - Check Arcjet logs for detection reasons

5. **Rate limit too strict/lenient**
   - Adjust `max` and `window` values in `chatRateLimitClient`
   - Consider user behavior patterns for your application

### Debug Mode:
Set environment for detailed logging:
```bash
NODE_ENV=development pnpm dev
```

### Testing Rate Limits Locally:
When testing locally, all requests appear to come from the same IP. Use different browsers or incognito mode, or test with tools like Postman to simulate different clients.

## 📈 Analytics

### Arcjet Dashboard:
- Real-time bot detection metrics
- Rate limiting statistics per endpoint
- Geographic distribution of blocked requests
- Top blocked user agents
- Performance impact analysis

### Custom Metrics Available:
- Bot protection events (global)
- Chat rate limiting events (endpoint-specific)
- Error rates and reasons
- Request patterns and timing

## 🔄 Updates

### Keeping Current:
```bash
# Update Arcjet
pnpm update @arcjet/next

# Check for new bot patterns and rate limiting features
# Review Arcjet documentation for updates
```

### Rate Limit Adjustments:
Monitor your usage patterns and adjust rate limits as needed:
- Higher limits for authenticated users
- Different limits for different endpoints
- Time-based adjustments (higher limits during business hours)

## 📞 Support

- **Arcjet Documentation**: [https://docs.arcjet.com](https://docs.arcjet.com)
- **Rate Limiting Guide**: [https://docs.arcjet.com/rate-limiting](https://docs.arcjet.com/rate-limiting)
- **Arcjet Support**: Available through dashboard
- **Configuration Help**: Review this documentation and console logs

---

## 🎯 Implementation Status

- ✅ **Phase 1**: Arcjet package installation
- ✅ **Phase 2**: Environment configuration  
- ✅ **Phase 3**: Global bot protection implementation
- ✅ **Phase 4**: Monitoring and logging integration
- ✅ **Phase 5**: Chat endpoint rate limiting (8 requests/minute)
- ✅ **Phase 6**: User-friendly error handling
- ✅ **Phase 7**: Documentation and testing guide

Your Bloom application now has enterprise-grade bot protection AND intelligent rate limiting! 🚀

### Current Protection:
- **Global**: Bot protection on all routes
- **Chat API**: 8 requests/minute rate limiting + bot protection  
- **Error Handling**: User-friendly messages for rate limit exceeded
- **Monitoring**: Comprehensive logging and analytics
- **Performance**: Minimal latency impact (<20ms typical) 