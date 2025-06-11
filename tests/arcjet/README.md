# 🛡️ Arcjet Security Implementation & Testing

Complete Arcjet security setup with bot protection, WAF, and rate limiting for your Next.js application.

TO DO: Testing via the ArcJet Dashboard via Team Access: https://app.arcjet.com/auth/signin 

## 🚀 Quick Start

```bash
# Run security tests
pnpm test:security

# Test manually
curl -v http://localhost:3000/api/chat  # Should be blocked (403)
```

## 📁 Files

- **`test-bot-protection.js`** - Automated bot protection tests

## 🛡️ Security Features Implemented

### ✅ Bot Protection (Global)
- **Location:** `middleware.ts` + `utils/arcjet.ts`
- **Blocks:** curl, wget, scrapers, automated tools
- **Allows:** Search engines (Google, Bing), social crawlers, real browsers

### ✅ WAF Protection (Chat Endpoints)
- **Location:** `middleware.ts` (chat paths only)
- **Protects:** `/api/chat` and `/api/chat/name`
- **Blocks:** XSS, SQL injection, command injection

### ✅ Rate Limiting (Chat API)
- **Location:** `app/api/chat/route.ts`
- **Limit:** 8 requests per minute per IP
- **Scope:** Authenticated users only

## 🧪 Testing Results

```
🎉 All bot protection tests passed!
Bots correctly blocked: 4/4
Crawlers correctly allowed: 4/4
Success Rate: 100%
```

**Test Cases:**
- ✅ Googlebot, Bingbot → ALLOWED (307 redirect)
- ✅ Chrome, Firefox → ALLOWED (307 redirect)  
- ❌ curl, Python requests → BLOCKED (403)
- ❌ Custom bots, scrapers → BLOCKED (403)

## 🔧 Architecture

```
Request Flow:
1. Bot Protection (middleware) → blocks bots, allows crawlers
2. WAF Protection (middleware, chat paths) → blocks attacks  
3. Supabase Auth (middleware) → redirects if not authenticated
4. Rate Limiting (endpoint) → limits authenticated usage
5. Chat Processing
```

## ⚙️ Configuration

Environment variable required:
```bash
ARCJET_KEY=your_arcjet_api_key_here
```

All rules are in **LIVE mode** (blocking):
- Bot detection: Allows `CATEGORY:SEARCH_ENGINE`
- WAF Shield: Standard protection level
- Rate limiting: 8 requests/minute, 1-minute windows

## 🐛 Troubleshooting

**All requests blocked?**
- Check `ARCJET_KEY` in `.env.local`
- Verify Arcjet service is operational

**Search engines blocked?**
- Check user agent patterns in `utils/arcjet.ts`
- Verify middleware configuration

**Tests failing?**
- Ensure server is running: `pnpm dev`
- Check Node.js version supports fetch (v18+) 