# Image and Video Generation Guide

## Overview

The Qwen API Proxy supports three content generation types through the `chatType` parameter:

- **Text Chat (t2t)**: Standard conversational AI - **Default**, streaming response
- **Image Generation (t2i)**: Text-to-Image - **Streaming** response (~10-20s)
- **Video Generation (t2v)**: Text-to-Video - **Task polling** system (~30-60s)

**🚀 File Uploads**: All file uploads use **in-memory storage** (no disk writes) with direct buffer transfer to Alibaba OSS. Supports up to 25MB files, perfect for serverless deployment.

## 🔑 Key Differences

| Feature              | Text (t2t)          | Image (t2i)                  | Video (t2v)                     |
| -------------------- | ------------------- | ---------------------------- | ------------------------------- |
| **Request Type**     | `stream: true`      | `stream: true`               | `stream: false`                 |
| **Response Method**  | Streaming SSE       | Streaming SSE                | Task polling                    |
| **Time to Complete** | ~2-5 seconds        | ~10-20 seconds               | ~30-60 seconds                  |
| **URL Location**     | N/A (text response) | `choices[0].message.content` | `content` after polling         |
| **Server Polling**   | No                  | No                           | **Yes - Automatic**             |
| **Task ID**          | No                  | No                           | Yes (from `extra.wanx.task_id`) |

---

## 🖼️ Image Generation (t2i)

### How It Works

1. Client sends POST request with `chatType: "t2i"`
2. Server creates chat with `stream: true`
3. Server receives **streaming SSE response** with image URL
4. Image URL arrives in `content` field of streaming chunks
5. Server returns complete URL to client (~10-20 seconds)

### Request Format

```javascript
POST /api/chat
Content-Type: application/json

{
  "message": "Your image description prompt",
  "model": "qwen-max-latest",
  "chatType": "t2i",
  "size": "16:9"  // Optional: aspect ratio
}
```

### Parameters

| Parameter  | Required    | Description                                | Example Values                               |
| ---------- | ----------- | ------------------------------------------ | -------------------------------------------- |
| `message`  | ✅ Yes      | Text description of the image to generate  | "A sunset over the ocean with purple clouds" |
| `model`    | ⚠️ Optional | Model to use (defaults to qwen-max-latest) | `qwen-max-latest`, `qwen-plus-latest`        |
| `chatType` | ✅ Yes      | Must be `"t2i"` for image generation       | `"t2i"`                                      |
| `size`     | ⚠️ Optional | Aspect ratio in format `width:height`      | `"16:9"`, `"9:16"`, `"1:1"`, `"4:3"`         |
| `chatId`   | ⚠️ Optional | Existing chat ID to continue context       | From previous response                       |
| `parentId` | ⚠️ Optional | Parent message ID for conversation flow    | From previous response                       |

### Expected Response

Image generation uses **streaming response** (similar to text chat):

```json
{
  "id": "response-uuid-here",
  "object": "chat.completion",
  "created": 1771318618,
  "model": "qwen-max-latest",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "https://cdn.qwenlm.ai/output/.../t2i/.../image.png?key=..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "input_tokens": 0,
    "output_tokens": 0,
    "characters": 0,
    "width": 2688,
    "image_count": 1,
    "height": 1536
  },
  "response_id": "response-uuid-here",
  "chatId": "chat-uuid-here",
  "parentId": "parent-uuid-here"
}
```

**Key Points:**

- The `content` field contains the **direct URL(s) to generated image(s)**
- May contain multiple URLs concatenated if multiple images generated
- Image URLs are typically hosted on `cdn.qwenlm.ai`
- Response includes `chatId` and `parentId` for continuing the conversation
- Uses streaming, so response arrives gradually over ~10-20 seconds
- `usage` includes image dimensions and count

### Example Usage

#### Using fetch (JavaScript)

```javascript
const response = await fetch("http://localhost:3264/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "A beautiful landscape with mountains and a lake at sunrise",
    model: "qwen-vl-max-latest",
    chatType: "t2i",
    size: "1024*1024",
  }),
});

const data = await response.json();
const imageUrl = data.choices[0].message.content;
console.log("Generated Image:", imageUrl);
```

#### Using cURL

```bash
curl -X POST http://localhost:3264/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "A futuristic city at night with neon lights",
    "model": "qwen-vl-max-latest",
    "chatType": "t2i",
    "size": "1920*1080"
  }'
```

