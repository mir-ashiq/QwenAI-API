# Architecture Documentation

## Overview

The Qwen API Proxy v2.0 is a **serverless-first** architecture designed to run on any cloud platform without persistent storage requirements.

## 🎯 Design Principles

1. **Zero File System Dependencies**: All operations happen in memory
2. **12-Factor App Compliance**: Configuration through environment variables
3. **Stateless Execution**: Each request is independent
4. **Cloud Native**: Optimized for horizontal scaling

---

## 📊 Architecture Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTPS Request
       ▼
┌─────────────────────────────────────┐
│       Load Balancer (Optional)       │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌─────▼──────┐
│  Instance 1 │  │ Instance 2 │  ... (Auto-scaling)
└──────┬──────┘  └─────┬──────┘
       │                │
       └───────┬────────┘
               │
        ┌──────▼───────┐
        │  Qwen API    │
        │ (chat.qwen.ai)│
        └──────┬───────┘
               │
        ┌──────▼───────┐
        │ Alibaba OSS  │
        │ (File Storage)│
        └──────────────┘
```

---

## 🏗️ Component Architecture

### 1. **Entry Point** (`index.js`)

- Express.js server initialization
- Middleware configuration
- Swagger UI integration
- Graceful shutdown handling

### 2. **API Routes** (`src/api/routes.js`)

- RESTful endpoint definitions
- Request validation
- Response formatting
- Error handling

### 3. **Core Services**

#### **Token Manager** (`src/api/tokenManager.js`)

```javascript
// Load balancing across multiple tokens
loadTokens() → [env tokens] + [file tokens]
getAvailableToken() → Round-robin selection
markRateLimited() → 24-hour cooldown
```

**Features:**

- ✅ Environment variable priority
- ✅ Round-robin load balancing
- ✅ Automatic rate limit handling
- ✅ Optional file-based storage (graceful degradation)

#### **Chat Service** (`src/api/chat.js`)

```javascript
sendMessage() → {
  1. Create chat (if needed)
  2. Build request payload
  3. Stream response chunks
  4. Handle errors & retries
}
```

**Features:**

- ✅ Streaming responses (t2t, t2i)
- ✅ Task polling for video (t2v)
- ✅ Automatic chat creation
- ✅ Context management via chatId/parentId

#### **File Upload** (`src/api/fileUpload.js`)

```javascript
uploadFileToQwen() → {
  1. Receive file buffer (in memory)
  2. Get STS token from Qwen
  3. Upload to Alibaba OSS
  4. Return file URL
}
```

**Features:**

- ✅ In-memory processing (no temp files)
- ✅ Direct buffer transfer
- ✅ 25MB upload limit
- ✅ Multi-format support (images, documents)

#### **Logger** (`src/logger/index.js`)

```javascript
// Console-only logging (no file writes)
logInfo() → stdout
logError() → stderr
logHttp() → Morgan middleware
```

**Features:**

- ✅ Structured logging
- ✅ Log levels (error, warn, info, http, debug)
- ✅ Colorized output
- ✅ Compatible with cloud logging systems

---

## 🔄 Request Flow

### Text Chat (t2t)

```
Client Request
    ↓
Authentication Check
    ↓
Token Selection (Round-robin)
    ↓
Create Chat (if no chatId)
    ↓
Stream Request to Qwen API
    ↓
Parse SSE Response
    ↓
Return to Client (~2-5s)
```

### Image Generation (t2i)

```
Client Request
    ↓
Authentication Check
    ↓
Token Selection
    ↓
Create Chat with chatType: "t2i"
    ↓
Stream Request to Qwen API
    ↓
Accumulate Image URL from SSE
    ↓
Return Complete URL (~10-20s)
```

### Video Generation (t2v)

```
Client Request
    ↓
Authentication Check
    ↓
Token Selection
    ↓
Create Chat with chatType: "t2v"
    ↓
Non-streaming Request to Qwen API
    ↓
Receive Task ID
    ↓
Poll Task Status (every 5s)
    ↓
Return Video URL (~30-60s)
```

### File Upload

```
Client Upload (Multipart Form)
    ↓
Multer → In-Memory Buffer
    ↓
Get STS Token from Qwen
    ↓
Upload Buffer to Alibaba OSS
    ↓
Return File URL & ID
```

---

## 💾 Data Storage

### Configuration (Read-Only)

- **Models List**: Hardcoded array in `src/config.js`
- **API URLs**: Constants in `src/config.js`
- **Environment Variables**: Loaded once at startup

### Runtime State (In-Memory)

- **Token Pool**: Array of token objects with status
- **Token Pointer**: Round-robin index for load balancing
- **Request Buffers**: File uploads, response streams

### Optional Persistent Storage

- **session/tokens.json**: File-based token storage (optional)
  - Used if file system is available
  - Gracefully degrades if not available
  - Environment variables take priority

---

## 🔐 Security Model

### Authentication Layers

1. **Proxy Authentication** (Optional)

   ```
   Client → Proxy: Authorization: Bearer <API_KEY>
   Validated against API_KEYS env variable
   ```

2. **Qwen Authentication** (Required)
   ```
   Proxy → Qwen: Authorization: Bearer <QWEN_TOKEN>
   Managed by Token Manager
   ```

### Security Features

- ✅ Rate limit protection
- ✅ Invalid token detection
- ✅ HTTPS enforcement (in production)
- ✅ CORS configuration
- ✅ Request size limits

---

## ⚙️ Configuration Management

### Environment Variables

```bash
# Required
QWEN_TOKEN=xxx          # Single token
# OR
QWEN_TOKENS=x,y,z       # Multiple tokens

