// Simplified chat.js - Direct HTTP calls, no browser automation
import { getAvailableToken, markRateLimited, removeInvalidToken } from './tokenManager.js';
import { AVAILABLE_MODELS, API_KEYS } from '../config.js';
import crypto from 'crypto';
import fetch from 'node-fetch';

const CHAT_API_URL_V2 = 'https://chat.qwen.ai/api/v2/chat/completions';
const CREATE_CHAT_URL = 'https://chat.qwen.ai/api/v2/chats/new';
const TASK_STATUS_URL = 'https://chat.qwen.ai/api/v1/tasks/status';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==================== Models & Auth ====================

export function getAvailableModelsFromFile() {
    console.log('===== AVAILABLE MODELS =====');
    AVAILABLE_MODELS.forEach(model => console.log(`- ${model}`));
    console.log('============================');
    return AVAILABLE_MODELS;
}

export function isValidModel(modelName) {
    return AVAILABLE_MODELS.includes(modelName);
}

export function getAllModels() {
    return {
        models: AVAILABLE_MODELS.map(model => ({
            id: model,
            name: model,
            description: `Model ${model}`
        }))
    };
}

export function getApiKeys() {
    return API_KEYS;
}

// ==================== Chat API ====================

export async function createChatV2(model = 'qwen-max-latest') {
    const tokenObj = await getAvailableToken();
    if (!tokenObj || !tokenObj.token) {
        return { error: 'No valid token available' };
    }

    try {
        const response = await fetch(CREATE_CHAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenObj.token}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                timestamp: Math.floor(Date.now() / 1000)
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to create chat: ${response.status} ${errorText}`);
            
            // Handle rate limiting
            if (response.status === 429) {
                console.log(`⚠️ Account ${tokenObj.id} rate limited`);
                markRateLimited(tokenObj.id, 24);
                return { error: 'Rate limited', needsRetry: true };
            }
            
            return { error: `HTTP ${response.status}: ${errorText}` };
        }

        const chatData = await response.json();
        
        // Extract chatId from nested data structure
        const chatId = chatData.data?.id || chatData.chat_id || chatData.id || chatData.chatId;
        const parentId = chatData.data?.parent_id || chatData.parent_id || chatData.first_id || chatData.parentId || chatData.firstMessageId || null;
        
        return {
            chatId: chatId,
            parentId: parentId
        };
    } catch (error) {
        console.error('Error creating chat:', error);
        return { error: error.message };
    }
}

/**
 * Poll task status for video/image generation
 */
export async function pollTaskStatus(taskId, token, maxAttempts = 90, interval = 2000) {
    console.log(`📊 Polling task status: ${taskId}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const statusUrl = `${TASK_STATUS_URL}/${taskId}`;
            
            const response = await fetch(statusUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.error(`❌ Error checking status (attempt ${attempt}/${maxAttempts}): ${response.status}`);
                await delay(interval);
                continue;
            }
            
            const taskData = await response.json();
            const taskStatus = taskData.task_status || taskData.status || 'unknown';
            console.log(`⏳ Task status (${attempt}/${maxAttempts}): ${taskStatus}`);
            
            // Check if task is completed
            if (taskStatus === 'completed' || taskStatus === 'success') {
                console.log('✅ Task completed successfully!');
                return {
                    success: true,
                    status: 'completed',
                    data: taskData
                };
            }
            
            // Check if task failed
            if (taskStatus === 'failed' || taskStatus === 'error') {
                console.error('❌ Task failed');
                return {
                    success: false,
                    status: 'failed',
                    error: taskData.error || taskData.message || 'Task failed',
                    data: taskData
                };
            }
            
            // Task still in progress
            if (attempt < maxAttempts) {
                await delay(interval);
            }
            
        } catch (error) {
            console.error(`❌ Error polling task (attempt ${attempt}/${maxAttempts}):`, error);
            if (attempt < maxAttempts) {
                await delay(interval);
            }
        }
    }
    
    console.error(`⏰ Timeout: ${maxAttempts} attempts exceeded for task ${taskId}`);
    return {
        success: false,
        status: 'timeout',
        error: 'Task polling timeout exceeded'
    };
}

/**
 * Send message to Qwen API
 */
