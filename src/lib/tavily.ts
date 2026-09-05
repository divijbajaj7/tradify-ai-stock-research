import "server-only";

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  published_date?: string;
};

type TavilyResponse = {
  answer?: string;
  results?: TavilyResult[];
};

export async function searchTavily(query: string, days = 30) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("Tavily is not configured");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      topic: "news",
      search_depth: "basic",
      max_results: 5,
      days: Math.min(Math.max(days, 1), 365),
      include_answer: false,
      include_raw_content: false,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Tavily search failed (${response.status})`);

  const payload = (await response.json()) as TavilyResponse;
  return {
    query,
    answer: payload.answer,
    results: (payload.results ?? []).map((result) => ({
      title: result.title ?? "Untitled source",
      url: result.url ?? "",
      publishedDate: result.published_date ?? null,
      snippet: (result.content ?? "").slice(0, 700),
    })),
  };
}
