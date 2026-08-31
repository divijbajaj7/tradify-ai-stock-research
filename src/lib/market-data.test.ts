import { describe, expect, it } from "vitest";
import { calculateRsi, normalizeSymbol, symbolFromText } from "./market-data";

describe("market helpers", () => {
  it("normalizes a stock ticker", () => expect(normalizeSymbol("$aapl! ")).toBe("AAPL"));
  it("finds a supported ticker in natural language", () => expect(symbolFromText("Tell me about Microsoft stock")).toBe("MSFT"));
  it("maps Indian company names to Yahoo Finance listings", () => expect(symbolFromText("Do fundamental analysis for TCS stock")).toBe("TCS.NS"));
  it("calculates a strong RSI from rising closes", () => {
    const prices = Array.from({ length: 16 }, (_, index) => ({ date: `2026-01-${index + 1}`, close: 100 + index }));
    expect(calculateRsi(prices)).toBe(100);
  });
});