export async function sendMessage(
    message,
    model = "qwen-max-latest",
    chatId = null,
    parentId = null,
    files = null,
    tools = null,
    toolChoice = null,
    systemMessage = null,
    chatType = "t2t",
    size = null,
    waitForCompletion = true
) {
    // Create new chat if not provided
    if (!chatId) {
        const newChatResult = await createChatV2(model);
        if (newChatResult.error) {
            if (newChatResult.needsRetry) {
                // Try again with different token
                return await sendMessage(message, model, null, parentId, files, tools, toolChoice, systemMessage, chatType, size, waitForCompletion);
            }
            return { error: 'Failed to create chat: ' + newChatResult.error };
        }
        chatId = newChatResult.chatId;
        parentId = newChatResult.parentId;
        
        if (!chatId) {
            return { error: 'Chat creation failed: No chat ID returned from API' };
        }
    }

    // Validate message
    let messageContent = message;
    if (message === null || message === undefined) {
        return { error: 'Message cannot be empty', chatId };
    }

    if (typeof message === 'string') {
        messageContent = message;
    } else if (Array.isArray(message)) {
        const isValid = message.every(item =>
            (item.type === 'text' && typeof item.text === 'string') ||
            (item.type === 'image' && typeof item.image === 'string') ||
            (item.type === 'file' && typeof item.file === 'string')
        );

        if (!isValid) {
            return { error: 'Invalid message structure', chatId };
        }
        messageContent = message;
    } else {
        return { error: 'Unsupported message format', chatId };
    }

    // Validate model
    if (!model || model.trim() === "") {
        model = "qwen-max-latest";
    } else if (!isValidModel(model)) {
        console.warn(`Warning: Model "${model}" not found in available models. Using default.`);
        model = "qwen-max-latest";
    }

    console.log(`Using model: "${model}"`);

    // Get token
    let tokenObj = await getAvailableToken();
    if (!tokenObj || !tokenObj.token) {
        return { error: 'No valid authentication token available. Please add a token using: npm run addToken', chatId };
    }

    console.log(`Using account: ${tokenObj.id} - ${tokenObj.name}`);

    try {
        // Build message payload
        const userMessageId = crypto.randomUUID();
        const assistantChildId = crypto.randomUUID();
        
        const featureConfig = {
            thinking_enabled: chatType === "t2v",
            output_schema: "phase"
        };

        if (chatType === "t2v") {
            featureConfig.research_mode = "normal";
            featureConfig.auto_thinking = true;
            featureConfig.thinking_format = "summary";
            featureConfig.auto_search = true;
        }

        const newMessage = {
            fid: userMessageId,
            parentId: parentId,
            parent_id: parentId,
            role: "user",
            content: messageContent,
            chat_type: chatType,
            sub_chat_type: chatType,
            timestamp: Math.floor(Date.now() / 1000),
            user_action: "chat",
            models: [model],
            files: files || [],
            childrenIds: [assistantChildId],
            extra: {
                meta: {
                    subChatType: chatType
                }
            },
            feature_config: featureConfig
        };

        const payload = {
            stream: chatType === "t2v" ? false : true,
            version: "2.1",
            incremental_output: true,
            chat_id: chatId,
            chat_mode: "normal",
            messages: [newMessage],
            model: model,
            parent_id: parentId,
            timestamp: Math.floor(Date.now() / 1000)
        };

        if (systemMessage) {
            payload.system_message = systemMessage;
        }

        if (tools && Array.isArray(tools) && tools.length > 0) {
            payload.tools = tools;
            payload.tool_choice = toolChoice || "auto";
        }

        if (chatType === "t2i" && size) {
            payload.size = size;
        }

        if (chatType === "t2v" && size) {
            payload.size = size;
        }

        console.log(`Sending message to chat ${chatId} with parent_id: ${parentId || 'null'}`);

        const apiUrl = `${CHAT_API_URL_V2}?chat_id=${chatId}`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenObj.token}`,
                'Accept': '*/*'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error: ${response.status} ${errorText}`);
            
            // Handle rate limiting
            if (response.status === 429) {
                console.log(`⚠️ Account ${tokenObj.id} rate limited`);
                markRateLimited(tokenObj.id, 24);
                // Retry with different token
                return await sendMessage(message, model, chatId, parentId, files, tools, toolChoice, systemMessage, chatType, size, waitForCompletion);
            }
            
            // Handle invalid token
            if (response.status === 401 || response.status === 403) {
                console.log(`❌ Account ${tokenObj.id} token invalid`);
                removeInvalidToken(tokenObj.id);
                // Retry with different token
                return await sendMessage(message, model, chatId, parentId, files, tools, toolChoice, systemMessage, chatType, size, waitForCompletion);
            }
            
            return {
                error: `HTTP ${response.status}: ${errorText}`,
                chatId,
                parentId
            };
        }

        // Handle non-streaming (t2v video generation)
        if (payload.stream === false) {
            const jsonResponse = await response.json();
            
            // Check if it's a task-based response
            if (jsonResponse.task_id || jsonResponse.id) {
                const taskId = jsonResponse.task_id || jsonResponse.id;
                console.log(`📋 Task created: ${taskId}`);
                
                if (waitForCompletion) {
                    console.log('⏳ Waiting for task completion...');
                    const taskResult = await pollTaskStatus(taskId, tokenObj.token);
                    
                    if (taskResult.success && taskResult.data) {
                        const resultData = taskResult.data;
                        let videoUrl = resultData.output || resultData.result || resultData.video_url;
                        
                        return {
                            id: taskId,
                            object: 'chat.completion',
                            created: Math.floor(Date.now() / 1000),
                            model: model,
                            choices: [{
                                index: 0,
                                message: {
                                    role: 'assistant',
                                    content: videoUrl || 'Task completed'
                                },
                                finish_reason: 'stop'
                            }],
                            usage: resultData.usage || {
                                prompt_tokens: 0,
                                output_tokens: 0,
                                total_tokens: 0
                            },
                            response_id: taskId,
                            chatId: chatId,
                            parentId: taskId,
                            task_id: taskId,
                            video_url: videoUrl
                        };
                    } else {
                        return {
                            error: taskResult.error || 'Task failed',
                            task_id: taskId,
                            task_status: taskResult.status,
                            chatId: chatId
                        };
                    }
                } else {
                    // Return immediately with task ID
                    return {
                        task_id: taskId,
                        status: 'processing',
                        message: 'Task created. Poll /api/task-status/:taskId for results.',
                        chatId: chatId,
                        parentId: taskId
                    };
                }
            }
            
            // Regular JSON response
            return {
                ...jsonResponse,
                chatId: chatId,
                parentId: jsonResponse.id || jsonResponse.response_id
            };
        }

        // Handle streaming response (t2t, t2i)
        let buffer = '';
        let fullContent = '';
        let responseId = null;
        let usage = null;
        let finished = false;

        const stream = response.body;
        
        for await (const chunk of stream) {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) continue;
                
                const jsonStr = line.substring(6).trim();
                if (!jsonStr || jsonStr === '[DONE]') continue;

                try {
                    const chunkData = JSON.parse(jsonStr);
                    
                    // First chunk with metadata
                    if (chunkData['response.created']) {
                        responseId = chunkData['response.created'].response_id;
                    }
                    
                    // Extract response_id if available at top level
                    if (chunkData.response_id) {
                        responseId = chunkData.response_id;
                    }
                    
                    // Content chunks
                    if (chunkData.choices && chunkData.choices[0]) {
                        const choice = chunkData.choices[0];
                        
                        // Check for delta.content (streaming format)
                        if (choice.delta && choice.delta.content) {
                            fullContent += choice.delta.content;
                        }
                        
                        // Check for message.content (non-delta format)
                        if (choice.message && choice.message.content) {
                            fullContent += choice.message.content;
                        }
                        
                        // Check finish reason
                        if (choice.finish_reason === 'stop' || choice.finish_reason === 'length') {
                            finished = true;
                        }
                        
                        if (choice.delta && choice.delta.status === 'finished') {
                            finished = true;
                        }
                    }
                    
                    // Update usage
                    if (chunkData.usage) {
                        usage = chunkData.usage;
                    }
                } catch (e) {
                    // Ignore parsing errors for individual chunks
                }
            }
        }

        return {
            id: responseId || 'chatcmpl-' + Date.now(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: fullContent
                },
                finish_reason: 'stop'
            }],
            usage: usage || {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0
            },
            response_id: responseId,
            chatId: chatId,
            parentId: responseId
        };

    } catch (error) {
        console.error('Error in sendMessage:', error);
        return {
            error: error.message,
            chatId,
            parentId
        };
    }
}

// Test token validity
export async function testToken(token) {
    try {
        const response = await fetch(CREATE_CHAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: 'qwen-max-latest',
                timestamp: Math.floor(Date.now() / 1000)
            })
        });

        return response.ok;
    } catch (error) {
        return false;
    }
}
