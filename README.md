# Qwen AI API Proxy

[Русская версия](README_RU.md) | English

**A serverless-ready API proxy for Qwen AI with zero file system dependencies.** Optimized for cloud deployment on platforms like Cloudflare Workers, Railway, Render, or traditional servers.

## 🚀 Deploy Now

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/mir-ashiq/QwenAI-API)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/QwenAI-API?referralCode=mir-ashiq)

> **Quick Deploy:** Click a button above to deploy in minutes. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed guides for all platforms.

## ✨ Key Features

- **💬 Text Chat (t2t)**: Full conversational AI with context management
- **🖼️ Image Generation (t2i)**: Create images from text descriptions with streaming response
- **🎬 Video Generation (t2v)**: Generate videos from prompts with automatic task polling
- **🔍 Image Analysis**: Analyze and describe images using vision models
- **📁 File Upload**: In-memory file uploads (no disk storage required)
- **🔄 Multi-Account**: Token rotation with automatic health monitoring
- **🤝 OpenAI Compatible**: Drop-in replacement for OpenAI API
- **⚡ API v2**: Latest Qwen API with server-side chat history
- **☁️ Serverless Ready**: No file system dependencies - deploy anywhere
- **🚀 Zero Disk I/O**: All operations in memory (logging, uploads, config)
- **🌍 Environment-Based**: Configure via .env variables only

## ⚡ API v2 Update

The proxy has been updated to **Qwen API v2**. Key changes:

- ✅ Chat history stored on Qwen servers (not locally)
- ✅ New context system via `parentId`
- ✅ Automatic chat creation
- ✅ Old endpoints work with extended interface

### New Fields in Responses:

```json
{
  "chatId": "a606fcac-8351-4f1f-80e7-f2f81a88e06a", // Chat ID
  "parentId": "7f637df8-e696-43d9-94b3-40b767da117b" // For dialog continuation
}
```

### Usage:

