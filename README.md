# 🛡️ The Fact-Check Agent

A production-ready, AI-powered fact-checking engine that extracts, verifies, and debunks claims in real-time from complex PDF documents.

## 🚀 Live Flow: How it Works

1.  **PDF Processing**: The system reads your uploaded PDF and breaks it into semantic chunks to stay within AI context limits.
2.  **Literal Extraction**: Using **Groq (Llama-3.1-8B)**, the agent extracts the *exact* claims stated in the document—even if they are obviously false—to ensure nothing is missed.
3.  **Deep Web Research**: For every claim, the agent triggers an **Advanced Tavily Search** to find the latest data, news, and scientific consensus from the live web.
4.  **Consensus Verification**: The AI analyzes the search results with a skeptical "World-Class Fact-Checker" persona. It prioritizes data from major scientific and official bodies (NASA, WHO, IPCC) over single-source blogs.
5.  **Real-Time Streaming**: Results are pushed to the UI row-by-row using **NDJSON streaming**, so you see the truth as it's discovered.
6.  **Premium Report**: Final findings are presented in a high-end card-based dashboard, flagging claims as **Verified**, **Inaccurate**, or **False**.

## 🛠️ Technology Stack

-   **Frontend**: React (Vite), Lucide Icons, Glassmorphism UI.
-   **Backend**: Node.js (Express), `pdf-parse-new`.
-   **AI Intelligence**: Groq (Llama-3.1-8B-Instant) - *Ultra-fast inference*.
-   **Search Engine**: Tavily AI (Advanced Research API).
-   **Deployment**: Monolith architecture ready for Render/AWS.

## ⚙️ Environment Variables

To run this project, you will need to add the following variables to your `.env` file (and Render dashboard):

`GROQ_API_KEY`=your_groq_key
`TAVILY_API_KEY`=your_tavily_key
`PORT`=10000

## 📦 Installation & Deployment

### Local Development
1. Install root dependencies: `npm install`
2. Build and Start: `npm run build && npm start`
3. Visit `http://localhost:10000`

### Render Deployment
1. Connect your GitHub repository.
2. **Build Command**: `npm run build`
3. **Start Command**: `npm start`
4. Add your API keys in the **Environment** tab.

---
© 2026 Cog Culture • Advanced Fact-Checking Intelligence
