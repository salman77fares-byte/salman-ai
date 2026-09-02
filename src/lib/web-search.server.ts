/** Server-only live web search used to ground answers in fresh facts. */
export type SearchResult = { title: string; url: string; snippet: string };

function decode(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function env(name: string): string {
  return (typeof process !== "undefined" && process.env ? (process.env[name] ?? "") : "").trim();
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms = 12_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** Tavily — high quality, used when a key is configured. */
async function tavily(query: string, limit: number): Promise<SearchResult[]> {
  const key = env("TAVILY_API_KEY");
  if (!key) return [];
  const res = await withTimeout((signal) =>
    fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        query,
        max_results: limit,
        search_depth: "basic",
        topic: "general",
        include_answer: false,
      }),
      signal,
    }),
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
  return (data.results ?? [])
    .map((r) => ({ title: r.title ?? "", url: r.url ?? "", snippet: (r.content ?? "").slice(0, 500) }))
    .filter((r) => r.title && r.url);
}

/** Serper (Google) — used when a key is configured. */
async function serper(query: string, limit: number): Promise<SearchResult[]> {
  const key = env("SERPER_API_KEY");
  if (!key) return [];
  const res = await withTimeout((signal) =>
    fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": key },
      body: JSON.stringify({ q: query, num: limit, hl: "ar" }),
      signal,
    }),
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    organic?: { title?: string; link?: string; snippet?: string }[];
  };
  return (data.organic ?? [])
    .map((r) => ({ title: r.title ?? "", url: r.link ?? "", snippet: r.snippet ?? "" }))
    .filter((r) => r.title && r.url)
    .slice(0, limit);
}

/** DuckDuckGo HTML scrape — free, no key. */
async function duckduckgo(query: string, limit: number): Promise<SearchResult[]> {
  const res = await withTimeout((signal) =>
    fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
      },
      body: new URLSearchParams({ q: query, kl: "wt-wt" }).toString(),
      signal,
    }),
  );
  if (!res.ok) return [];

  const html = await res.text();
  const results: SearchResult[] = [];
  const blocks = html.split('class="result__body"').slice(1);

  for (const block of blocks) {
    const linkMatch = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(block);
    const snippetMatch = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/.exec(block);
    if (!linkMatch) continue;

    let url = decode(linkMatch[1] ?? "");
    const redirect = /uddg=([^&]+)/.exec(url);
    if (redirect?.[1]) url = decodeURIComponent(redirect[1]);

    const title = decode(linkMatch[2] ?? "");
    const snippet = decode(snippetMatch?.[1] ?? "");
    if (!title || !url) continue;

    results.push({ title, url, snippet });
    if (results.length >= limit) break;
  }

  return results;
}

/** Wikipedia — last-resort factual grounding. */
async function wikipedia(query: string, limit: number): Promise<SearchResult[]> {
  const url =
    "https://ar.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=" +
    limit +
    "&srsearch=" +
    encodeURIComponent(query);
  const res = await withTimeout((signal) => fetch(url, { signal }));
  if (!res.ok) return [];
  const data = (await res.json()) as {
    query?: { search?: { title?: string; snippet?: string }[] };
  };
  return (data.query?.search ?? [])
    .map((r) => ({
      title: r.title ?? "",
      url: `https://ar.wikipedia.org/wiki/${encodeURIComponent(r.title ?? "")}`,
      snippet: decode(r.snippet ?? ""),
    }))
    .filter((r) => r.title);
}

/** Runs providers in order of quality and returns the first non-empty result set. */
export async function searchWeb(query: string, limit = 6): Promise<SearchResult[]> {
  const trimmed = query.trim().slice(0, 400);
  if (!trimmed) return [];

  for (const provider of [tavily, serper, duckduckgo, wikipedia]) {
    try {
      const results = await provider(trimmed, limit);
      if (results.length) return results.slice(0, limit);
    } catch {
      // انتقال صامت لمزوّد البحث التالي
    }
  }
  return [];
}
