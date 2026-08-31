# Tradify learner build guide

This guide turns Tradify into a repeatable workshop: a landing page, local authentication, saved conversations, live market data, and a tool-calling AI research assistant.

## 1. Prerequisites

- Node.js 22 or newer
- An OpenRouter account and API key
- GitHub and Vercel accounts for publishing

```bash
git clone https://github.com/divijbajaj7/tradify-ai-stock-research.git
cd tradify-ai-stock-research
npm install
cp .env.example .env.local
npm run dev
```

Set `OPENROUTER_API_KEY`, keep `OPENROUTER_MODEL=openai/gpt-5.4`, and replace `SESSION_SECRET` with a long random value. Visit `http://localhost:3000`.

## 2. Product prompt

> Build Tradify, a dark red-noir AI stock-research app. Use Next.js, SQLite, email/password login, and a persistent chat. The agent should call separate technical and fundamental analysis tools, use Yahoo Finance with local fallback fixtures, and state that it is educational research rather than financial advice. First make the landing page, then auth, then the protected chat dashboard. Verify every step.

## 3. Build order

1. Create the landing page with a crisp promise and a single “Get started” path.
2. Add signup/login with password hashing and a server-only session cookie.
3. Create the SQLite `users`, `conversations`, and `messages` tables.
4. Add the dashboard shell: dummy portfolio, conversation list, chat, and analysis panel.
5. Create a data adapter that gets a quote/history from Yahoo Finance and falls back to tracked snapshot values.
6. Calculate SMA 20/50/200 and RSI-14 from closing prices.
7. Register `fundamental_analysis` and `technical_analysis` tools with LangChain.
8. Invoke `ChatOpenRouter` with the stored conversation messages and show the returned analysis.
9. Add a LangGraph `MemorySaver` checkpointer with `thread_id` equal to the conversation ID. Keep SQLite as the durable transcript that hydrates memory after a server restart.

## 4. Conversation memory: the right choice

Use [LangChain short-term memory](https://docs.langchain.com/oss/javascript/langchain/short-term-memory), not legacy `ConversationBufferMemory` or entity memory.

- **Scope:** one `conversationId` becomes one `thread_id`, so one stock-research thread cannot leak into another.
- **Runtime state:** LangGraph `MemorySaver` preserves the agent’s messages and tool calls over sequential turns.
- **Durability:** SQLite saves the user-visible transcript and restores context if the local app restarts.
- **Fresh starts:** the dashboard’s **New chat** button clears the active conversation; the next message starts a new thread.
- **Why not entity memory:** stock prices, valuation, and fundamentals are time-sensitive. Always retrieve them from Yahoo Finance rather than saving stale “facts” as long-term entities.

Example regression test:

```text
User: Do fundamental analysis for TCS stock.
User: Is it a good time to invest in this stock?
Expected: the second answer continues with TCS.NS, not AAPL.
```

## 5. Verification checklist

- Create a new account, log out, and log back in.
- Ask: “Analyze AAPL: strengths, risks, and the current trend.”
- Ask: “Do fundamental analysis for TCS stock,” then “Is it a good time to invest in this stock?” and confirm the second response remains about TCS.
- Confirm price cards appear, the source is visible, and the conversation remains after refresh.
- Select **New chat** and confirm the next question begins without the prior stock context.
- Remove `OPENROUTER_API_KEY` temporarily: the deterministic data-backed fallback should still answer.
- Run `npm run lint`, `npm test`, and `npm run build` before publishing.

## 6. Publish

```bash
git add .
git commit -m "Build Tradify MVP"
git remote add origin <your-github-repository-url>
git push -u origin main
```

Import the repository in Vercel and set the three values from `.env.local` in Project Settings → Environment Variables. The deployment will render the UI and server routes, but local SQLite state does not persist between Vercel instances. Move the database layer to a hosted provider before treating it as a multi-user deployment.

## 7. Next learner challenges

- Replace the dummy portfolio with a saved watchlist.
- Stream agent tokens rather than waiting for a complete response.
- Add citations and earnings calendar data.
- Migrate SQLite queries behind a repository interface to hosted Postgres.
- Add rate limiting and password reset delivery before public launch.
