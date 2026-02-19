// worker.js - Cloudflare Workers entry point with Hono
// Standalone implementation without file system dependencies
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

// ==================== Constants ====================

const AVAILABLE_MODELS = [
    'qwen3-max', 'qwen-max-latest', 'qwen-max', 'qwen-plus-latest', 'qwen-plus',
    'qwen-turbo-latest', 'qwen-turbo', 'qwen3-vl-plus', 'qwen2.5-vl-32b-instruct',
    'qwen3-coder-plus', 'qwen2.5-coder-32b-instruct', 'qwq-32b-preview',
   'qwen3-235b-a22b', 'qvq-72b-preview', 'qvq-72b-preview-0310', 'qwen3-1m',
    'qwen3-14b-a14b', 'qwen-long'
];

const MODEL_MAPPING = {
    'gpt-4o': 'qwen3-max',
    'gpt-4o-mini': 'qwen-turbo-latest',
    'gpt-4-turbo': 'qwen3-max',
    'gpt-4': 'qwen-max-latest',
    'gpt-3.5-turbo': 'qwen-turbo-latest'
};

// ==================== Token Management ====================

let tokens = [];
let currentTokenIndex = 0;

function initializeTokens(env) {
    tokens = [];
    
    if (env.QWEN_TOKEN) {
        tokens.push({ token: env.QWEN_TOKEN, status: 'OK', id: 'env_token_1' });
    }
    
    if (env.QWEN_TOKENS) {
        const multiTokens = env.QWEN_TOKENS.split(',').map(t => t.trim()).filter(t => t);
        multiTokens.forEach((token, i) => {
            tokens.push({ token, status: 'OK', id: `env_token_${i + 2}` });
        });
    }
    
    return tokens.length;
}

function getNextToken() {
    if (tokens.length === 0) return null;
    
    const availableTokens = tokens.filter(t => t.status === 'OK');
    if (availableTokens.length === 0) return null;
    
    currentTokenIndex = (currentTokenIndex + 1) % availableTokens.length;
    return availableTokens[currentTokenIndex].token;
}

// ==================== API Functions ====================

async function sendQwenRequest(url, body, token) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'accept': 'application/json'
        },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Qwen API error: ${response.status} - ${errorText}`);
    }
    
    return response.json();
}

async function sendMessage(messageContent, model, chatId, parentId, chatType = 't2t', size = null) {
    const token = getNextToken();
    if (!token) {
        throw new Error('No valid tokens available');
    }
    
    const requestBody = {
        action: chatType === 't2t' ? 'chat' : chatType === 't2i' ? 't2i' : 't2v',
        model,
        messages: [{ role: 'user', content: messageContent }]
    };
    
    if (chatId) {
        requestBody.chatId = chatId;
    }
    if (parentId) {
        requestBody.parentId = parentId;
    }
    if (chatType !== 't2t' && size) {
        requestBody.size = size;
    }
    
    const result = await sendQwenRequest(
        'https://chat.qwenlm.ai/api/chat/completions/v2',
        requestBody,
        token
    );
    
    // Format response
    return {
        id: result.id || crypto.randomUUID(),
        model: model,
        choices: [{
            message: {
                role: 'assistant',
                content: result.content || result.output || ''
            }
        }],
        chatId: result.chatId,
        parentId: result.id
    };
}

async function pollTaskStatus(taskId) {
    const token = getNextToken();
    if (!token) {
        throw new Error('No valid tokens available');
    }
    
    const response = await fetch(`https://chat.qwenlm.ai/api/chat/generations/${taskId}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to get task status: ${response.status}`);
    }
    
    return response.json();
}

function getMappedModel(model) {
    return MODEL_MAPPING[model] || model;
}

function getApiKeys(env) {
    if (env.API_KEYS) {
        return env.API_KEYS.split(',').map(k => k.trim()).filter(k => k);
    }
    return [];
}

// ==================== Middleware ====================

app.use('*', cors());
app.use('*', logger());

const authMiddleware = async (c, next) => {
    const apiKeys = getApiKeys(c.env);
    
    if (apiKeys.length === 0) {
        return await next();
    }
    
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Authorization required' }, 401);
    }
    
    const token = authHeader.substring(7).trim();
    
    if (!apiKeys.includes(token)) {
        return c.json({ error: 'Invalid token' }, 401);
    }
    
    return await next();
};

app.use('/api/*', authMiddleware);

// ==================== Routes ====================

// Health check
app.get('/', (c) => {
    return c.json({
        status: 'ok',
        message: 'Qwen API Proxy - Cloudflare Workers',
        version: '2.0.0',
        platform: 'cloudflare-workers',
        endpoints: {
            chat: '/api/chat',
            models: '/api/models',
            status: '/api/status',
            openai: '/api/chat/completions'
        }
    });
});