#### Using PowerShell

```powershell
$body = @{
    message = "A cute cat sitting on a bookshelf"
    model = "qwen-vl-max-latest"
    chatType = "t2i"
    size = "1024*1024"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3264/api/chat" `
    -Method Post -Body $body -ContentType "application/json"

$imageUrl = $response.choices[0].message.content
Write-Host "Image URL: $imageUrl"
```

---

## 🎬 Video Generation (t2v)

### How It Works

Video generation supports **two polling modes**:

#### 🔄 Mode 1: Server-Side Polling (Default)

**Best for:** Simple integrations, shorter videos (<2 min)

1. **Client sends request** → with `chatType: "t2v"` and `waitForCompletion: true` (default)
2. **Server creates task** → Qwen API returns `task_id` immediately
3. **Server polls automatically** → Checks status every 2 seconds for up to 3 minutes (90 attempts)
4. **Task completes** → Returns complete video URL to client
5. **Client receives** → Ready-to-use video URL in response

**Pros:** Simple, single request, no client logic needed  
**Cons:** Long HTTP connection, fixed 3-minute timeout

#### ⚡ Mode 2: Client-Side Polling (Manual)

**Best for:** Long videos (>2 min), custom timeouts, UI progress tracking

1. **Client sends request** → with `chatType: "t2v"` and `waitForCompletion: false`
2. **Server creates task** → Returns `task_id` immediately (~1-2 seconds)
3. **Client polls task status** → GET `/api/tasks/status/:taskId` every 2-5 seconds
4. **Task completes** → Client receives video URL from polling endpoint
5. **Client handles** → Custom retry logic, timeout, progress display

**Pros:** Flexible timeout, progress tracking, better for long videos  
**Cons:** Requires client-side polling logic

### Request Format

```javascript
POST /api/chat
Content-Type: application/json

{
  "message": "Your video description prompt",
  "model": "qwen-vl-max-latest",
  "chatType": "t2v",
  "size": "16:9"  // Optional: aspect ratio (not pixel dimensions!)
}
```

### Parameters

| Parameter           | Required    | Description                                   | Example Values                                          |
| ------------------- | ----------- | --------------------------------------------- | ------------------------------------------------------- |
| `message`           | ✅ Yes      | Text description of the video to generate     | "A serene forest with sunlight filtering through trees" |
| `model`             | ✅ Yes      | Model to use for generation                   | `qwen-vl-max-latest`                                    |
| `chatType`          | ✅ Yes      | Must be `"t2v"` for video generation          | `"t2v"`                                                 |
| `size`              | ⚠️ Optional | Video aspect ratio (default: `"16:9"`)        | `"16:9"`, `"9:16"`, `"1:1"`, `"4:3"`                    |
| `waitForCompletion` | ⚠️ Optional | Server polls until complete (default: `true`) | `true` (server polls), `false` (return task_id)         |
| `chatId`            | ⚠️ Optional | Existing chat ID to continue context          | From previous response                                  |
| `parentId`          | ⚠️ Optional | Parent message ID for conversation flow       | From previous response                                  |

**Important Notes:**

- Video size uses **aspect ratio format** (e.g., `"16:9"`) not pixel dimensions
- `waitForCompletion=true`: Server polls automatically (simple, fixed 3-min timeout)
- `waitForCompletion=false`: Returns task_id immediately (flexible, client controls polling)

### Expected Response

Video generation uses **task polling system** (non-streaming):

```json
{
  "id": "task-uuid-here",
  "object": "chat.completion",
  "created": 1771318618,
  "model": "qwen-vl-max-latest",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "https://cdn.qwenlm.ai/output/.../t2v/.../video.mp4?key=..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "output_tokens": 0,
    "total_tokens": 0
  },
  "response_id": "task-uuid-here",
  "chatId": "chat-uuid-here",
  "parentId": "task-uuid-here",
  "task_id": "task-uuid-here",
  "video_url": "https://cdn.qwenlm.ai/output/.../t2v/.../video.mp4?key=..."
}
```

**Key Points:**

- The `content` field contains the **direct URL to the generated video**
- Video URL is typically hosted on `cdn.qwenlm.ai`
- Response includes both `video_url` (dedicated field) and in `content`
- Uses **task polling**: server polls status every 2 seconds for up to 60 attempts (2 minutes)
- Video generation typically takes **30-120 seconds**
- Task ID is extracted from `response.data.messages[0].extra.wanx.task_id`
- Video generation typically takes **30-120 seconds**

### How Video Polling Works

1. **Initial Request** → Server creates generation task
2. **Task Created** → Returns task ID immediately
3. **Background Polling** → Server checks status every 2 seconds
4. **Task Complete** → Returns video URL when ready
5. **Timeout** → After 2 minutes, returns error if not completed

### Example Usage

#### ✅ Mode 1: Server-Side Polling (waitForCompletion=true, default)

Simple single request - server handles all polling:

```javascript
// Server waits for video completion (up to 3 minutes)
const response = await fetch("http://localhost:3264/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "A calm ocean with gentle waves at sunset",
    model: "qwen-vl-max-latest",
    chatType: "t2v",
    size: "16:9",
    waitForCompletion: true, // Can be omitted (default)
  }),
});

