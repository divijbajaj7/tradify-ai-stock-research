import "server-only";
import { ChatOpenRouter } from "@langchain/openrouter";
import { MemorySaver } from "@langchain/langgraph";
import { createAgent, tool } from "langchain";
import { z } from "zod";
import { findSymbolInText, getStockData, symbolFromText, formatMoney } from "./market-data";
import type { ChatMessage, StockAnalysis } from "./types";

const stockSchema = z.object({ symbol: z.string().describe("A stock ticker such as AAPL or MSFT") });
const fundamentals = tool(async ({ symbol }) => JSON.stringify(await getStockData(symbol)), { name: "fundamental_analysis", description: "Get current valuation, profitability, and revenue data for a stock.", schema: stockSchema });
const technicals = tool(async ({ symbol }) => JSON.stringify(await getStockData(symbol)), { name: "technical_analysis", description: "Get price trend, moving averages, RSI, and volume for a stock.", schema: stockSchema });
const checkpointer = new MemorySaver();
const hydratedThreads = new Set<string>();
let agent: ReturnType<typeof createAgent> | undefined;

function deterministicAnswer(stock: StockAnalysis) {
  const priceDirection = stock.changePercent >= 0 ? "up" : "down";
  const rsi = stock.rsi14 === null ? "not available" : stock.rsi14 > 70 ? `${stock.rsi14} (elevated)` : stock.rsi14 < 30 ? `${stock.rsi14} (oversold area)` : `${stock.rsi14} (balanced)`;
  return `**${stock.name} (${stock.symbol})** is ${priceDirection} **${Math.abs(stock.changePercent).toFixed(2)}%** at **${formatMoney(stock.price, false)}**.\n\n**Fundamentals** — market cap: ${formatMoney(stock.marketCap)}; P/E: ${stock.pe?.toFixed(1) ?? "—"}; EPS: ${formatMoney(stock.eps, false)}; revenue: ${formatMoney(stock.revenue)}; profit margin: ${stock.margin?.toFixed(1) ?? "—"}%.\n\n**Technical view** — trend: **${stock.trend}**; RSI-14: ${rsi}; SMA 20 / 50 / 200: ${formatMoney(stock.sma20, false)} / ${formatMoney(stock.sma50, false)} / ${formatMoney(stock.sma200, false)}.\n\nData source: ${stock.source}, refreshed ${new Date(stock.updatedAt).toLocaleString()}. This is educational research, not financial advice.`;
}

function textContent(content: unknown) { return typeof content === "string" ? content : Array.isArray(content) ? content.map((part) => typeof part === "string" ? part : "text" in part ? String(part.text) : "").join("") : String(content); }

function conversationSymbol(question: string, history: ChatMessage[]) {
  return findSymbolInText(question) ?? history.slice().reverse().map((message) => findSymbolInText(message.content)).find((symbol): symbol is string => Boolean(symbol)) ?? symbolFromText(question);
}

function getAgent() {
  if (agent) return agent;
  const model = new ChatOpenRouter(process.env.OPENROUTER_MODEL ?? "openai/gpt-5.4", { apiKey: process.env.OPENROUTER_API_KEY, temperature: 0.2, siteName: "Tradify" });
  agent = createAgent({ model, tools: [fundamentals, technicals], checkpointer, systemPrompt: "You are Tradify, an educational stock-research assistant. For every ticker-specific user question, you MUST call at least one relevant analysis tool before replying; never ask the user to wait or offer to fetch data later. Use fundamental_analysis for fundamental requests and technical_analysis for technical requests. DMART refers to the Indian listing DMART.NS and TCS refers to TCS.NS. A resolved ticker supplied in the user context is the active stock for follow-up questions unless the user explicitly names a different stock. Label uncertainty, never invent figures, and never make buy/sell recommendations. Keep answers concise, with Fundamentals, Technical view, and Risks headings. End with: Educational research only — not financial advice." });
  return agent;
}

export async function answerStockQuestion(question: string, history: ChatMessage[], conversationId: number) {
  const symbol = conversationSymbol(question, history);
  const stock = await getStockData(symbol);
  if (!process.env.OPENROUTER_API_KEY) return { answer: deterministicAnswer(stock), stock };
  try {
    const threadId = `conversation:${conversationId}`;
    const messages = hydratedThreads.has(threadId) ? [{ role: "user" as const, content: `${question}\n\nResolved active ticker context: ${symbol}. Use your tool now before responding.` }] : [...history.slice(-12).map((message) => ({ role: message.role, content: message.content })), { role: "user" as const, content: `${question}\n\nResolved active ticker context: ${symbol}. Use your tool now before responding.` }];
    const result = await getAgent().invoke({ messages }, { configurable: { thread_id: threadId } });
    hydratedThreads.add(threadId);
    const last = result.messages.at(-1);
    return { answer: last ? textContent(last.content) : deterministicAnswer(stock), stock };
  } catch { return { answer: deterministicAnswer(stock), stock }; }
}
