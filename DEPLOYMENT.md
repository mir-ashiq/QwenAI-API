# Deployment Guide

This guide covers deploying the Qwen API Proxy to various cloud platforms. The proxy is **serverless-ready** with zero file system dependencies.

## 📋 Prerequisites

All platforms require:

- **Qwen Token**: Get from https://chat.qwen.ai → F12 → Application → Local Storage → token
- **Node.js**: v18 or higher (most platforms auto-detect)

---

## ☁️ Cloud Platform Deployment

### 1. Railway (Recommended - Easiest)

**Why Railway:**

- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Git-based deployment
- ✅ Zero configuration

**Steps:**

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub"
4. Select your repository
5. Add environment variable:
   ```
   QWEN_TOKEN=your_token_here
   ```
6. Railway auto-detects Node.js and deploys!

**Custom Domain:** Railway provides a free subdomain, or connect your own domain.

---

### 2. Render

**Why Render:**

- ✅ Free tier with 750 hours/month
- ✅ Automatic HTTPS
- ✅ Docker support
- ✅ Background workers

**Steps:**

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     ```
     QWEN_TOKEN=your_token_here
     PORT=3264
     ```
6. Click "Create Web Service"

**Note:** Free tier sleeps after inactivity (spins up in ~30s on first request).

---

### 3. Heroku

**Steps:**

1. Install Heroku CLI
2. Login and create app:

   ```bash
   heroku login
   heroku create your-app-name
   ```

3. Set environment variables:

   ```bash
   heroku config:set QWEN_TOKEN=your_token_here
   heroku config:set PORT=3264
   ```

4. Deploy:

   ```bash
   git push heroku main
   ```

5. Open your app:
   ```bash
   heroku open
   ```

---

### 4. AWS Lambda (Serverless Framework)

**Requirements:**

- Serverless Framework CLI
- AWS credentials configured

**Create `serverless.yml`:**

```yaml
service: qwen-api-proxy

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    QWEN_TOKEN: ${env:QWEN_TOKEN}
    API_KEYS: ${env:API_KEYS}

functions:
  api:
    handler: lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
```

**Create `lambda.js`:**

```javascript
import serverless from "serverless-http";
import express from "express";
// Import your app
import apiRoutes from "./src/api/routes.js";

const app = express();
app.use("/api", apiRoutes);

export const handler = serverless(app);
```

**Deploy:**

```bash
npm install serverless serverless-http
serverless deploy
```

---

### 5. Google Cloud Run

**Requirements:**

- Google Cloud SDK
- Docker (for local testing)

**Steps:**

1. Build and push container:

   ```bash
   gcloud builds submit --tag gcr.io/PROJECT-ID/qwen-proxy
   ```

2. Deploy:

   ```bash
   gcloud run deploy qwen-proxy \
     --image gcr.io/PROJECT-ID/qwen-proxy \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars QWEN_TOKEN=your_token_here
   ```

3. Get URL:
   ```bash
   gcloud run services describe qwen-proxy --format='value(status.url)'
   ```

---

### 6. Vercel (Edge Functions)

**Note:** Requires some modifications for Vercel's edge runtime.

**Create `vercel.json`:**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.js"
    }
  ],
  "env": {
    "QWEN_TOKEN": "@qwen-token"
  }
}
```

**Deploy:**

```bash
vercel --prod
```

---

## 🌐 Cloudflare Workers

**Status:** ✅ **READY TO DEPLOY**

**Why Cloudflare Workers:**

- ✅ Serverless with global edge network
- ✅ Free tier: 100,000 requests/day
- ✅ Ultra-fast cold starts (<1ms)
- ✅ Pay-as-you-go pricing
- ✅ Built-in DDoS protection

**What's Included:**

- ✅ Hono framework (Express replacement)
- ✅ No file system dependencies
- ✅ In-memory uploads
- ✅ Console-only logging
- ✅ Environment-based configuration

### Prerequisites

1. **Cloudflare Account** (free): https://dash.cloudflare.com/sign-up
2. **Wrangler CLI** (already installed in devDependencies)

### Deployment Steps

#### 1. Login to Cloudflare

```bash
npx wrangler login
```

This will open a browser for authentication.

#### 2. Configure Environment Variables

Create a `.dev.vars` file for local development:

```bash
# .dev.vars (for local testing only)
QWEN_TOKEN=your-token-here
API_KEYS=my-secret-key-1,admin-key-xyz
```

> ⚠️ **Important:** Add `.dev.vars` to `.gitignore` to keep secrets safe!

#### 3. Test Locally

Run the worker locally with Wrangler:

```bash
npm run dev:worker
```

Your API will be available at `http://localhost:8787/api`

Test it:

```bash
curl http://localhost:8787/api/models
```

#### 4. Set Production Environment Variables

Set environment variables in Cloudflare (not stored in code):

```bash
# Set Qwen token
npx wrangler secret put QWEN_TOKEN
# Paste your token when prompted

# Set API keys for proxy authorization
npx wrangler secret put API_KEYS
# Enter: my-secret-key-1,admin-key-xyz
```

Or use multiple tokens:

```bash
npx wrangler secret put QWEN_TOKENS
# Enter: token1,token2,token3
```

#### 5. Deploy to Cloudflare Workers

```bash
npm run deploy:worker
```

You'll get a URL like: `https://qwen-api-proxy.your-subdomain.workers.dev`

#### 6. Test Your Deployment

```bash
curl https://qwen-api-proxy.your-subdomain.workers.dev/api/models \
  -H "Authorization: Bearer my-secret-key-1"
```

### Managing Your Worker

**View Logs:**

```bash
npm run tail:worker
```

**Update Environment Variables:**

