# 🌐 Cloudflare Workers Deployment Guide

**Status:** ✅ **READY TO DEPLOY**

This guide will help you deploy the Qwen API Proxy to Cloudflare Workers in minutes.

## 🎯 Quick Deploy (5 minutes)

### 1. Login to Cloudflare

```bash
npx wrangler login
```

### 2. Create .dev.vars for Local Testing

Copy the example:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and add your actual Qwen token:

```bash
QWEN_TOKEN=your-actual-token-here
```

> **Note:** This enables public access by default. Add `API_KEYS=your-keys` if you need authorization during local testing.

### 3. Test Locally

```bash
npm run dev:worker
```

Visit `http://localhost:8787/` to see the worker running.

Test the API:

```bash
curl http://localhost:8787/api/models
```

### 4. Set Production Secrets

**Required:**

```bash
# Set Qwen token (REQUIRED)
npx wrangler secret put QWEN_TOKEN
# Paste your token when prompted
```

That's it! Your worker will deploy with public access (no authorization).

**Optional - Add Authorization Later:**

If you want to protect your API later, you can add API_KEYS anytime via:

- Cloudflare Dashboard → Your Worker → Settings → Variables & Secrets
- Or via CLI: `npx wrangler secret put API_KEYS`

> **💡 Note:** By default, your API works without authorization (public access). Add API_KEYS only if you need to restrict access.

### 5. Deploy!

```bash
npm run deploy:worker
```

You'll get a URL like: `https://qwen-api-proxy.your-subdomain.workers.dev`

### 6. Test Your Deployment

**Without Authorization (if API_KEYS not set):**

```bash
curl https://qwen-api-proxy.your-subdomain.workers.dev/api/models
```

**With Authorization (if API_KEYS is set):**

```bash
curl https://qwen-api-proxy.your-subdomain.workers.dev/api/models \
  -H "Authorization: Bearer my-secret-key-1"
```

## 📚 Detailed Documentation

### Environment Variables

**Required:**

- `QWEN_TOKEN` - Single Qwen authentication token
- OR `QWEN_TOKENS` - Multiple tokens (comma-separated) for load balancing

**Optional (don't set for public access):**

- `API_KEYS` - Comma-separated authorization keys. If not set, API works without authentication (public access).

### Custom Domain

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Workers & Pages → Your Worker
3. Settings → Triggers → Add Custom Domain
4. Enter your domain (must be on Cloudflare)

Example: `api.yourdomain.com` → All requests go to your worker

### Monitoring

**View Live Logs:**

```bash
npm run tail:worker
```

**View Analytics:**

Dashboard → Your Worker → Metrics tab

### Updating Environment Variables

```bash
# Update or add a secret
npx wrangler secret put QWEN_TOKEN

# List all secrets
npx wrangler secret list

# Delete a secret
npx wrangler secret delete QWEN_TOKEN
```

### Scaling & Limits

**Free Tier:**

- 100,000 requests/day
- 10ms CPU time per request
- 128MB memory
- No credit card required

**Paid Tier ($5/month):**

- 10 million requests/month (then $0.50 per million)
- 50ms CPU time per request
- 128MB memory

### Troubleshooting

**Issue:** "No tokens configured" error

**Solution:** Make sure you've set QWEN_TOKEN or QWEN_TOKENS:

```bash
npx wrangler secret put QWEN_TOKEN
```

**Issue:** 401 Unauthorized when calling API

**Solution:** Include the Authorization header:

```bash
curl https://your-worker.workers.dev/api/chat \
  -H "Authorization: Bearer my-secret-key-1" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

**Issue:** Need to disable authorization

**Solution:** Don't set `API_KEYS` secret. The worker will accept all requests.

## 🏗️ Architecture

The Cloudflare Workers deployment uses:

- **Hono** - Lightweight web framework (replaces Express)
- **Zero File System** - All processing in memory
- **Standalone Implementation** - No dependencies on src/ files
- **Environment-Based Config** - All settings via Cloudflare Secrets

## 📝 Differences from Express Version

| Feature      | Express (index.js) | Workers (worker.js)     |
| ------------ | ------------------ | ----------------------- |
| Framework    | Express.js         | Hono                    |
| HTTP Logging | Morgan             | Hono logger middleware  |
| File Uploads | Multer             | FormData API            |
| Dependencies | src/\* modules     | Standalone functions    |
| Deployment   | Node.js servers    | Cloudflare edge network |

## 🔗 Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Hono Framework](https://hono.dev/)
- [Pricing Calculator](https://workers.cloudflare.com/)

## ✨ Next Steps

After deployment:

1. Test all endpoints (models, chat, status)
2. Set up custom domain (optional)
3. Monitor usage in Cloudflare Dashboard
4. Considerupgrading to Paid plan for higher limits

Enjoy your serverless Qwen API proxy! 🚀
