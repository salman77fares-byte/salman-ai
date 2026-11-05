/** Free image engines (no paid keys). Some reuse a base model with a style preset. */
export const IMAGE_MODELS = [
  { id: "flux", label: "Flux Schnell — متوازن وسريع", model: "flux", style: "" },
  { id: "flux-realism", label: "Flux واقعي — صور فوتوغرافية", model: "flux", style: "ultra realistic photograph, DSLR, natural skin texture" },
  { id: "flux-anime", label: "Flux أنمي — رسوم يابانية", model: "flux", style: "anime style illustration, vibrant colors, studio quality" },
  { id: "flux-3d", label: "Flux ثلاثي الأبعاد — 3D", model: "flux", style: "3D render, octane render, pixar style" },
  { id: "turbo", label: "Turbo (SDXL) — الأسرع", model: "turbo", style: "" },
  { id: "gptimage", label: "GPT Image — دقة عالية للتفاصيل", model: "gptimage", style: "" },
  { id: "sana", label: "Sana — جودة فنية", model: "sana", style: "" },
] as const;

export type ImageModelId = (typeof IMAGE_MODELS)[number]["id"];

/** Builds a direct Pollinations image URL usable as an <img src>. */
export function buildPollinationsUrl(prompt: string, seed?: number, modelId: ImageModelId = "flux"): string {
  const m = IMAGE_MODELS.find((x) => x.id === modelId) ?? IMAGE_MODELS[0];
  const full = m.style ? `${prompt}, ${m.style}` : prompt;
  const cleaned = full.replace(/\s+/g, " ").trim().slice(0, 450);
  const finalSeed = seed ?? Math.floor(Math.random() * 100_000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleaned)}?width=1024&height=1024&model=${m.model}&nologo=true&seed=${finalSeed}`;
}
