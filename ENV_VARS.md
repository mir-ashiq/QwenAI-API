# Environment Variables Configuration

This document provides a complete reference for configuring the Qwen API Proxy via environment variables.

> **🚀 Serverless Ready:** All configuration can be done via environment variables, making this proxy fully compatible with Railway, Render, AWS Lambda, Google Cloud Run, and other serverless platforms.

## 📋 Configuration File

Create a `.env` file in the project root directory.

```bash
# Copy from example
cp .env.example .env
```

---

## 🔑 Authentication Tokens

> **Recommended for Serverless:** Use environment variables instead of file-based token storage for cloud deployments.

### QWEN_TOKEN (Single Token)

Configure a single Qwen authentication token.

```bash
QWEN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Use case:** Simple deployment with one account.

---

### QWEN_TOKENS (Multiple Tokens)

Configure multiple tokens separated by commas for load balancing.

```bash
QWEN_TOKENS=token1,token2,token3
```

**Example:**

```bash
QWEN_TOKENS=eyJhbGciOiJIUzI1Ni...,eyJhbGciOiJIUzI1Ni...,eyJhbGciOiJIUzI1Ni...
```

**Use case:**

- Load balancing across multiple accounts
- Higher rate limits
- Automatic failover

**Benefits:**

- Each token gets its own rate limit
- Automatic rotation between accounts
- Continues working if one token fails

---

## � Proxy Authorization

### API_KEYS (Proxy Access Control)

Configure API keys that clients must provide to access your proxy server.

```bash
API_KEYS=my-secret-key-1,admin-key-xyz,client-key-abc
```

**Use case:**

- Protect your proxy from unauthorized access
- Control who can use your deployed proxy
- Required for production deployments

**How clients authenticate:**

```bash
curl -X POST http://your-proxy.com/api/chat \
  -H "Authorization: Bearer my-secret-key-1" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

**Disabling Authorization:**

- Leave `API_KEYS` empty or unset
- Ensure `src/Authorization.txt` is empty or doesn't exist
- Proxy will accept all requests without authentication

> **⚠️ Security Warning:** Always use API_KEYS in production deployments to prevent unauthorized access.

---

## �🖥️ Server Configuration

### PORT

Server port number. Default: `3264`

```bash
PORT=3264
```

---

### HOST

Server host/IP address. Default: `0.0.0.0` (all interfaces)

```bash
HOST=0.0.0.0
```

**Common values:**

- `0.0.0.0` - Listen on all interfaces (default)
- `127.0.0.1` - Listen only on localhost
- `192.168.1.100` - Listen on specific IP

---

## 📝 Logging

### LOG_LEVEL

Logging verbosity level. Default: `info`

```bash
LOG_LEVEL=info
```

**Options:**

- `error` - Only errors
- `warn` - Warnings and errors
- `info` - General info, warnings, and errors (recommended)
- `debug` - Detailed debugging information

---

## 🔄 Token Priority

Tokens are loaded from **both** `.env` and `session/tokens.json`:

1. **Environment tokens** (from `.env`) are loaded first
2. **File tokens** (from `session/tokens.json`) are loaded second
3. Both are combined and used together
4. Environment tokens have IDs like `env_token_1`, `env_token_2`, etc.

**Example:**

- `.env` has 2 tokens → `env_token_1`, `env_token_2`
- `session/tokens.json` has 1 token → `acc_1234567890`
- **Total: 3 tokens available for rotation**

---

## 🎯 Complete Example

```env
# ============================================
# Qwen API Proxy Configuration
# ============================================

# Server
PORT=3264
HOST=0.0.0.0

# Logging
LOG_LEVEL=info

# Proxy Authorization (recommended for production)
API_KEYS=my-secret-key-1,admin-key-xyz,client-key-abc

# Qwen Authentication (choose one method)

# Method 1: Single token
QWEN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI0MDkzYTEwLTNlMGQtNDEwYi1iZTIwLTQ5M2ZiNThhMWRhNiIsImxhc3RfcGFzc3dvcmRfY2hhbmdlIjoxNzcxMjI1MDA4LCJleHAiOjE3NzM5MTAxMzV9.lBUD7kHiDoYTZcCqeJwq9FR3zJpxCX4OydT58og9Cbw

# Method 2: Multiple tokens (comma-separated)
# QWEN_TOKENS=token1,token2,token3

# Account Menu (Docker/CI)
SKIP_ACCOUNT_MENU=false
```

---

## 🚀 Deployment Scenarios

### Development (Single Token)

```env
PORT=3264
HOST=127.0.0.1
LOG_LEVEL=debug
QWEN_TOKEN=your_token_here
```

### Production (Multiple Tokens)

```env
PORT=3264
HOST=0.0.0.0
LOG_LEVEL=info
QWEN_TOKENS=token1,token2,token3
```

### Docker/Kubernetes

Set environment variables in your deployment config:

**Docker:**

```bash
docker run -e QWEN_TOKEN=your_token -e PORT=3264 -p 3264:3264 qwen-proxy
```

**docker-compose.yml:**

```yaml
environment:
  - QWEN_TOKEN=${QWEN_TOKEN}
  - PORT=3264
  - LOG_LEVEL=info
```

**Kubernetes:**

```yaml
env:
  - name: QWEN_TOKEN
    valueFrom:
      secretKeyRef:
        name: qwen-secret
        key: token
  - name: PORT
    value: "3264"
```

---

## 🔒 Security Best Practices

1. **Never commit `.env` to git**
   - It's already in `.gitignore`
   - Contains sensitive tokens

2. **Use different tokens for different environments**
   - Dev, staging, production

3. **Rotate tokens regularly**
   - Get fresh tokens from https://chat.qwen.ai

4. **Use secrets management in production**
   - Kubernetes Secrets
   - Docker Secrets
   - Cloud provider secrets (AWS Secrets Manager, etc.)

5. **Limit token access**
   - Only give tokens to services that need them
   - Use separate accounts for different services

---

## ❓ FAQ

### Can I use both .env and session/tokens.json?

**Yes!** Tokens from both sources are combined.

### Which method should I use?

- **Interactive setup** (`npm run addToken`): Good for local development
- **.env file**: Good for deployment, Docker, CI/CD

### How do I update tokens?

**Environment tokens:**

1. Edit `.env` file
2. Update `QWEN_TOKEN` or `QWEN_TOKENS`
3. Restart server

**File tokens:**

1. Run `npm run addToken` to add more
2. Or edit `session/tokens.json` directly

### Can I mix single and multiple token configs?

**No**. Use either `QWEN_TOKEN` (single) OR `QWEN_TOKENS` (multiple), not both.

If both are set, `QWEN_TOKENS` takes priority.

---

## 🧪 Testing Your Configuration

Check if tokens are loaded correctly:

```bash
# Start server
npm start

# Check status
curl http://localhost:3264/api/status
```

Expected output:

```json
{
  "authenticated": true,
  "totalAccounts": 3,
  "validAccounts": 3,
  "accounts": [
    {
      "id": "env_token_1",
      "name": "Environment Token",
      "status": "OK"
    }
  ]
}
```

---

## 📚 Related Documentation

- [SETUP.md](SETUP.md) - Complete setup guide
- [README.md](README.md) - API documentation
- [.env.example](.env.example) - Environment template

---

**Last Updated:** February 2026