```bash
npx wrangler secret put QWEN_TOKEN
```

**View All Secrets:**

```bash
npx wrangler secret list
```

**Delete a Secret:**

```bash
npx wrangler secret delete QWEN_TOKEN
```

### Custom Domain

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker
3. Go to "Settings" → "Triggers"
4. Add a custom domain (must be on Cloudflare)

**Example:** `api.yourdomain.com` → `https://api.yourdomain.com/api/chat`

### Performance Tuning

**CPU Limits:**

- Free tier: 10ms CPU time per request
- Paid ($5/month): 50ms CPU time per request

If you hit CPU limits, upgrade to Workers Paid plan.

**Request Limits:**

- Free: 100,000 requests/day
- Paid: 10 million requests/month included, then $0.50 per million

### Troubleshooting

**Issue:** "Module not found" errors

**Solution:** Ensure all imports use `.js` extensions and are relative paths:

```javascript
import { sendMessage } from "./src/api/chat.js"; // ✅ Good
import { sendMessage } from "./src/api/chat"; // ❌ Bad
```

**Issue:** "CPU time limit exceeded"

**Solution:** Upgrade to Workers Paid plan ($5/month) for 50ms CPU time.

**Issue:** "Secrets not working"

**Solution:** Use `wrangler secret put` instead of environment variables in `wrangler.toml`

### Architecture Notes

The worker uses:

- **Hono** - Fast, lightweight web framework for Workers
- **No Express** - Express doesn't work on Workers runtime
- **No Winston** - Console logging only (viewable with `wrangler tail`)
- **No file system** - All processing in memory

### Monitoring

**View Real-Time Logs:**

```bash
npm run tail:worker
```

**View Analytics:**

1. Go to Cloudflare Dashboard
2. Select your Worker
3. Click "Metrics" tab

You'll see:

- Request count
- Error rate
- CPU time usage
- Bandwidth usage

---

## 🐳 Docker Deployment

**Using Docker Compose:**

```bash
docker-compose up --build -d
```

**Using plain Docker:**

```bash
# Build
docker build -t qwen-proxy .

# Run
docker run -d \
  -p 3264:3264 \
  -e QWEN_TOKEN=your_token_here \
  --name qwen-proxy \
  qwen-proxy
```

**Docker on Cloud:**

- **AWS ECS**: Upload to ECR, create ECS service
- **Google Cloud Run**: Use `gcloud builds submit`
- **Azure Container Instances**: Use `az container create`

---

## 🔧 Environment Variables

All platforms support these variables:

| Variable      | Required | Description                       | Example         |
| ------------- | -------- | --------------------------------- | --------------- |
| `QWEN_TOKEN`  | Yes\*    | Single Qwen auth token            | `eyJhbGci...`   |
| `QWEN_TOKENS` | Yes\*    | Multiple tokens (comma-separated) | `token1,token2` |
| `API_KEYS`    | No       | API keys for proxy auth           | `key1,key2`     |
| `PORT`        | No       | Server port (default: 3264)       | `8080`          |
| `HOST`        | No       | Bind address (default: 0.0.0.0)   | `127.0.0.1`     |
| `LOG_LEVEL`   | No       | Logging level                     | `info`, `debug` |

\*Either `QWEN_TOKEN` or `QWEN_TOKENS` is required

---

## 🚀 Best Practices

### Performance

- Use multiple tokens (`QWEN_TOKENS`) for load balancing
- Enable connection pooling in production
- Use CDN for static Swagger UI assets

### Security

- **Always** use HTTPS in production
- Set `API_KEYS` to protect your proxy
- Rotate tokens regularly
- Never commit `.env` to git

### Monitoring

- Enable platform logging (CloudWatch, Stackdriver, etc.)
- Monitor rate limits (check `/api/status`)
- Set up health check endpoints
- Track response times

### Scaling

- Most platforms auto-scale based on traffic
- For high traffic, use load balancing with multiple tokens
- Consider caching for frequently requested content

---

## 🆘 Troubleshooting

### "No valid token available"

- Check `QWEN_TOKEN` environment variable
- Verify token hasn't expired
- Get new token from https://chat.qwen.ai

### "Port already in use"

- Change `PORT` environment variable
- Kill existing process: `pkill -f node`

### "Rate limit exceeded"

- Add more tokens via `QWEN_TOKENS`
- Wait 24 hours for cooldown
- Check `/api/status` for token health

### "Module not found" on deployment

- Ensure `package.json` includes all dependencies
- Run `npm install` before deploying
- Check Node.js version compatibility

---

## 📊 Platform Comparison

| Platform       | Free Tier      | Setup Time | Auto-Scale | File System | Best For          |
| -------------- | -------------- | ---------- | ---------- | ----------- | ----------------- |
| **Railway**    | ✅ 500 hrs     | 2 min      | ✅         | ✅          | Quick deployments |
| **Render**     | ✅ 750 hrs     | 3 min      | ✅         | ✅          | Free hosting      |
| **Heroku**     | ✅ 550 hrs     | 5 min      | ✅         | ✅          | Established apps  |
| **Vercel**     | ✅ Unlimited   | 3 min      | ✅         | ❌          | Edge functions    |
| **AWS Lambda** | ✅ 1M requests | 10 min     | ✅         | ❌          | Pay-per-use       |
| **Cloud Run**  | ✅ 2M requests | 10 min     | ✅         | ✅          | Containers        |
| **CF Workers** | ✅ 100k/day    | 15 min\*   | ✅         | ❌          | Global edge       |

\*Requires Express→Hono conversion

---

## 📚 Additional Resources

- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
- [Heroku Node.js Guide](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)

---

**Need help?** Open an issue on GitHub or check existing deployment examples.
