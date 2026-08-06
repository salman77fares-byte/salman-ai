/** Server-only lightweight web search used to ground answers in fresh facts. */
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

export async function searchWeb(query: string, limit = 5): Promise<SearchResult[]> {
  const response = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
    },
    body: new URLSearchParams({ q: query, kl: "wt-wt" }).toString(),
  });
  if (!response.ok) return [];

  const html = await response.text();
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
