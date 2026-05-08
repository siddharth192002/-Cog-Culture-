FACT-CHECK AGENT - PROJECT OVERVIEW

HOW THE APPLICATION RUNS:
1. UPLOAD: User uploads a PDF via the React frontend.
2. EXTRACT: Backend (Node.js) extracts literal claims from the PDF using Groq AI.
3. SEARCH: For each claim, a deep web search is performed via Tavily API.
4. VERIFY: The AI checks if the claim matches the search consensus (Verified/False/Inaccurate).
5. STREAM: Results appear one-by-one in the UI as they are processed.
6. REPORT: A final card-based report is generated with stats and evidence.

SETUP INSTRUCTIONS:
- Requires Node.js 18+
- Requires GROQ_API_KEY and TAVILY_API_KEY
- Run "npm run build" then "npm start"

Built by Cog Culture - 2026