```javascript
// First message
const res1 = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({ message: "Hello!" }),
});
const data1 = await res1.json();

// Second message with context
const res2 = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    message: "How are you?",
    chatId: data1.chatId,
    parentId: data1.parentId, // From previous response!
  }),
});
```

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
  - [Installation](#installation)
  - [Running](#running)
- [💡 Features](#-features)
- [🎨 Image & Video Generation](#-image--video-generation)
- [📘 API Reference](#-api-reference)
  - [Main Endpoints](#main-endpoints)
  - [Request Formats](#request-formats)
  - [Working with Dialog History](#working-with-dialog-history)
  - [Working with Images](#working-with-images)
  - [File Upload](#file-upload)
  - [Dialog Management](#dialog-management)
- [📝 Usage Examples](#-usage-examples)
  - [Text Requests](#text-requests)
  - [Requests with Images](#requests-with-images)
  - [Examples via Postman](#examples-via-postman)
- [🔄 Working with Context](#-working-with-context)
- [🔌 OpenAI API Compatibility](#-openai-api-compatibility)
  - [Operation Features](#operation-features)
  - [Streaming Mode Support](#streaming-mode-support)
  - [Usage Examples with OpenAI SDK](#usage-examples-with-openai-sdk)
- [🔧 Implementation Features](#-implementation-features)

---

## 1. Quick Start

### 1.1 Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

### 1.2 Configuration

Create a `.env` file (copy from `.env.example`):

```bash
PORT=3264
QWEN_TOKEN=your_token_here
# Or multiple tokens:
# QWEN_TOKENS=token1,token2,token3

# Optional: API keys for proxy authentication
# API_KEYS=key1,key2,key3
```

**Get your Qwen token:**

1. Visit https://chat.qwen.ai and login
2. Open DevTools (F12) → Application → Local Storage
3. Copy the `token` value

### 1.3 Running

```bash
npm start
```

Quick launch file is also available:

```
start.bat
```

### 1.4 Interactive API Documentation

Once the server is running, access the **Swagger UI** documentation at:

```
http://localhost:3264/api-docs
```

The Swagger interface provides:

- 📖 Complete API endpoint documentation
- 🧪 Interactive request testing
- 📋 Request/response schemas
- ✅ Live API interaction

### 1.5 Deployment Options

This proxy is **serverless-ready** with zero file system dependencies:

#### ☁️ **Cloud Platforms (Recommended)**

- **Railway** / **Render** / **Heroku**: Direct GitHub deployment
  - Just connect your repo and set `QWEN_TOKEN` environment variable
  - Zero configuration needed
- **Cloudflare Workers**: Requires Express→Hono conversion
  - All file operations already removed
  - See `DEPLOYMENT.md` for migration guide

- **AWS Lambda** / **Google Cloud Functions**: Works out of the box

#### 🐳 **Docker**

### 1.6 Running in Docker

1. Complete authorization and collect tokens:

```bash
npm run auth
```

2. After saving tokens to the `session/` folder, start the container:

```bash
docker compose up --build -d
```

3. The application will be available at `http://localhost:3264/api`.

> ⚙️ The container starts with the `SKIP_ACCOUNT_MENU=true` variable, so the interactive menu does not block startup. The `session/`, `logs/`, and `uploads/` folders are mounted as volumes, allowing you to reuse saved tokens and logs.

---

## 2. Architecture & Serverless Compatibility

### \ud83c\udfd7\ufe0f Zero File System Dependencies

This proxy has been optimized to run on serverless platforms with **no persistent disk access**:

#### **Console-Only Logging**

- \u2705 No log files created
- \u2705 All logs output to stdout/stderr
- \u2705 Compatible with cloud logging systems (CloudWatch, Stackdriver, etc.)

#### **In-Memory File Uploads**

- \u2705 Files stored in RAM during processing
- \u2705 Direct buffer transfer to Alibaba OSS
- \u2705 No temporary files written to disk
- \u2705 Supports up to 25MB uploads

#### **Configuration from Environment**

- \u2705 Models list: Hardcoded in `src/config.js`
- \u2705 Auth keys: `API_KEYS` environment variable
- \u2705 Tokens: `QWEN_TOKEN` or `QWEN_TOKENS` environment variables
- \u2705 Optional file-based token storage (gracefully degrades if unavailable)

#### **What This Enables**

- \u2705 Deploy to Cloudflare Workers (with Express\u2192Hono conversion)
- \u2705 Deploy to AWS Lambda, Google Cloud Functions
- \u2705 Deploy to Railway, Render, Heroku (zero config)
- \u2705 Run in containerized environments
- \u2705 Horizontal scaling without shared state issues

---

## 3. API Documentation

### Web Interface

Visit **http://localhost:3264/api-docs** for complete interactive API documentation powered by Swagger UI.

The documentation includes:

- All available endpoints with descriptions
- Request/response schemas
- Interactive testing interface
- Example requests and responses
- Authentication requirements

### Authorization via API Keys

> ⚠️ **New:** Authorization now uses environment variables for serverless compatibility.

**Option 1: Environment Variable (Recommended for deployment)**

Set the `API_KEYS` environment variable in your `.env` file:

```bash
API_KEYS=key1,key2,key3
```

**Option 2: Legacy File (Optional, for backward compatibility)**

1. **File `src/Authorization.txt`**
   - Created automatically on first run _if it doesn't exist_.
   - One token **per line**. Empty lines and lines starting with `#` are ignored.

2. **Disable authorization** – leave both `API_KEYS` empty and the file empty.

3. **Client-side verification**

   Send HTTP header:

   ```http
   Authorization: Bearer <your_token>
   ```

   cURL example:

   ```bash
   curl -X POST http://localhost:3264/api/chat \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer my-secret-token-123" \
        -d '{"message":"Hello"}'
   ```

---

## 4. Token Management

### Environment Variable Configuration (Recommended)

The easiest way to configure tokens is via environment variables in your `.env` file:

**Single Token:**

```bash
QWEN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Multiple Tokens (Load Balancing):**

```bash
QWEN_TOKENS=token1,token2,token3
```

**Features:**

- \u2705 Automatic load balancing across multiple tokens
- \u2705 Rate limit handling (24-hour cooldown)
- \u2705 Invalid token detection and rotation
- \u2705 Works without file system access

### Legacy Account Management (Optional)

For backward compatibility, you can still use file-based token storage via `npm run addToken` or the interactive menu. However, **environment variables are recommended** for deployment.

When starting `npm start` without `SKIP_ACCOUNT_MENU=true`, an interactive menu appears:

```
Account List:
 N | ID                | Status
 1 | acc_1752745840684 | ✅ OK
 2 | acc_1752745890062 | ❌ INVALID

=== Menu ===
1 - Add new account
2 - Re-login expired account
3 - Start proxy (default with Enter)
4 - Delete account
```

Statuses:

| Icon       | Meaning                                 | Behavior                                 |
| ---------- | --------------------------------------- | ---------------------------------------- |
| ✅ OK      | token active                            | used in rotation                         |
| ⏳ WAIT    | token temporarily blocked (RateLimited) | skipped until timeout expires            |
| ❌ INVALID | token expired (401 Unauthorized)        | unavailable, choose option 2 to re-login |

Menu items:

1. **Add new account** – browser opens, authorize, token will be saved.
2. **Re-login expired account** – choose needed ID, browser opens for re-login, status changes to ✅.
3. **Start proxy** – available if at least one ✅ or ⏳ status exists.
4. **Delete account** – completely removes token and session folder.

Files:

- `session/accounts/<id>/token.txt` – account token
- `session/tokens.json` – account and state registry
- `npm run auth` – separate script for managing accounts without starting server (same menu, plus CLI arguments `--list`, `--add`, `--relogin`, `--remove`)

---

## ⚙️ Environment Variables

| Variable            | Default Value | Purpose                                                               |
| ------------------- | ------------- | --------------------------------------------------------------------- |
| `PORT`              | `3264`        | HTTP server port                                                      |
| `HOST`              | `0.0.0.0`     | Server binding address                                                |
| `SKIP_ACCOUNT_MENU` | `false`       | When `true`, disables interactive startup menu (needed for Docker/CI) |

> `SKIP_ACCOUNT_MENU` is automatically activated in Docker Compose. If there are no valid tokens at startup, the server will exit with a prompt to run `npm run auth`.

---

Automatic rotation:

- Requests are distributed across tokens cyclically.
- On **429 RateLimited** response, token gets ⏳ WAIT for specified time.
- On **401 Unauthorized** response, token is marked ❌ INVALID.
- If all tokens are invalid – proxy exits, restart it and re-login.

---

## 4. Features

This project allows you to:

- Use Qwen AI models through local API
- Save dialog context between requests
- Manage dialogs via API
- Choose different Qwen models for response generation
- Send images for model analysis
- **🎨 Generate images from text descriptions (Text-to-Image)**
- **🎬 Generate videos from text descriptions (Text-to-Video)**
- Use OpenAI-compatible API with streaming mode support

---

## 🎨 Image & Video Generation

The proxy supports three types of content generation through the `chatType` parameter:

| Type         | Chat Type       | Description                | Response Method | Time    |
| ------------ | --------------- | -------------------------- | --------------- | ------- |
| **💬 Text**  | `t2t` (default) | Standard conversational AI | Streaming SSE   | ~2-5s   |
| **🖼️ Image** | `t2i`           | Text-to-Image generation   | Streaming SSE   | ~10-20s |
| **🎬 Video** | `t2v`           | Text-to-Video generation   | Task polling    | ~30-60s |

### Quick Examples

**Text Chat (default):**

```javascript
POST /api/chat
{
  "message": "What is artificial intelligence?",
  "model": "qwen-max-latest"
}
```

**Image Generation:**

```javascript
POST /api/chat
{
  "message": "A beautiful sunset over the ocean",
  "chatType": "t2i",
  "size": "16:9"
}
```

**Video Generation:**

```javascript
POST /api/chat
{
  "message": "Ocean waves gently rolling onto a beach",
  "chatType": "t2v",
  "size": "16:9",
  "waitForCompletion": true  // false for client-side polling
}
```

**Polling Modes:**

- `waitForCompletion: true` (default) - Server polls, returns complete video URL
- `waitForCompletion: false` - Returns task_id immediately for client-side polling

### Response Formats

**Text/Image** (Streaming):

```json
{
  "choices": [
    {
      "message": {
        "content": "Response text or image URL"
      }
    }
  ],
  "chatId": "...",
  "parentId": "..."
}
```

**Video** (After polling):

```json
{
  "choices": [
    {
      "message": {
        "content": "https://cdn.qwenlm.ai/.../video.mp4"
      }
    }
  ],
  "video_url": "https://cdn.qwenlm.ai/.../video.mp4",
  "task_id": "..."
}
```

### Key Differences

- **Text & Image**: Use streaming (SSE) - immediate gradual response
- **Video**: Non-streaming with task polling
  - **Server-side** (default): Automatic polling, returns complete video URL (~30-60s wait)
  - **Client-side**: Returns task_id immediately, client polls `/api/tasks/status/:taskId`

**📖 For detailed documentation and examples, see: [IMAGE_VIDEO_GENERATION_GUIDE.md](IMAGE_VIDEO_GENERATION_GUIDE.md)**

---

## 5. API Reference

### 5.1 Main Endpoints

| Endpoint                    | Method | Description                                             |
| --------------------------- | ------ | ------------------------------------------------------- |
| `/api/chat`                 | POST   | Send message with `chatId` and `parentId` support       |
| `/api/chat/completions`     | POST   | OpenAI-compatible endpoint, returns `chatId`/`parentId` |
| `/api/models`               | GET    | Get list of available models                            |
| `/api/status`               | GET    | Check authorization and account status                  |
| `/api/files/upload`         | POST   | Upload image for use in requests                        |
| `/api/chats`                | POST   | Create new chat on Qwen servers                         |
| `/api/tasks/status/:taskId` | GET    | Check video generation task status (manual polling)     |

**⚠️ Removed Endpoints (v2):**

- `GET /api/chats` - chat list (now managed by Qwen servers)
- `GET /api/chats/:chatId` - chat history (now managed by Qwen servers)
- `DELETE /api/chats/:chatId` - delete chat
- `PUT /api/chats/:chatId/rename` - rename
- `POST /api/chats/cleanup` - auto-delete

_Reason: chats are now managed on Qwen servers_

### 5.2 Endpoint Selection

| Endpoint                    | Context Usage                                                                         | Request Format                                                  | Compatibility   |
| --------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------- |
| **`/api/chat`**             | Context managed via `chatId` + `parentId`. History stored on Qwen servers.            | Simplified `message` + `chatId` + `parentId`                    | Native to proxy |
| **`/api/chat/completions`** | Supports `chatId` + `parentId` in request. Returns them in response for continuation. | `messages` array (OpenAI format) + optional `chatId`/`parentId` | OpenAI SDK      |

### 5.3 Request Formats

#### 1. Simplified format with `message` parameter

```json
{
  "message": "Message text",
  "model": "qwen-max-latest",
  "chatId": "chat_identifier",
  "parentId": "response_id_from_previous_response"
}
```

#### 2. OpenAI API Compatible Format

```json
{
  "messages": [{ "role": "user", "content": "Hello, how are you?" }],
  "model": "qwen-max-latest",
  "chatId": "chat_identifier",
  "parentId": "response_id_from_previous_response"
}
```

### 5.4 Working with Context (API v2)

**New system:**

- History stored on Qwen servers, not locally
- Context managed via `chatId` + `parentId`
- `parentId` is the `response_id` from previous response

**Dialog example:**

```javascript
// 1. First message
const res1 = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({ message: "What is 2+2?" }),
});
const data1 = await res1.json();
// Response: { chatId: "abc-123", parentId: "xyz-789", ... }

// 2. Second message (with context)
const res2 = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    message: "And the result plus 3?",
    chatId: data1.chatId, // Same chat
    parentId: data1.parentId, // From previous response!
  }),
});
// Model remembers context and will answer "7"
```

### 5.5 System Instructions (System Messages)

**New in v2:** Support for system messages to configure model behavior!

System instructions are passed via the `role: "system"` field in the `messages` array. This allows you to set the model's context, communication style, behavior rules, etc.

**Example:**

```javascript
// Request with system instruction
const response = await fetch("/api/chat/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [
      {
        role: "system",
        content:
          "You are an experienced Python programmer. Answer briefly and provide code examples.",
      },
      {
        role: "user",
        content: "How to sort a list in Python?",
      },
    ],
    model: "qwen-max-latest",
  }),
});
```

**How it works:**

- `system` message is extracted from the array and passed as a separate parameter to Qwen API v2
- Can be used in both endpoints: `/api/chat` and `/api/chat/completions`
- System message applies to the entire chat and affects all subsequent responses

**Usage examples:**

```json
// 1. Role instruction
{
  "messages": [
    {"role": "system", "content": "You are a machine learning expert"},
    {"role": "user", "content": "Explain what gradient descent is"}
  ]
}

// 2. Response style
{
  "messages": [
    {"role": "system", "content": "Answer like a pirate"},
    {"role": "user", "content": "How are you?"}
  ]
}

// 3. Output format
{
  "messages": [
    {"role": "system", "content": "Always respond in JSON format"},
    {"role": "user", "content": "Give me information about Python"}
  ]
}
```

### 5.6 Working with Images

The proxy supports sending messages with images:

#### `message` format with image

```json
{
  "message": [
    {
      "type": "text",
      "text": "Describe the objects in this image"
    },
    {
      "type": "image",
      "image": "IMAGE_URL"
    }
  ],
  "model": "qwen-vl-max",
  "chatId": "chat_identifier",
  "parentId": "response_id"
}
```

### 5.7 File Upload

#### Image Upload

```
POST http://localhost:3264/api/files/upload
```

**Request format:** `multipart/form-data`

**Parameters:**

- `file` - image file (supported formats: jpg, jpeg, png, gif, webp)

**cURL usage example:**

```bash
curl -X POST http://localhost:3264/api/files/upload \
  -F "file=@/path/to/image.jpg"
```

**Response example:**

```json
{
  "imageUrl": "https://cdn.qwenlm.ai/user-id/file-id_filename.jpg?key=..."
}
```

#### Getting Image URL

To send images via API proxy, you must first get the image URL. This can be done in two ways:

##### Method 1: Upload via API Proxy

Send a POST request to the `/api/files/upload` endpoint to upload an image, as described above.

##### Method 2: Get URL via Qwen Web Interface

1. Upload image in the official Qwen web interface (<https://chat.qwen.ai/>)
2. Open browser developer tools (F12 or Ctrl+Shift+I)
3. Go to "Network" tab
4. Find the request to Qwen API containing your image (usually a GetsToken request)
5. In the request body, find the image URL that looks like: `https://cdn.qwenlm.ai/user-id/file-id_filename.jpg?key=...`
6. Copy this URL for use in your API request

### 5.8 Dialog Management

#### Create New Dialog

```
POST http://localhost:3264/api/chats
```

**Request body:**

```json
{
  "name": "Dialog name"
}
```

**Response:**

```json
{
  "chatId": "unique_identifier"
}
```

#### Get List of All Dialogs

```
GET http://localhost:3264/api/chats
```

#### Get Dialog History

```
GET http://localhost:3264/api/chats/:chatId
```

#### Delete Dialog

```
DELETE http://localhost:3264/api/chats/:chatId
```

#### Rename Dialog

```
PUT http://localhost:3264/api/chats/:chatId/rename
```

**Request body:**

```json
{
  "name": "New chat name"
}
```

#### Automatic Dialog Deletion

```
POST http://localhost:3264/api/chats/cleanup
```

**Request body** (all parameters optional):

```json
{
  "olderThan": 604800000, // Delete chats older than specified time (in ms), e.g., 7 days
  "userMessageCountLessThan": 3, // Delete chats with less than 3 user messages
  "messageCountLessThan": 5, // Delete chats with less than 5 total messages
  "maxChats": 50 // Keep only 50 newest chats
}
```

---

## 6. Usage Examples

### Text Requests

<details>
<summary>▶️ Simple text request example</summary>

```bash
curl -X POST http://localhost:3264/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is artificial intelligence?",
    "model": "qwen-max-latest"
  }'
```

</details>

<details>
<summary>▶️ Official API format request example</summary>

```bash
curl -X POST http://localhost:3264/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is artificial intelligence?"}
    ],
    "model": "qwen-max-latest"
  }'
```

</details>

### Requests with Images

<details>
<summary>▶️ Upload image and send request with it example</summary>

```bash
# Step 1: Upload image
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3264/api/files/upload \
  -F "file=@/path/to/image.jpg")

# Step 2: Extract image URL
IMAGE_URL=$(echo $UPLOAD_RESPONSE | grep -o '"imageUrl":"[^"]*"' | sed 's/"imageUrl":"//;s/"//')

# Step 3: Send request with image
curl -X POST http://localhost:3264/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": [
      { "type": "text", "text": "Describe the objects in this image" },
      { "type": "image", "image": "'$IMAGE_URL'" }
    ],
    "model": "qwen3-235b-a22b"
  }'
```

</details>

### Examples via Postman

<details>
<summary>▶️ Step-by-step guide via Postman</summary>

1. **Upload Image**:
   - Create new POST request to `http://localhost:3264/api/files/upload`
   - Select "Body" tab
   - Select "form-data" type
   - Add key "file" and select "File" type
   - Upload image by clicking "Select Files" button
   - Click "Send"

   Response will contain image URL:

   ```json
   {
     "imageUrl": "https://cdn.qwenlm.ai/user-id/file-id_filename.jpg?key=..."
   }
   ```

2. **Use Image in Request**:
   - Create new POST request to `http://localhost:3264/api/chat`
   - Select "Body" tab
   - Select "raw" type and "JSON" format
   - Paste the following JSON, replacing `IMAGE_URL` with the obtained URL:

   ```json
   {
     "message": [
       {
         "type": "text",
         "text": "Describe the objects in this image"
       },
       {
         "type": "image",
         "image": "IMAGE_URL"
       }
     ],
     "model": "qwen3-235b-a22b"
   }
   ```

   - Click "Send"

#### Using OpenAI-compatible Endpoint

1. **Request via OpenAI-compatible endpoint**:
   - Create new POST request to `http://localhost:3264/api/chat/completions`
   - Select "Body" tab
   - Select "raw" type and "JSON" format
   - Paste the following JSON, replacing `IMAGE_URL` with the obtained URL:

   ```json
   {
     "messages": [
       {
         "role": "user",
         "content": [
           {
             "type": "text",
             "text": "Describe what is shown in this image?"
           },
           {
             "type": "image",
             "image": "IMAGE_URL"
           }
         ]
       }
     ],
     "model": "qwen3-235b-a22b"
   }
   ```

   - Click "Send"

2. **Request with streaming mode**:
   - Use same URL and request body, but add parameter `"stream": true`
   - Note: for correct stream display in Postman, check "Preserve log" option in console

</details>

---

## 🔄 Working with Context

The system automatically saves dialog history and sends it in each request to Qwen API. This allows models to consider previous messages when generating responses.

### Context Working Sequence

1. **First request** (without specifying `chatId`):

```json
{
  "message": "Hello, what's your name?"
}
```

2. **Response** (contains `chatId`):

```json
{
  "chatId": "abcd-1234-5678",
  "choices": [...]
}
```

3. **Subsequent requests** (with specified obtained `chatId`):

```json
{
  "message": "What is 2+2?",
  "chatId": "abcd-1234-5678"
}
```

---

## 🔌 OpenAI API Compatibility

The proxy supports an endpoint compatible with OpenAI API for connecting clients that work with OpenAI API:

```
POST /api/chat/completions
```

### Operation Features

1. **Create new chat for each request:** Each request to `/chat/completions` creates a new chat in the system named "OpenAI API Chat".

2. **Save full message history:** All messages from the request (including system, user, and assistant messages) are saved in chat history.

3. **System message support:** The proxy correctly processes and saves system messages (`role: "system"`), which are often used to configure model behavior.

**Request example with system message:**

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a JavaScript expert. Answer only questions about JavaScript."
    },
    { "role": "user", "content": "How to create a class in JavaScript?" }
  ],
  "model": "qwen-max-latest"
}
```

### Streaming Mode Support

The proxy supports streaming response mode, which allows receiving responses in parts in real-time:

```json
{
  "messages": [{ "role": "user", "content": "Write a long story about space" }],
  "model": "qwen-max-latest",
  "stream": true
}
```

When using streaming mode, the response will be returned gradually in Server-Sent Events (SSE) format, compatible with OpenAI API.

### Usage Examples with OpenAI SDK

<details>
<summary>▶️ OpenAI Node.js SDK usage example</summary>

```javascript
// OpenAI Node.js SDK usage example
import OpenAI from "openai";
import fs from "fs";
import axios from "axios";

const openai = new OpenAI({
  baseURL: "http://localhost:3264/api", // Proxy base URL
  apiKey: "dummy-key", // Real key not required, but field is mandatory for library
});

// Request without streaming
const completion = await openai.chat.completions.create({
  messages: [{ role: "user", content: "Hello, how are you?" }],
  model: "qwen-max-latest", // Qwen model to use
});

console.log(completion.choices[0].message);

// Request with streaming
const stream = await openai.chat.completions.create({
  messages: [{ role: "user", content: "Tell a long story about space" }],
  model: "qwen-max-latest",
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}

// Upload and use image
async function uploadAndAnalyzeImage(imagePath) {
  // Upload image via API proxy
  const formData = new FormData();
  formData.append("file", fs.createReadStream(imagePath));

  const uploadResponse = await axios.post(
    "http://localhost:3264/api/files/upload",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

  const imageUrl = uploadResponse.data.imageUrl;

  // Create request with image
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Describe what is shown in this image?" },
          { type: "image", image: imageUrl },
        ],
      },
    ],
    model: "qwen3-235b-a22b",
  });

  console.log(completion.choices[0].message.content);
}

// Usage: uploadAndAnalyzeImage('./image.jpg');
```

</details>

> **Compatibility Limitations:**
>
> 1. Some OpenAI-specific parameters (e.g., `logprobs`, `functions`, etc.) are not supported.
> 2. Streaming speed may differ from original OpenAI API.

---

## 🔧 Implementation Features

### Browser Emulation

- Uses Puppeteer for browser automation
- Session cookies stored in the `session/` folder
- Automatic page refresh upon authorization token expiration

### Context Management

- Dialog history automatically saved locally
- Context sent with each request to maintain conversation coherence
- Support for creating, deleting, and managing chats

### Model Support

The proxy supports various Qwen models:

- `qwen-max-latest` - Latest version of flagship model
- `qwen-turbo-latest` - Fast lightweight model
- `qwen-plus-latest` - Balanced model
- `qwen-vl-max` - Vision model for image analysis
- `qwen3-235b-a22b` - Advanced multimodal model
- And others

### Error Handling

- Automatic retry on temporary failures
- Detailed error logging
- Support for multiple accounts with automatic rotation

---

## � Additional Documentation

For detailed information about specific topics:

- **[Deployment Guide](DEPLOYMENT.md)** - Complete guide for deploying to Railway, Render, AWS Lambda, Google Cloud Run, Vercel, Cloudflare Workers, and Docker
- **[Architecture Documentation](ARCHITECTURE.md)** - Technical architecture, component design, request flows, security model, and scalability considerations
- **[Image & Video Generation Guide](IMAGE_VIDEO_GENERATION_GUIDE.md)** - Detailed guide for text-to-image (t2i) and text-to-video (t2v) generation features
- **[Interactive API Documentation](http://localhost:3264/api-docs)** - Swagger UI for testing endpoints (available when server is running)

---

## �📄 License

This project is provided as-is for educational purposes only.

## ⚠️ Disclaimer

This is an unofficial proxy and is not affiliated with or endorsed by Qwen AI. Use at your own risk.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Note:** This proxy requires having a valid Qwen account. Make sure to comply with Qwen's Terms of Service when using this proxy.