const data = await response.json();

if (data.error) {
  console.error("Video generation failed:", data.error);
} else {
  const videoUrl = data.video_url || data.choices[0].message.content;
  console.log("Generated Video:", videoUrl);
}
```

#### ⚡ Mode 2: Client-Side Polling (waitForCompletion=false)

Two-step process - get task_id, then poll manually:

```javascript
// Step 1: Create video generation task (returns immediately)
const taskResponse = await fetch("http://localhost:3264/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "A serene forest with sunlight filtering through trees",
    model: "qwen-vl-max-latest",
    chatType: "t2v",
    size: "16:9",
    waitForCompletion: false, // Return task_id immediately
  }),
});

const taskData = await taskResponse.json();
console.log("Task created:", taskData.task_id);
console.log("Status:", taskData.status); // "processing"

// Step 2: Poll task status until complete
const taskId = taskData.task_id;
let videoUrl = null;
let attempts = 0;
const maxAttempts = 90; // 3 minutes max (customize as needed)

while (attempts < maxAttempts && !videoUrl) {
  attempts++;
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

  const statusResponse = await fetch(
    `http://localhost:3264/api/tasks/status/${taskId}`,
  );
  const statusData = await statusResponse.json();

  const status = statusData.task_status || statusData.status;
  console.log(`Attempt ${attempts}: ${status}`);

  if (status === "completed" || status === "succeeded") {
    videoUrl = statusData.content || statusData.data?.content;
    console.log("Video ready:", videoUrl);
    break;
  } else if (status === "failed" || status === "error") {
    console.error("Task failed");
    break;
  }
}
```

#### cURL Examples

**Server-side polling:**

```bash
curl -X POST http://localhost:3264/api/chat \
  --max-time 200 \
  -H "Content-Type: application/json" \
  -d '{
    "message": "A bird flying over a forest",
    "model": "qwen-vl-max-latest",
    "chatType": "t2v",
    "size": "16:9"
  }'
```

**Client-side polling:**

```bash
# Step 1: Create task
TASK_ID=$(curl -X POST http://localhost:3264/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Ocean waves at sunset",
    "model": "qwen-vl-max-latest",
    "chatType": "t2v",
    "size": "16:9",
    "waitForCompletion": false
  }' | jq -r '.task_id')

echo "Task ID: $TASK_ID"

# Step 2: Poll status
while true; do
  STATUS=$(curl -s "http://localhost:3264/api/tasks/status/$TASK_ID" | jq -r '.task_status')
  echo "Status: $STATUS"
  [ "$STATUS" = "completed" ] && break
  sleep 2
