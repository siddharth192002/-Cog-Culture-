require('dotenv').config({ override: true });
const axios = require('axios');

async function test() {
    const baseURL = 'https://api.x.ai/v1/models';
    const apiKey = process.env.XAI_API_KEY;

    const headers = {
        'Authorization': `Bearer ${apiKey}`
    };

    try {
        const response = await axios.get(baseURL, { headers });
        console.log("Available models:");
        console.log(response.data.data.map(m => m.id));
    } catch (error) {
        console.error('ERROR:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    }
}

test();
