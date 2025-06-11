# 🛡️ Arcjet Bot Protection Implementation

## Overview

This implementation adds comprehensive bot protection to your Bloom application using Arcjet. The system blocks malicious bots, scrapers, and automated tools while allowing legitimate search engine crawlers and social media link previews.

## 🏗️ Architecture

### Files Added/Modified:

1. **`utils/arcjet.ts`** - Centralized Arcjet configuration
2. **`middleware.ts`** - Enhanced with bot protection (preserves existing Supabase integration)
3. **`scripts/setup-arcjet.js`** - Setup and configuration helper script
4. **`.env.local`** - Environment variables (created by setup script)

## 🚀 Quick Start

### 1. Install Dependencies
Already completed:
```bash
pnpm add @arcjet/next
```

### 2. Setup Environment
Run the setup script:
```bash
node scripts/setup-arcjet.js
```

### 3. Get Arcjet API Key
1. Sign up at [https://app.arcjet.com](https://app.arcjet.com)
2. Create a new site
3. Copy your API key
4. Replace `ajkey_your_arcjet_api_key_here` in `.env.local`

### 4. Start Development Server
```bash
pnpm dev
```

## 🔧 Configuration

### Allowed Traffic:
- ✅ Real browser requests
- ✅ Search engine crawlers (Google, Bing, Yahoo, DuckDuckGo, Baidu, Yandex)
- ✅ Social media crawlers (Facebook, Twitter, LinkedIn, etc.)
- ✅ Legitimate preview bots (Telegram, WhatsApp, Discord)

### Blocked Traffic:
- ❌ Scrapers and content harvesters
- ❌ Automated tools (curl, wget, etc.)
- ❌ Malicious bots
- ❌ Unauthorized crawlers
- ❌ Security scanners
- ❌ SEO analysis tools
- ❌ AI training bots

## 🧪 Testing

### Test Bot Blocking:
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

### Browser Testing:
- Regular browser requests should work normally
- No impact on user experience

## 📊 Monitoring

### Development Logs:
- ✅ Allowed requests: `🛡️ Arcjet: Request allowed`
- ❌ Blocked requests: `🛡️ Arcjet: Blocked bot request`

### Production Monitoring:
- Blocked bot attempts are logged with Sentry integration
- Request metadata includes: path, user agent, IP, reason
- View analytics in Arcjet dashboard

## ⚙️ Customization

### Adding New Search Engines:
Edit `utils/arcjet.ts` and add patterns to `SEARCH_ENGINE_PATTERNS`:
```typescript
const SEARCH_ENGINE_PATTERNS = [
  // ... existing patterns ...
  /newcrawlerbot/i,
];
```

### Adjusting Block Sensitivity:
Modify the `detectBot` configuration in `utils/arcjet.ts`:
```typescript
detectBot({
  mode: "LIVE", // or "DRY_RUN" for testing
  allow: [], // Add specific user agents to allow
  deny: [], // Add specific user agents to block
})
```

## 🔒 Security Features

### Fail-Safe Design:
- If Arcjet service is unavailable, requests are allowed through ("fail open")
- No impact on application availability
- Graceful error handling

### Performance:
- Bot detection runs before other middleware
- Minimal latency impact
- Efficient pattern matching

### Privacy:
- No user data collected for legitimate requests
- Only bot attempts are logged
- Compliant with privacy regulations

## 🚨 Troubleshooting

### Common Issues:

1. **"Cannot find module @/utils/arcjet"**
   - Ensure `utils/arcjet.ts` exists
   - Check TypeScript path mapping in `tsconfig.json`

2. **All requests blocked**
   - Check `ARCJET_KEY` in `.env.local`
   - Verify API key is correct
   - Check Arcjet dashboard for configuration

3. **Search engines blocked**
   - Review user agent patterns in `SEARCH_ENGINE_PATTERNS`
   - Check Arcjet logs for detection reasons

4. **Type errors**
   - Ensure `@arcjet/next` is installed
   - Check Next.js version compatibility

### Debug Mode:
Set environment for detailed logging:
```bash
NODE_ENV=development pnpm dev
```

## 📈 Analytics

### Arcjet Dashboard:
- Real-time bot detection metrics
- Geographic distribution of blocked requests
- Top blocked user agents
- Performance impact analysis

### Custom Metrics:
Add custom logging in `utils/arcjet.ts`:
```typescript
// Track bot protection events
logBotProtectionEvent(request, decision, action, reason);
```

## 🔄 Updates

### Keeping Current:
```bash
# Update Arcjet
pnpm update @arcjet/next

# Check for new bot patterns
# Review Arcjet documentation for updates
```

## 📞 Support

- **Arcjet Documentation**: [https://docs.arcjet.com](https://docs.arcjet.com)
- **Arcjet Support**: Available through dashboard
- **Configuration Help**: Check `scripts/setup-arcjet.js` output

---

## 🎯 Implementation Status

- ✅ **Phase 1**: Arcjet package installation
- ✅ **Phase 2**: Environment configuration  
- ✅ **Phase 3**: Core bot protection implementation
- ✅ **Phase 4**: Monitoring and logging integration
- ✅ **Phase 5**: Documentation and testing guide

Your Bloom application now has enterprise-grade bot protection! 🚀 