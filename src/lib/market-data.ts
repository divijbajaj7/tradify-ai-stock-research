import type { PricePoint, StockAnalysis } from "./types";

type Seed = Omit<StockAnalysis, "prices" | "source" | "updatedAt" | "sma20" | "sma50" | "sma200" | "rsi14" | "trend"> & { start: number; step: number };
type YahooQuote = Record<string, unknown> & {
  longName?: string; shortName?: string; regularMarketPrice?: number; regularMarketChange?: number;
  regularMarketChangePercent?: number; marketCap?: number; trailingPE?: number; epsTrailingTwelveMonths?: number;
  totalRevenue?: number; profitMargins?: number; fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number; regularMarketVolume?: number;
};
type YahooChart = { quotes?: { date?: Date; close?: number | null; volume?: number | null }[] };
type YahooClient = { quote: (symbol: string) => Promise<YahooQuote>; chart: (symbol: string, options: unknown) => Promise<YahooChart> };

const snapshots: Record<string, Seed> = {
  AAPL: { symbol: "AAPL", name: "Apple Inc.", price: 213.34, change: 2.19, changePercent: 1.04, marketCap: 3210000000000, pe: 33.2, eps: 6.42, revenue: 416000000000, margin: 24.2, high52: 260.1, low52: 164.08, volume: 48000000, start: 187, step: 0.62 },
  MSFT: { symbol: "MSFT", name: "Microsoft Corporation", price: 429.68, change: 4.58, changePercent: 1.08, marketCap: 3190000000000, pe: 35.1, eps: 12.24, revenue: 281000000000, margin: 36.7, high52: 555.45, low52: 344.79, volume: 21100000, start: 389, step: 0.56 },
  NVDA: { symbol: "NVDA", name: "NVIDIA Corporation", price: 176.84, change: -1.22, changePercent: -0.69, marketCap: 4320000000000, pe: 51.7, eps: 3.42, revenue: 165000000000, margin: 55.8, high52: 212.19, low52: 86.62, volume: 159000000, start: 129, step: 1.05 },
  GOOGL: { symbol: "GOOGL", name: "Alphabet Inc.", price: 195.21, change: 0.93, changePercent: 0.48, marketCap: 2350000000000, pe: 22.1, eps: 8.83, revenue: 350000000000, margin: 28.5, high52: 208.7, low52: 140.53, volume: 27100000, start: 169, step: 0.75 },
  TSLA: { symbol: "TSLA", name: "Tesla, Inc.", price: 323.63, change: -3.84, changePercent: -1.17, marketCap: 1040000000000, pe: 183.6, eps: 1.76, revenue: 97700000000, margin: 7.3, high52: 488.54, low52: 212.11, volume: 93600000, start: 264, step: 1.2 },
};

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
export function calculateRsi(prices: PricePoint[], period = 14) {
  if (prices.length <= period) return null;
  const changes = prices.slice(-period - 1).slice(1).map((item, i) => item.close - prices[prices.length - period - 1 + i].close);
  const gains = average(changes.map((n) => Math.max(n, 0))) ?? 0;
  const losses = average(changes.map((n) => Math.max(-n, 0))) ?? 0;
  return losses === 0 ? 100 : Number((100 - 100 / (1 + gains / losses)).toFixed(1));
}
function enrich(base: Omit<StockAnalysis, "sma20" | "sma50" | "sma200" | "rsi14" | "trend">): StockAnalysis {
  const closes = base.prices.map((point) => point.close);
  const moving = (days: number) => average(closes.slice(-days));
  const sma20 = moving(20), sma50 = moving(50), sma200 = moving(200), rsi14 = calculateRsi(base.prices);
  const trend = sma50 && sma200 ? (base.price > sma50 && sma50 >= sma200 ? "Bullish" : base.price < sma50 ? "Bearish" : "Neutral") : "Neutral";
  return { ...base, sma20: sma20 && Number(sma20.toFixed(2)), sma50: sma50 && Number(sma50.toFixed(2)), sma200: sma200 && Number(sma200.toFixed(2)), rsi14, trend };
}
function seededPrices(seed: Seed) {
  return Array.from({ length: 90 }, (_, index) => {
    const date = new Date(Date.now() - (89 - index) * 86400000);
    const wave = Math.sin(index * 0.37) * seed.step * 4 + Math.cos(index * 0.18) * seed.step * 2;
    return { date: date.toISOString().slice(0, 10), close: Number((seed.start + index * seed.step + wave).toFixed(2)), volume: seed.volume ?? undefined };
  }).map((point, index, points) => index === points.length - 1 ? { ...point, close: seed.price } : point);
}
function snapshot(symbol: string) {
  const seed = snapshots[symbol] ?? snapshots.AAPL;
  return enrich({ ...seed, symbol, name: symbol === seed.symbol ? seed.name : `${symbol} (demo fallback)`, prices: seededPrices(seed), source: "Built-in snapshot", updatedAt: new Date().toISOString() });
}

