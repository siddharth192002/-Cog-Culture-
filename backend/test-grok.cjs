require('dotenv').config({ override: true });
const axios = require('axios');

async function test() {
    const baseURL = 'https://api.x.ai/v1/chat/completions';
    const apiKey = process.env.XAI_API_KEY;
    
    if (!apiKey) {
        console.error("No XAI_API_KEY found in .env");
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    console.log("Testing Grok API connection...");
    try {
        const response = await axios.post(baseURL, {
            model: 'grok-2-latest',
            messages: [{ role: "user", "content": "Hello, Grok! Reply with 'Hello World'." }],
        }, { headers });
        
        console.log("SUCCESS! Grok responded:");
        console.log(response.data.choices[0].message.content);
    } catch (error) {
        console.error('ERROR:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    }
}

test();
