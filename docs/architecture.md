# Tradify architecture

Tradify is a local-first, educational stock-research application. Its first release keeps the stack compact: one Next.js app, SQLite for local state, Yahoo Finance for market data, and a LangChain tool-calling agent through OpenRouter.

```text
Browser
  Landing → signup/login → protected dashboard
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
        Next.js route handlers              Client dashboard
       auth · conversations · chat       chat · portfolio · cards
              │
    SQLite users / conversations / messages
              │
       LangChain createAgent
          │  thread_id = conversationId
          ├─ MemorySaver (short-term state)
          ├─ fundamental_analysis
          └─ technical_analysis
              │
     Yahoo Finance → built-in snapshots fallback
```

## Application responsibilities

| Layer | Responsibility |
| --- | --- |
| Landing page | Explains the product and routes visitors to signup. |
| Authentication | Email/password signup and login, bcrypt password hashes, signed HTTP-only cookie. |
| Dashboard | Dummy portfolio, conversation history, chat composer, and latest analysis card. |
| Chat route | Verifies user ownership, stores the turn, invokes the agent, and stores its reply. |
| Market adapter | Normalizes live Yahoo data and falls back to local AAPL, MSFT, NVDA, GOOGL, and TSLA fixtures. |
| Agent | Selects fundamental and/or technical tools, then summarizes data without recommendations. |

## Local data model

```text
users(id, email UNIQUE, password_hash, created_at)
conversations(id, user_id, title, created_at, updated_at)
messages(id, conversation_id, role[user|assistant], content, created_at)
```

### Conversation memory

The dashboard sends a `conversationId` with each chat turn. The server uses that ID as the LangGraph `thread_id` for [LangChain short-term memory](https://docs.langchain.com/oss/javascript/langchain/short-term-memory). `MemorySaver` keeps the active thread state (including tool calls) during the running app, while SQLite remains the durable transcript and rehydrates a thread after a restart. This ensures a follow-up such as “Is it a good time to invest?” retains the previously discussed stock.

This MVP intentionally does not use legacy conversational-buffer/entity memory. A buffer is just unbounded transcript accumulation; entity memory is a poor fit because stock prices and company facts change. Tradify instead retrieves live facts through tools and scopes short-term context to one conversation. The **New chat** button clears that scope and starts the next question as a fresh conversation.

## Public app API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/signup` | Create user and issue session cookie. |
| POST | `/api/auth/login` | Verify credentials and issue session cookie. |
| POST | `/api/auth/logout` | Clear the session cookie. |
| GET/POST | `/api/conversations` | List, retrieve, or start conversations. |
| POST | `/api/chat` | Persist question, run analysis, persist answer, return latest metrics. |
| GET | `/api/stock?symbol=AAPL` | Retrieve current normalized market data for the dashboard. |

## Agent and data safeguards

- `fundamental_analysis(symbol)` returns price, market cap, P/E, EPS, revenue, margins, and 52-week range.
- `technical_analysis(symbol)` returns price movement, SMA 20/50/200, RSI-14, volume, and trend.
- The model is called only when `OPENROUTER_API_KEY` is configured. Without it, Tradify returns a deterministic tool-based analysis so the workshop remains runnable.
- All summaries state their data source and educational-only disclaimer. No buy/sell recommendation is produced.

## Deployment note

SQLite is a correct local workshop choice but Vercel’s serverless filesystem is not durable. The app can be deployed as a UI/API demonstration, but persistent accounts and conversations require replacing the SQLite adapter with hosted Postgres, Turso/libSQL, or Vercel KV before production use.
