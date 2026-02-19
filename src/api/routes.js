// routes.js - API routes (no browser automation)
import express from 'express';
import { sendMessage, getAllModels, getApiKeys, createChatV2, pollTaskStatus, testToken } from './chat.js';
import { logInfo, logError, logDebug } from '../logger/index.js';
import { getMappedModel } from './modelMapping.js';
import { getStsToken, uploadFileToQwen } from './fileUpload.js';
import multer from 'multer';
import crypto from 'crypto';
import { listTokens, markInvalid, markRateLimited, markValid, hasValidTokens } from './tokenManager.js';

const router = express.Router();

// Configure multer for file uploads (memory storage - no disk writes)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB max size
});

function authMiddleware(req, res, next) {
    const apiKeys = getApiKeys();

    if (apiKeys.length === 0) {
        return next();
    }

    const authHeader = req.headers.authorization;
    const apiKeyHeaderPrefix = 'Bearer ';

    if (!authHeader || !authHeader.startsWith(apiKeyHeaderPrefix)) {
        logError('Missing or invalid authorization header');
        return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.substring(apiKeyHeaderPrefix.length).trim();

    if (!apiKeys.includes(token)) {
        logError('Invalid API key provided');
        return res.status(401).json({ error: 'Invalid token' });
    }

    next();
}

router.use(authMiddleware);
router.use((req, res, next) => {
    req.url = req.url
        .replace(/\/v[12](?=\/|$)/g, '')
        .replace(/\/+/g, '/');
    next();
});

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Send a chat message (Text/Image/Video)
 *     description: |
 *       **Universal endpoint for all Qwen AI features:**
 *       
 *       - **Text Chat (t2t)**: Regular conversational AI
 *       - **Image Generation (t2i)**: Generate images from text descriptions
 *       - **Video Generation (t2v)**: Create videos from text prompts
 *       
 *       Use the `chatType` parameter to select the mode:
 *       - `"t2t"` (default) - Text-to-text chat
 *       - `"t2i"` - Text-to-image generation
 *       - `"t2v"` - Text-to-video generation
 *       
 *       **Examples:**
 *       ```json
 *       // Text chat
 *       {"message": "Hello!", "chatType": "t2t"}
 *       
 *       // Image generation
 *       {"message": "A cat on the moon", "chatType": "t2i", "size": "1024x1024"}
 *       
 *       // Video generation
 *       {"message": "A bird flying over mountains", "chatType": "t2v", "size": "1280x720"}
 *       ```
 *     tags:
 *       - Chat
 *       - Image Generation
 *       - Video Generation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatRequest'
 *           examples:
 *             textChat:
 *               summary: Text chat (t2t)
 *               value:
 *                 message: "Hello! How are you?"
 *                 model: "qwen-max-latest"
 *                 chatType: "t2t"
 *             imageGeneration:
 *               summary: Image generation (t2i)
 *               value:
 *                 message: "A futuristic city with flying cars at sunset"
 *                 model: "qwen-max-latest"
 *                 chatType: "t2i"
 *                 size: "1024x1024"
 *             videoGeneration:
 *               summary: Video generation (t2v)
 *               value:
 *                 message: "A peaceful ocean scene with waves crashing on shore"
 *                 model: "qwen-max-latest"
 *                 chatType: "t2v"
 *                 size: "1280x720"
 *                 waitForCompletion: true
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/chat', async (req, res) => {
    try {
        const { message, messages, model, chatId, parentId, chatType, size, waitForCompletion } = req.body;

        // Support both message and messages for compatibility
        let messageContent = message;
        let systemMessage = null;

        // If messages parameter is specified (plural), use it with priority
        if (messages && Array.isArray(messages)) {
            // Extract system message if present
            const systemMsg = messages.find(msg => msg.role === 'system');
            if (systemMsg) {
                systemMessage = systemMsg.content;
            }

            // Convert messages format to our proxy's message format
            if (messages.length > 0) {
                const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
                if (lastUserMessage) {
                    if (Array.isArray(lastUserMessage.content)) {
                        messageContent = lastUserMessage.content;
                    } else {
                        messageContent = lastUserMessage.content;
                    }
                }
            }
        }

        if (!messageContent) {
            logError('Request without message');
            return res.status(400).json({ error: 'Message not specified' });
        }

        logInfo(`Received request: ${typeof messageContent === 'string' ? messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : '') : 'Complex message'}`);
        if (systemMessage) {
            logInfo(`System message: ${systemMessage.substring(0, 50)}${systemMessage.length > 50 ? '...' : ''}`);
        }
        if (chatId) {
            logInfo(`Using chatId: ${chatId}, parentId: ${parentId || 'null'}`);
        }

        let mappedModel = model || "qwen-max-latest";
        if (model) {
            mappedModel = getMappedModel(model);
            if (mappedModel !== model) {
                logInfo(`Model "${model}" replaced with "${mappedModel}"`);
            }
        }
        logInfo(`Using model: ${mappedModel}`);
        if (chatType) {
            const typeLabels = { t2t: 'text', t2i: 'image', t2v: 'video' };
            const typeLabel = typeLabels[chatType] || chatType;
            logInfo(`Chat type: ${chatType} (${typeLabel})${size ? `, size: ${size}` : ''}`);
        }

        const result = await sendMessage(messageContent, mappedModel, chatId, parentId, null, null, null, systemMessage, chatType || "t2t", size, waitForCompletion !== false);

        if (result.choices && result.choices[0] && result.choices[0].message) {
            const responseLength = result.choices[0].message.content ? result.choices[0].message.content.length : 0;
            logInfo(`Response successfully generated for request, response length: ${responseLength}`);
        } else if (result.error) {
            logInfo(`Error received in response: ${result.error}`);
        }

        res.json(result);
    } catch (error) {
        logError('Error processing request', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/models:
 *   get:
 *     summary: List available models
 *     description: Get a list of all available Qwen AI models
 *     tags:
 *       - Models
 *     responses:
 *       200:
 *         description: List of available models
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModelsResponse'
 */
router.get('/models', async (req, res) => {
    try {
        logInfo('Request to get list of models');
        const modelsRaw = getAllModels();


        const openAiModels = {
            object: 'list',
            data: modelsRaw.models.map(m => ({
                id: m.id || m.name || m,
                object: 'model',
                created: 0,
                owned_by: 'openai',
                permission: []
            }))
        };

        logInfo(`Returned ${openAiModels.data.length} models (OpenAI format)`);
        res.json(openAiModels);
    } catch (error) {
        logError('Error getting list of models', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get token status
 *     description: Check the status of all configured authentication tokens
 *     tags:
 *       - Status
 *     responses:
 *       200:
 *         description: Token status information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusResponse'
 */
router.get('/status', async (req, res) => {
    try {
        logInfo('Status check requested');

        const tokens = listTokens();
        const accounts = await Promise.all(tokens.map(async t => {
            const accInfo = { 
                id: t.id, 
                name: t.name || 'Unknown',
                status: 'UNKNOWN', 
                resetAt: t.resetAt || null,
                invalid: t.invalid || false
            };

            if (t.invalid) {
                accInfo.status = 'INVALID';
                return accInfo;
            }

            if (t.resetAt) {
                const resetTime = new Date(t.resetAt).getTime();
                if (resetTime > Date.now()) {
                    accInfo.status = 'RATE_LIMITED';
                    return accInfo;
                }
            }

            const testResult = await testToken(t.token);
            if (testResult) {
                accInfo.status = 'OK';
                if (t.invalid || t.resetAt) markValid(t.id);
            } else {
                accInfo.status = 'INVALID';
                markInvalid(t.id);
            }
            return accInfo;
        }));

        const hasValid = accounts.some(acc => acc.status === 'OK');

        res.json({
            authenticated: hasValid,
            totalAccounts: accounts.length,
            validAccounts: accounts.filter(acc => acc.status === 'OK').length,
            message: hasValid ? 'Tokens available' : 'No valid tokens available',
            accounts
        });
    } catch (error) {
        logError('Error checking status', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get token status
 *     description: Check the status of all configured authentication tokens
 *     tags:
 *       - Status
 *     responses:
 *       200:
 *         description: Token status information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusResponse'
 *//**
 * @swagger
 * /api/chats:
 *   post:
 *     summary: Create a new chat
 *     description: Creates a new chat session and returns chatId and parentId for subsequent messages
 *     tags:
 *       - Chat
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateChatRequest'
 *     responses:
 *       200:
 *         description: Chat created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateChatResponse'
 */
router.post('/chats', async (req, res) => {
    try {
        const { name, model } = req.body;
        const chatModel = model ? getMappedModel(model) : 'qwen-max-latest';
        logInfo(`Creating new chat${name ? ` with name: ${name}` : ''}, model: ${chatModel}`);
        
        const result = await createChatV2(chatModel, name || "New chat");
        
        if (result.error) {
            logError(`Chat creation error: ${result.error}`);
            return res.status(500).json({ error: result.error });
        }
        
        logInfo(`Created new chat v2 with ID: ${result.chatId}`);
        res.json({ chatId: result.chatId, success: true });
    } catch (error) {
        logError('Error creating chat', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/analyze/network', (req, res) => {
    try {
        return res.json({ success: true });
    } catch (error) {
        logError('Error analyzing network', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

/**
 * @swagger
 * /api/chat/completions:
 *   post:
 *     summary: OpenAI-compatible chat completions
 *     description: OpenAI-compatible endpoint for chat completions with the same request/response format
 *     tags:
 *       - Chat
 *       - OpenAI Compatible
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OpenAIChatRequest'
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 */
router.post('/chat/completions', async (req, res) => {
    try {
        const { messages, model, stream, tools, functions, tool_choice, chatId, parentId } = req.body;

        logInfo(`Received OpenAI-compatible request${stream ? ' (stream)' : ''}`);

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            logError('Request without messages');
            return res.status(400).json({ error: 'Messages not specified' });
        }

        // Extract system message if present
        const systemMsg = messages.find(msg => msg.role === 'system');
        const systemMessage = systemMsg ? systemMsg.content : null;

        const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
        if (!lastUserMessage) {
            logError('No user messages in request');
            return res.status(400).json({ error: 'No user messages in request' });
        }

        const messageContent = lastUserMessage.content;

        let mappedModel = model ? getMappedModel(model) : "qwen-max-latest";
        if (model && mappedModel !== model) {
            logInfo(`Model "${model}" replaced with "${mappedModel}"`);
        }
        logInfo(`Using model: ${mappedModel}`);

        if (systemMessage) {
            logInfo(`System message: ${systemMessage.substring(0, 50)}${systemMessage.length > 50 ? '...' : ''}`);
        }

        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const writeSse = (payload) => {
                res.write('data: ' + JSON.stringify(payload) + '\n\n');
            };

            writeSse({
                id: 'chatcmpl-stream',
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: mappedModel || 'qwen-max-latest',
                choices: [
                    { index: 0, delta: { role: 'assistant' }, finish_reason: null }
                ]
            });

            try {
                const combinedTools = tools || (functions ? functions.map(fn => ({ type: 'function', function: fn })) : null);
                const result = await sendMessage(messageContent, mappedModel, chatId, parentId, null, combinedTools, tool_choice, systemMessage);

                if (result.error) {
                    writeSse({
                        id: 'chatcmpl-stream',
                        object: 'chat.completion.chunk',
                        created: Math.floor(Date.now() / 1000),
                        model: mappedModel || 'qwen-max-latest',
                        choices: [
                            { index: 0, delta: { content: `Error: ${result.error}` }, finish_reason: null }
                        ]
                    });
                } else if (result.choices && result.choices[0] && result.choices[0].message) {
                    const content = String(result.choices[0].message.content || '');

                    const codePoints = Array.from(content);
                    const chunkSize = 16;
                    for (let i = 0; i < codePoints.length; i += chunkSize) {
                        const chunk = codePoints.slice(i, i + chunkSize).join('');
                        writeSse({
                            id: 'chatcmpl-stream',
                            object: 'chat.completion.chunk',
                            created: Math.floor(Date.now() / 1000),
                            model: mappedModel || 'qwen-max-latest',
                            choices: [
                                { index: 0, delta: { content: chunk }, finish_reason: null }
                            ]
                        });

                        await new Promise(resolve => setTimeout(resolve, 20));
                    }
                }

                writeSse({
                    id: 'chatcmpl-stream',
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: mappedModel || 'qwen-max-latest',
                    choices: [
                        { index: 0, delta: {}, finish_reason: 'stop' }
                    ]
                });
                res.write('data: [DONE]\n\n');
                res.end();

            } catch (error) {
                logError('Error processing streaming request', error);
                writeSse({
                    id: 'chatcmpl-stream',
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: mappedModel || 'qwen-max-latest',
                    choices: [
                        { index: 0, delta: { content: 'Internal server error' }, finish_reason: 'stop' }
                    ]
                });
                res.write('data: [DONE]\n\n');
                res.end();
            }
        } else {
            const combinedTools = tools || (functions ? functions.map(fn => ({ type: 'function', function: fn })) : null);
            const { chatType, size, waitForCompletion } = req.body;
            const result = await sendMessage(messageContent, mappedModel, chatId, parentId, null, combinedTools, tool_choice, systemMessage, chatType || "t2t", size, waitForCompletion !== false);

            if (result.error) {
                return res.status(500).json({
                    error: { message: result.error, type: "server_error" }
                });
            }

            const openaiResponse = {
                id: result.id || "chatcmpl-" + Date.now(),
                object: "chat.completion",
                created: Math.floor(Date.now() / 1000),
                model: result.model || mappedModel || "qwen-max-latest",
                choices: result.choices || [{
                    index: 0,
                    message: {
                        role: "assistant",
                        content: result.choices?.[0]?.message?.content || ""
                    },
                    finish_reason: "stop"
                }],
                usage: result.usage || {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0
                },
                chatId: result.chatId,
                parentId: result.parentId
            };

            res.json(openaiResponse);
        }
    } catch (error) {
        logError('Error processing request', error);
        res.status(500).json({ error: { message: 'Internal server error', type: "server_error" } });
    }
});

// New route for getting STS token
router.post('/files/getstsToken', async (req, res) => {
    try {
        logInfo(`Request to get STS token: ${JSON.stringify(req.body)}`);

        const fileInfo = req.body;
        if (!fileInfo || !fileInfo.filename || !fileInfo.filesize || !fileInfo.filetype) {
            logError('Invalid file data');
            return res.status(400).json({ error: 'Invalid file data' });
        }

        const stsToken = await getStsToken(fileInfo);
        res.json(stsToken);
    } catch (error) {
        logError('Error getting STS token', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route for file upload - working
router.post('/files/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            logError('File was not uploaded');
            return res.status(400).json({ error: 'File was not uploaded' });
        }

        logInfo(`File received in memory: ${req.file.originalname} (${req.file.size} bytes)`);

        // Upload file buffer directly to Qwen OSS storage (no disk write)
        const result = await uploadFileToQwen({
            buffer: req.file.buffer,
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        if (result.success) {
            logInfo(`File successfully uploaded to OSS: ${result.fileName}`);
            res.json({
                success: true,
                file: {
                    name: result.fileName,
                    url: result.url,
                    fileId: result.fileId,
                    size: req.file.size,
                    type: req.file.mimetype
                }
            });
        } else {
            logError(`Error uploading file to OSS: ${result.error}`);
            res.status(500).json({ error: 'Error uploading file' });
        }
    } catch (error) {
        logError('Error uploading file', error);

        res.status(500).json({ error: 'Internal server error' });
    }
});

// Task status checking endpoint for video/image generation polling
router.get('/tasks/status/:taskId', authMiddleware, async (req, res) => {
    try {
        const { taskId } = req.params;
        
        if (!taskId) {
            return res.status(400).json({ error: 'Task ID is required' });
        }
        
        logInfo(`Request for task status: ${taskId}`);
        
        const browserContext = getBrowserContext();
        if (!browserContext) {
            logError('Browser not initialized');
            return res.status(503).json({ error: 'Browser not initialized' });
        }
        
        // Get a page from the pool
        const { pagePool, extractAuthToken } = await import('./chat.js');
        const page = await pagePool.getPage(browserContext);
        
        // Get auth token
        let token = await extractAuthToken(browserContext, false);
        if (!token) {
            pagePool.releasePage(page);
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Poll task status (single check, no retry)
        const taskResult = await pollTaskStatus(taskId, page, token, 1, 0);
        
        // Release page back to pool
        pagePool.releasePage(page);
        
        if (taskResult.success) {
            return res.json({
                task_id: taskId,
                status: taskResult.status,
                data: taskResult.data
            });
        } else {
            return res.status(500).json({
                task_id: taskId,
                status: taskResult.status,
                error: taskResult.error,
                data: taskResult.data
            });
        }
        
    } catch (error) {
        logError('Error checking task status', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export default router;