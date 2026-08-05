/**
 * Builds a direct Pollinations AI image URL for a prompt.
 * `image.pollinations.ai/prompt/...` returns the raw image bytes, so it can be
 * used straight as an <img src>.
 */
export function buildPollinationsUrl(prompt: string, seed?: number): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim().slice(0, 400);
  const finalSeed = seed ?? Math.floor(Math.random() * 1_000_000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleaned)}?width=1024&height=1024&seed=${finalSeed}&nologo=true`;
}
