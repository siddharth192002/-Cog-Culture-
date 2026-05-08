const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse-new');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ override: true });

const TAVILY_API_KEY = process.env.TAVILY_API_KEY ? process.env.TAVILY_API_KEY.trim() : "";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Basic Health Check (Optional, but '/*' will handle this)
// app.get('/', (req, res) => res.send('API Running'));

// Helper for Groq
async function generateWithGroq(prompt) {
    const baseURL = 'https://api.groq.com/openai/v1/chat/completions';
    const model = 'llama-3.1-8b-instant';
    
    const apiKey = process.env.GROQ_API_KEY || process.env.GOOGLE_API_KEY || '';

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    try {
        const response = await axios.post(baseURL, {
            model: model,
            messages: [{ role: "user", "content": prompt }],
            temperature: 0.1
        }, { headers });
        
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Groq Error:', error.response ? error.response.data : error.message);
        throw new Error('Groq generation failed: ' + (error.response ? JSON.stringify(error.response.data) : error.message));
    }
}

// Helper for Tavily Search
async function searchWeb(query) {
    try {
        const response = await axios.post('https://api.tavily.com/search', {
            api_key: TAVILY_API_KEY,
            query: query,
            search_depth: "basic",
            include_answer: true,
            max_results: 2
        });
        return response.data;
    } catch (error) {
        console.error('Tavily search failed:', error.message);
        return { results: [] };
    }
}

// Helper to chunk text
function chunkText(text, chunkSize = 4000) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
}

// Helper for Groq with Retry logic
async function generateWithGroqWithRetry(prompt, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await generateWithGroq(prompt);
        } catch (error) {
            if (error.message.includes('rate_limit_exceeded') && i < retries - 1) {
                const waitTime = 4000;
                console.log(`Rate limit hit, retrying in ${waitTime/1000}s... (Attempt ${i+1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            throw error;
        }
    }
}

app.post('/api/verify', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        // Set up streaming response
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const data = await pdf(req.file.buffer);
        const text = data.text;
        
        // 1. Extract claims using Groq in chunks
        const textChunks = chunkText(text, 3000); // Smaller chunks for Groq TPM
        let allClaims = [];
        
        console.log(`Processing ${textChunks.length} text chunks...`);
        
        for (let i = 0; i < textChunks.length; i++) {
            const extractionPrompt = `
                Extract verifiable claims (stats, dates, financial figures) from this text fragment.
                Return ONLY a JSON array of objects with keys: "claim", "context".
                If no claims are found, return [].
                Text Fragment (${i+1}/${textChunks.length}): ${textChunks[i]}
            `;
            
            try {
                const extractionResultText = await generateWithGroqWithRetry(extractionPrompt);
                const match = extractionResultText.match(/\[[\s\S]*\]/);
                if (match) {
                    const chunkClaims = JSON.parse(match[0]);
                    allClaims = allClaims.concat(chunkClaims);
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
                console.error(`Chunk ${i+1} Extraction failed:`, e.message);
            }
        }

        // Deduplicate claims
        const rawClaims = Array.from(new Set(allClaims.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));
        // Filter out too short/junk claims
        const claims = rawClaims.filter(c => c.claim && c.claim.length > 5);
        console.log(`Extracted ${claims.length} unique claims.`);

        // 2. Verify each claim sequentially and STREAM results
        for (const c of claims) {
            const searchData = await searchWeb(c.claim);
            // Aggressive truncation for Groq TPM (600 characters)
            const searchContext = searchData.results
                .map(r => r.content.substring(0, 600))
                .join("\n---\n");
            
            const verificationPrompt = `
                Claim: ${c.claim}
                Context from Document: ${c.context}
                Live Search Results: ${searchContext || "NO SEARCH RESULTS FOUND"}

                You are a strict, skeptical Fact-Checker. 
                
                CRITICAL INSTRUCTIONS:
                1. If the "Live Search Results" are empty, irrelevant, or do not contain the specific fact/stat, you MUST return "False".
                2. Do NOT hallucinate. If you can't find the exact claim in the search data, it is NOT verified.
                3. "False" is the default for any claim that cannot be proven by the provided search results.

                Status Definitions:
                - "Verified": Claim is 100% matched by search results.
                - "Inaccurate": Claim is partly true but has wrong numbers, dates, or outdated info.
                - "False": Claim is contradicted OR NO supporting evidence was found.

                Return ONLY a JSON object:
                {
                  "status": "Verified" | "Inaccurate" | "False",
                  "evidence": "Briefly explain why (max 20 words). If no data was found, say 'No evidence found in web search.'",
                  "realFact": "The exact corrected data (if Inaccurate/False), else N/A"
                }
            `;

            try {
                const vResultText = await generateWithGroqWithRetry(verificationPrompt);
                const match = vResultText.match(/\{[\s\S]*\}/);
                const vJson = match ? JSON.parse(match[0]) : { status: "Unknown", evidence: "No valid JSON returned from model" };
                
                // Stream the result immediately
                res.write(JSON.stringify({ ...c, ...vJson }) + "\n");
                
                // Pacing delay to avoid TPM limit
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (e) {
                console.error(`Verification Error for claim: ${c.claim}`, e.message);
                res.write(JSON.stringify({ ...c, status: "Unknown", evidence: "Error during verification: " + e.message, realFact: "N/A" }) + "\n");
            }
        }

        res.end();
    } catch (error) {
        console.error("Critical Server Error:", error.message);
        res.write(JSON.stringify({ error: "Server error: " + error.message }) + "\n");
        res.end();
    }
});

// Serve Frontend Static Files
const frontendPath = path.resolve(process.cwd(), 'frontend', 'dist');
console.log('Serving frontend from:', frontendPath);
app.use(express.static(frontendPath));

// Catch-all route to serve Frontend index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