export function normalizeSymbol(value: string) {
  const symbol = value.replace(/[^A-Za-z.\-]/g, "").toUpperCase().slice(0, 10);
  return ({ DMART: "DMART.NS", TCS: "TCS.NS" } as Record<string, string>)[symbol] ?? symbol;
}
export function findSymbolInText(text: string) {
  const match = text.match(/\$?\b(AAPL|MSFT|NVDA|GOOGL|TSLA)\b/i);
  if (match) return match[1].toUpperCase();
  const named = Object.entries({ dmart: "DMART.NS", "avenue supermarts": "DMART.NS", tcs: "TCS.NS", "tata consultancy": "TCS.NS", apple: "AAPL", microsoft: "MSFT", nvidia: "NVDA", alphabet: "GOOGL", google: "GOOGL", tesla: "TSLA" }).find(([name]) => text.toLowerCase().includes(name));
  if (named) return named[1];
  const ticker = text.match(/\$?\b([A-Z]{2,10}(?:\.[A-Z]{1,3})?)\b/);
  return ticker ? normalizeSymbol(ticker[1]) : null;
}
export function symbolFromText(text: string) { return findSymbolInText(text) ?? "AAPL"; }

export async function getStockData(input: string): Promise<StockAnalysis> {
  const symbol = normalizeSymbol(input) || "AAPL";
  try {
    const yahooModule = await import("yahoo-finance2");
    const yahooFinance = new yahooModule.default() as unknown as YahooClient;
    const [quote, chart] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.chart(symbol, { period1: new Date(Date.now() - 100 * 86400000), period2: new Date(), interval: "1d" }),
    ]);
    const prices = (chart.quotes ?? []).filter((item) => item.date && item.close != null).map((item) => ({ date: new Date(item.date!).toISOString().slice(0, 10), close: Number(item.close), volume: item.volume ?? undefined }));
    if (!quote.regularMarketPrice || prices.length < 20) throw new Error("Incomplete Yahoo response");
    return enrich({
      symbol, name: quote.longName ?? quote.shortName ?? symbol, price: quote.regularMarketPrice,
      change: quote.regularMarketChange ?? 0, changePercent: quote.regularMarketChangePercent ?? 0,
      marketCap: quote.marketCap ?? null, pe: quote.trailingPE ?? null, eps: quote.epsTrailingTwelveMonths ?? null,
      revenue: quote.totalRevenue ?? null, margin: quote.profitMargins ? quote.profitMargins * 100 : null,
      high52: quote.fiftyTwoWeekHigh ?? null, low52: quote.fiftyTwoWeekLow ?? null,
      volume: quote.regularMarketVolume ?? null, prices, source: "Yahoo Finance", updatedAt: new Date().toISOString(),
    });
  } catch { return snapshot(symbol); }
}

export function formatMoney(value: number | null, compact = true) {
  if (value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 2 : 2 }).format(value);
}