# Optional
API_KEYS=a,b,c          # Proxy auth keys
PORT=3264               # Server port
HOST=0.0.0.0            # Bind address
LOG_LEVEL=info          # Logging verbosity
```

### Runtime Configuration

```javascript
// src/config.js
export const AVAILABLE_MODELS = [
  "qwen3-max",
  "qwen-max-latest",
  // ... 18 models total
];

export const API_KEYS =
  process.env.API_KEYS?.split(",")
    .map((k) => k.trim())
    .filter((k) => k) || [];
```

---

## 📈 Scalability

### Horizontal Scaling

- ✅ **Stateless**: No shared state between instances
- ✅ **Token Distribution**: Each instance loads same tokens
- ✅ **Load Balancing**: Round-robin within each instance
- ✅ **Auto-scaling**: Scale based on CPU/memory usage

### Performance Optimization

- **Connection Pooling**: HTTP keep-alive enabled
- **Stream Processing**: Minimal memory footprint
- **Async I/O**: Non-blocking operations
- **Buffer Reuse**: Efficient memory management

### Limits

- **File Upload**: 25MB per file (configurable)
- **Request Body**: 150MB total (JSON + files)
- **Concurrent Requests**: Limited by platform

---

## 🌍 Cloud Platform Compatibility

| Platform       | File System | Logging     | Config | Status        |
| -------------- | ----------- | ----------- | ------ | ------------- |
| **Railway**    | ✅          | stdout      | .env   | ✅ Ready      |
| **Render**     | ✅          | stdout      | .env   | ✅ Ready      |
| **Heroku**     | ✅          | stdout      | .env   | ✅ Ready      |
| **AWS Lambda** | ❌          | CloudWatch  | .env   | ✅ Ready      |
| **Cloud Run**  | ✅          | Stackdriver | .env   | ✅ Ready      |
| **Vercel**     | ❌          | stdout      | .env   | ✅ Ready      |
| **CF Workers** | ❌          | stdout      | .env   | ⚠️ Needs Hono |

✅ = Fully compatible  
⚠️ = Requires minor changes  
❌ = No persistent storage

---

## 🔧 Error Handling

### Token Errors

```javascript
401/403 → markInvalid() → Rotate to next token → Retry
429 → markRateLimited(24h) → Rotate to next token → Retry
```

### Network Errors

```javascript
ECONNREFUSED → Retry with exponential backoff
ETIMEDOUT → Fail fast, return error
```

### Application Errors

```javascript
ValidationError → 400 Bad Request
AuthenticationError → 401 Unauthorized
RateLimitError → 429 Too Many Requests
ServerError → 500 Internal Server Error
```

---

## 🧪 Testing Strategy

### Unit Tests

- Token rotation logic
- Request validation
- Response formatting
- Error handling

### Integration Tests

```javascript
// test-all-features.js
✓ Models endpoint
✓ Status endpoint
✓ Text chat (t2t)
✓ Image generation (t2i)
✓ Video generation (t2v)
✓ File upload
✓ OpenAI compatibility
```

### Load Tests

- Concurrent requests
- Token exhaustion scenarios
- Rate limit handling
- Memory leaks

---

## 📊 Monitoring & Observability

### Metrics to Track

- **Request Rate**: Requests per second
- **Error Rate**: 4xx/5xx responses
- **Response Time**: P50, P95, P99 latencies
- **Token Health**: Active vs rate-limited tokens
- **Memory Usage**: Buffer allocations

### Recommended Tools

- **Application Monitoring**: New Relic, Datadog
- **Log Aggregation**: Logtail, Papertrail
- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Performance**: Lighthouse, WebPageTest

---

## 🚀 Future Enhancements

### Planned Features

- [ ] Redis-based token state (multi-instance coordination)
- [ ] GraphQL API endpoint
- [ ] WebSocket support for streaming
- [ ] Rate limiting per client
- [ ] Response caching layer

### Platform-Specific Optimizations

- [ ] Cloudflare Workers (Hono conversion)
- [ ] Edge deployment (Deno support)
- [ ] Serverless framework plugins
- [ ] Kubernetes helm charts

---

## 📚 References

- [Express.js Documentation](https://expressjs.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [12-Factor App](https://12factor.net/)
- [Serverless Framework](https://www.serverless.com/)
- [Qwen API Documentation](https://chat.qwen.ai/)

---

**Architecture Version**: 2.0  
**Last Updated**: February 2026  
**Status**: Production Ready
