# 🚀 Setup Guide - Qwen API Proxy

This guide will help you set up and run the Qwen API Proxy server.

> **✨ Serverless Ready:** This proxy is fully compatible with serverless platforms (Railway, Render, AWS Lambda, Google Cloud Run). See [DEPLOYMENT.md](DEPLOYMENT.md) for cloud deployment guides.

## 📋 Prerequisites

- **Node.js** 18+ installed
- A **Qwen account** (free at https://chat.qwen.ai)

---

## 🔧 Installation

1. **Clone the repository** (or download)

   ```bash
   git clone <repository-url>
   cd FreeQwenApi
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

---

## 🔑 Getting Your Qwen Token

**IMPORTANT**: You need to manually extract your authentication token from Qwen's website.

### Step-by-Step Instructions:

1. **Open your browser** and go to https://chat.qwen.ai

2. **Login** with your account (GitHub, Google, etc.)

3. **Open Developer Tools**:
   - **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - **Firefox**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)

4. **Navigate to the Application/Storage tab**:
   - Chrome/Edge: Click on **"Application"** tab
   - Firefox: Click on **"Storage"** tab

5. **Find Local Storage**:
   - Expand **"Local Storage"** in the left sidebar
   - Click on **https://chat.qwen.ai**

6. **Copy the token**:
   - Find the key named **`token`**
   - Copy its **value** (a long string of characters)
   - ⚠️ **Keep this token secret!** It's like your password.

### Visual Guide:

```
Developer Tools → Application/Storage → Local Storage → https://chat.qwen.ai → token
```

---

## ➕ Adding Your Token

You have **two ways** to configure tokens:

### Method 1: Interactive Setup (Recommended for beginners)

Run the interactive token setup script:

```bash
npm run addToken
```

Follow the prompts:

1. Paste your token (from the steps above)
2. (Optional) Give your account a friendly name
3. Done! ✅

### Method 2: Environment Variables (Recommended for deployment)

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your token(s):

**Single Token:**

```bash
QWEN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Multiple Tokens (comma-separated):**

```bash
QWEN_TOKENS=token1,token2,token3
```

**Example with real tokens:**

```env
# Single token
QWEN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI0MDkz...

# OR multiple tokens for load balancing
QWEN_TOKENS=eyJhbGciOiJIUzI1Ni...,eyJhbGciOiJIUzI1Ni...,eyJhbGciOiJIUzI1Ni...
```

**Benefits of .env method:**

- ✅ Easy deployment (Docker, cloud platforms)
- ✅ No need to run setup scripts
- ✅ Environment-specific configurations
- ✅ CI/CD friendly

**Note:** Tokens from `.env` and `session/tokens.json` are combined. Environment tokens take priority.

### Adding Multiple Accounts

You can add multiple Qwen accounts for load balancing and better rate limits:

**Via interactive script:**

```bash
npm run addToken  # Run multiple times for each account
```

**Via .env:**

```bash
QWEN_TOKENS=token1,token2,token3
```

The proxy will automatically rotate between accounts.

---

## ▶️ Starting the Server

```bash
npm start
```

You should see:

```
╔═══════════════════════════════════════════════════════════════════════╗
║  ✅ Server running on 0.0.0.0:3264                                    ║
║  📍 API Base URL: http://localhost:3264/api                           ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## 🧪 Testing

Test all features (chat, image, video):

```bash
npm test
```

Quick test (chat only):

```bash
npm run test:quick
```

---

## 📡 API Usage

### Basic Chat Request

```bash
curl -X POST http://localhost:3264/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, Qwen!",
    "model": "qwen-max-latest"
  }'
```

### OpenAI Compatible Endpoint

```bash
curl -X POST http://localhost:3264/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is AI?"}
    ],
    "model": "gpt-4"
  }'
```

### Image Generation (t2i)

```bash
curl -X POST http://localhost:3264/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "A beautiful sunset over the ocean",
    "model": "qwen-vl-max-latest",
    "chatType": "t2i",
    "size": "16:9"
  }'
```

### Video Generation (t2v)

```bash
curl -X POST http://localhost:3264/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "A serene forest with sunlight",
    "model": "qwen-vl-max-latest",
    "chatType": "t2v",
    "size": "16:9"
  }'
