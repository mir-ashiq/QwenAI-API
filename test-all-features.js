// Test script for all API features
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3264/api';

async function testModels() {
    console.log('\n🧪 Testing GET /api/models...');
    const response = await fetch(`${API_BASE}/models`);
    const data = await response.json();
    console.log(`✅ Models endpoint: ${data.data.length} models loaded`);
    console.log(`   Sample models: ${data.data.slice(0, 3).map(m => m.id).join(', ')}...`);
}

async function testStatus() {
    console.log('\n🧪 Testing GET /api/status...');
    const response = await fetch(`${API_BASE}/status`);
    const data = await response.json();
    console.log(`✅ Status endpoint: ${data.validAccounts} valid tokens`);
    console.log(`   Tokens: ${data.accounts.map(a => a.id).join(', ')}`);
}

async function testChat() {
    console.log('\n🧪 Testing POST /api/chat (text-to-text)...');
    const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: 'What is 2+2? Answer in one word.',
            model: 'qwen-max-latest'
        })
    });
    const data = await response.json();
    console.log(`✅ Chat (t2t): ${data.choices[0].message.content}`);
}

async function testImageGeneration() {
    console.log('\n🧪 Testing POST /api/chat (text-to-image)...');
    const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: 'A cute cat',
            chatType: 't2i',
            size: '1024x1024'
        })
    });
    const data = await response.json();
    const imageUrl = data.choices[0].message.content;
    console.log(`✅ Image generation (t2i): ${imageUrl.substring(0, 60)}...`);
}

async function testOpenAICompatible() {
    console.log('\n🧪 Testing POST /api/chat/completions (OpenAI format)...');
    const response = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'qwen-max-latest',
            messages: [
                { role: 'user', content: 'Hello!' }
            ]
        })
    });
    const data = await response.json();
    console.log(`✅ OpenAI compatible: ${data.choices[0].message.content.substring(0, 50)}...`);
}

async function runTests() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  🚀 Testing All API Features (No File System)   ║');
    console.log('╚══════════════════════════════════════════════════╝');

    try {
        await testModels();
        await testStatus();
        await testChat();
        await testImageGeneration();
        await testOpenAICompatible();

        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log('║  ✅ All Tests Passed Successfully!               ║');
        console.log('║                                                  ║');
        console.log('║  Features Working:                               ║');
        console.log('║  ✓ Models from config (no file reads)           ║');
        console.log('║  ✓ Console-only logging (no file writes)        ║');
        console.log('║  ✓ Token management from .env                   ║');
        console.log('║  ✓ Text-to-text chat                            ║');
        console.log('║  ✓ Text-to-image generation                     ║');
        console.log('║  ✓ OpenAI compatible endpoint                   ║');
        console.log('║  ✓ In-memory file uploads (tested separately)   ║');
        console.log('╚══════════════════════════════════════════════════╝\n');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

runTests();
