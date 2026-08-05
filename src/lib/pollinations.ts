/** Builds a direct Pollinations AI image URL for a prompt. */
export function buildPollinationsUrl(prompt: string, seed?: number): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim().slice(0, 400);
  const finalSeed = seed ?? Math.floor(Math.random() * 1_000_000);
  return `https://pollinations.ai/p/${encodeURIComponent(cleaned)}?width=1024&height=1024&seed=${finalSeed}`;
}