```

---

## 🛠️ Advanced Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```bash
PORT=3264                    # Server port
HOST=0.0.0.0                 # Server host (0.0.0.0 = all interfaces)
LOG_LEVEL=info               # Logging level: debug, info, warn, error
```

### Managing Tokens

Tokens are stored in `session/tokens.json`. You can:

1. **View tokens**: Check `/api/status` endpoint
2. **Add tokens**: `npm run addToken`
3. **Remove tokens**: Edit `session/tokens.json` and delete entries

### Token Status

Check all your tokens' status:

```bash
curl http://localhost:3264/api/status
```

Response:

```json
{
  "authenticated": true,
  "totalAccounts": 2,
  "validAccounts": 2,
  "message": "Tokens available",
  "accounts": [
    {
      "id": "acc_1234567890",
      "name": "My Account 1",
      "status": "OK",
      "resetAt": null,
      "invalid": false
    }
  ]
}
```

---

## ⚠️ Troubleshooting

### "No valid tokens available"

**Solution**: Add a token using `npm run addToken`

### "Rate limited" or "Account marked as RATE_LIMITED"

**Cause**: You've exceeded Qwen's rate limits  
**Solution**:

- Wait 24 hours for the limit to reset
- Add more accounts for load balancing
- The proxy automatically rotates between accounts

### "Token invalid" or "Account marked as INVALID"

**Cause**: Your token has expired  
**Solution**:

1. Get a new token from https://chat.qwen.ai (follow the "Getting Your Token" steps)
2. Add it with `npm run addToken`

### Server won't start / Port already in use

**Cause**: Another instance is running or port is occupied  
**Solution**:

- Kill existing process: `npx kill-port 3264`
- Or change the port: `PORT=3265 npm start`

---

## 🔐 Security Notes

- ⚠️ **Never share your tokens** - they are like passwords
- ⚠️ **Don't commit `session/` folder** to git - it's in `.gitignore`
- ⚠️ **Use API keys** for production (set in `src/Authorization.txt`)
- 🔒 Run behind a reverse proxy (Nginx/Caddy) for HTTPS

---

## 📊 Account Management Best Practices

### Multiple Accounts Strategy

For heavy usage, add multiple Qwen accounts:

1. Create free accounts on https://chat.qwen.ai (use different emails)
2. Add each token with `npm run addToken`
3. The proxy will automatically rotate between them

**Benefits**:

- Higher rate limits
- Automatic failover
- Better performance

### Token Rotation

The proxy uses **round-robin** rotation:

- Each request uses the next available token
- Invalid/rate-limited tokens are automatically skipped
- Tokens are re-checked periodically

---

## 📝 API Reference

| Endpoint                | Method | Description                |
| ----------------------- | ------ | -------------------------- |
| `/api/chat`             | POST   | Send chat message          |
| `/api/chat/completions` | POST   | OpenAI compatible endpoint |
| `/api/chats`            | POST   | Create new chat            |
| `/api/models`           | GET    | List available models      |
| `/api/status`           | GET    | Check token status         |
| `/api/files/upload`     | POST   | Upload files               |

---

## 🎯 What Changed from Old Version?

### Removed:

- ❌ Puppeteer (no more browser automation)
- ❌ Complex account login flow
- ❌ Browser session management

### Added:

- ✅ Simple manual token input
- ✅ Faster startup (~2 seconds vs 30+ seconds)
- ✅ Much lighter (no Chromium download)
- ✅ Easier deployment (Docker/Cloud friendly)

### Migration Guide:

If you're upgrading from the old version:

1. **Backup your data**:

   ```bash
   cp -r session/ session_backup/
   ```

2. **Get new tokens** manually (follow "Getting Your Token" guide)

3. **Add them**:

   ```bash
   npm run addToken
   ```

4. **That's it!** The proxy works the same way, just without the browser.

---

## 🐳 Docker Deployment

Coming soon! The lighter architecture makes Docker deployment much easier.

---

## 📞 Support

- **Issues**: Open an issue on GitHub
- **Documentation**: Check `README.md` for full API docs
- **Examples**: See `test-features.js` for usage examples

---

## 🎉 Quick Start Summary

### Option A: Interactive Setup

```bash
# 1. Install
npm install

# 2. Get your token from https://chat.qwen.ai (F12 → Application → Local Storage → token)

# 3. Add token
npm run addToken

# 4. Start server
npm start

# 5. Test
curl -X POST http://localhost:3264/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

### Option B: Using .env (Recommended for deployment)

```bash
# 1. Install
npm install

# 2. Create .env file
cp .env.example .env

# 3. Edit .env and add your token
# Get token from: https://chat.qwen.ai → F12 → Application → Local Storage → token
echo "QWEN_TOKEN=your_token_here" > .env

# 4. Start server
npm start

# 5. Test
curl -X POST http://localhost:3264/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

**Done!** 🚀
