export type Role = "user" | "assistant";

export type PricePoint = { date: string; close: number; volume?: number };

export type StockAnalysis = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number | null;
  pe: number | null;
  eps: number | null;
  revenue: number | null;
  margin: number | null;
  high52: number | null;
  low52: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  trend: "Bullish" | "Neutral" | "Bearish";
  volume: number | null;
  prices: PricePoint[];
  source: "Yahoo Finance" | "Built-in snapshot";
  updatedAt: string;
};

export type ChatMessage = { id: number; role: Role; content: string; createdAt: string };
export type Conversation = { id: number; title: string; updatedAt: string };