// GET /api/models - List available models
app.get('/api/models', async (c) => {
    try {
        const models = AVAILABLE_MODELS.map(id => ({
            id,
            object: 'model',
            created: 1711000000,
            owned_by: 'qwen'
        }));
        
        return c.json({
            object: 'list',
            data: models
        });
    } catch (error) {
        console.error('Error fetching models:', error);
        return c.json({ error: 'Failed to fetch models' }, 500);
    }
});

// GET /api/status - Server status
app.get('/api/status', async (c) => {
    try {
        const validTokens = tokens.filter(t => t.status === 'OK').length;
        
        return c.json({
            status: 'running',
            timestamp: new Date().toISOString(),
            tokens: {
                total: tokens.length,
                valid: validTokens,
                invalid: tokens.filter(t => t.status === 'INVALID').length
            },
            platform: 'cloudflare-workers',
            version: '2.0.0'
        });
    } catch (error) {
        console.error('Error getting status:', error);
        return c.json({ error: 'Failed to get status' }, 500);
    }
});

// POST /api/chat - Main chat endpoint (t2t, t2i, t2v)
app.post('/api/chat', async (c) => {
    try {
        const body = await c.req.json();
        const { message, messages, model, chatId, parentId, chatType, size } = body;
        
        // Support both message and messages for compatibility
        let messageContent = message;
        
        if (messages && Array.isArray(messages) && messages.length > 0) {
            const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
            if (lastUserMessage) {
                messageContent = lastUserMessage.content;
            }
        }
        
        if (!messageContent) {
            return c.json({ error: 'Message not specified' }, 400);
        }
        
        const mappedModel = getMappedModel(model || "qwen-max-latest");
        
        console.log(`Chat request: model=${mappedModel}, chatType=${chatType || 't2t'}`);
        
        const result = await sendMessage(
            messageContent,
            mappedModel,
            chatId,
            parentId,
            chatType || "t2t",
            size
        );
        
        return c.json(result);
    } catch (error) {
        console.error('Error processing chat request:', error);
        return c.json({ error: 'Internal server error', details: error.message }, 500);
    }
});

// POST /api/chat/completions - OpenAI-compatible endpoint
app.post('/api/chat/completions', async (c) => {
    try {
        const body = await c.req.json();
        const { messages, model, stream, chatId, parentId } = body;
        
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return c.json({ 
                error: { 
                    message: 'messages is required and must be a non-empty array',
                    type: 'invalid_request_error'
                }
            }, 400);
        }
        
        const mappedModel = getMappedModel(model || "qwen-max-latest");
        
        // Get last user message
        const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
        if (!lastUserMessage) {
            return c.json({
                error: {
                    message: 'No user message found in messages array',
                    type: 'invalid_request_error'
                }
            }, 400);
        }
        
        let messageContent = lastUserMessage.content;
        
        // Send request
        const result = await sendMessage(
            messageContent,
            mappedModel,
            chatId,
            parentId,
            't2t',
            null
        );
        
        return c.json(result);
    } catch (error) {
        console.error('Error in OpenAI completions endpoint:', error);
        return c.json({
            error: {
                message: error.message || 'Internal server error',
                type: 'internal_error'
            }
        }, 500);
    }
});

// GET /api/tasks/status/:taskId - Check task status
app.get('/api/tasks/status/:taskId', async (c) => {
    try {
        const taskId = c.req.param('taskId');
        
        if (!taskId) {
            return c.json({ error: 'Task ID required' }, 400);
        }
        
        const result = await pollTaskStatus(taskId);
        return c.json(result);
    } catch (error) {
        console.error('Error polling task status:', error);
        return c.json({ error: 'Failed to get task status' }, 500);
    }
});

// 404 handler
app.notFound((c) => {
    return c.json({
        error: 'Not found',
        path: c.req.path
    }, 404);
});

// Error handler
app.onError((err, c) => {
    console.error('Unhandled error:', err);
    return c.json({
        error: 'Internal server error',
        message: err.message
    }, 500);
});

// ==================== Export for Cloudflare Workers ====================

export default {
    async fetch(request, env, ctx) {
        // Initialize tokens on first request
        if (tokens.length === 0) {
            const count = initializeTokens(env);
            console.log(`Initialized ${count} token(s) from environment`);
            
            if (count === 0) {
                return new Response(JSON.stringify({
                    error: 'No tokens configured',
                    message: 'Please set QWEN_TOKEN or QWEN_TOKENS environment variable'
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        
        return app.fetch(request, env, ctx);
    }
};