done
```

---

## 📊 Comparison: Image vs Video

| Feature                 | Image (t2i)                  | Video (t2v)                  |
| ----------------------- | ---------------------------- | ---------------------------- |
| **Chat Type**           | `"t2i"`                      | `"t2v"`                      |
| **Response Method**     | Streaming                    | Task Polling                 |
| **Typical Duration**    | 10-30 seconds                | 30-120 seconds               |
| **Response Field**      | `choices[0].message.content` | `video_url` or `content`     |
| **File Format**         | Usually `.jpg` or `.png`     | Usually `.mp4`               |
| **Stream Parameter**    | `true` (auto)                | `false` (auto)               |
| **Polling Attempts**    | N/A                          | 60 attempts × 2s = 2 min max |
| **Recommended Timeout** | 30-60 seconds                | 120-180 seconds              |

---

## 🎯 Best Practices

### For Image Generation (t2i)

1. **Use descriptive prompts**: Include details about style, colors, mood, composition
   - ✅ Good: "A serene Japanese garden with cherry blossoms at sunrise, peaceful atmosphere"
   - ❌ Bad: "A garden"

2. **Recommended models**:
   - `qwen-vl-max-latest` - Best quality
   - `qwen3-vl-plus` - Faster, good quality

3. **Size recommendations** (aspect ratios):
   - Square: `"1:1"`
   - Landscape: `"16:9"`, `"4:3"`
   - Portrait: `"9:16"`, `"3:4"`

4. **Timeout**: Set client timeout to at least **60 seconds**

### For Video Generation (t2v)

1. **Use motion descriptions**: Describe movement and changes
   - ✅ Good: "Ocean waves gently rolling onto a sandy beach at sunset"
   - ❌ Bad: "A beach"

2. **Keep it simple**: Video generation works best with clear, focused scenes
   - Avoid complex multi-scene descriptions
   - Focus on one main action/movement

3. **Size recommendations** (aspect ratios):
   - Standard Landscape: `"16:9"` (default)
   - Portrait: `"9:16"`
   - Square: `"1:1"`
   - Classic: `"4:3"`

4. **Timeout**: Set client timeout to at least **180 seconds** (3 minutes)

5. **Patience**: Video generation takes longer - expect 1-2 minutes

---

## 🔍 Error Handling

### Common Errors

#### Timeout Errors

```json
{
  "error": "Task polling timeout exceeded",
  "status": "timeout",
  "chatId": "...",
  "task_id": "..."
}
```

**Solution**: Retry the request or increase timeout limits on client side

#### Task ID Not Found

```json
{
  "error": "Task ID not found in response",
  "chatId": "...",
  "rawResponse": {...}
}
```

**Solution**: Check Qwen API status, may be temporary issue

#### Rate Limit

```json
{
  "error": "RateLimited",
  "detail": "You've reached the upper limit for today's usage."
}
```

**Solution**: Wait until daily limit resets, or add more accounts

---

## 🧪 Testing Scripts

### Quick Test Script

```javascript
// Save as test-generation.js
const BASE_URL = "http://localhost:3264/api";

async function testImageGeneration() {
  console.log("Testing image generation...");
  const response = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "A majestic mountain landscape at sunset",
      model: "qwen-vl-max-latest",
      chatType: "t2i",
      size: "1024*1024",
    }),
  });

  const data = await response.json();
  console.log("Image URL:", data.choices[0].message.content);
}

async function testVideoGeneration() {
  console.log("Testing video generation (this takes 1-2 minutes)...");
  const response = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Gentle ocean waves on a beach",
      model: "qwen-vl-max-latest",
      chatType: "t2v",
      size: "720*480",
    }),
  });

  const data = await response.json();
  console.log("Video URL:", data.video_url || data.choices[0].message.content);
}

// Run tests
testImageGeneration().then(() => testVideoGeneration());
```

Run with:

```bash
node test-generation.js
```

---

## 📝 Notes

1. **URLs are temporary**: Generated image/video URLs may expire after some time
2. **Download recommended**: Save generated content locally if needed long-term
3. **Quality vs Speed**: Higher resolutions take longer to generate
4. **Concurrent requests**: Multiple generation requests work with multi-account system
5. **Context support**: Can use `chatId` and `parentId` to generate related images/videos

---

## 🔗 Related Endpoints

- **Text Chat**: `chatType: "t2t"` (default)
- **Image Analysis**: Use VL models with image in message array
- **File Upload**: `POST /api/files/upload` for uploading images to analyze

---

## ❓ FAQ

**Q: Can I generate multiple images at once?**  
A: Send multiple requests. The multi-account system handles concurrent requests.

**Q: What video formats are supported?**  
A: Output is typically MP4. Input prompt is text only.

**Q: Can I control video duration?**  
A: Currently not exposed in API. Videos are standard duration (typically 5-10 seconds).

**Q: Why is my request taking so long?**  
A: Video generation takes 1-2 minutes. Image generation is usually faster (10-30 seconds). Check server logs for progress.

**Q: Can I use custom models?**  
A: Use models listed in `GET /api/models`. VL (Vision-Language) models work best for generation.

---

**Last Updated:** 2026-02-17
