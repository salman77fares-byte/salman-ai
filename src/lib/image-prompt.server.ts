import { generateText } from "ai";

import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const QUALITY = "highly detailed, 8k resolution, cinematic lighting, photorealistic, sharp focus";

const SYSTEM = `You translate image requests into English prompts for a text-to-image model.
Rules:
- Output ONLY the final English prompt, nothing else.
- Preserve every specific detail from the request: subjects, car models, brands, colors, counts, environment, time of day, camera angle, art style.
- Never invent subjects that were not requested.
- Keep it under 60 words.`;

/** Turns an Arabic/any-language request into a detailed English image prompt. */
export async function buildEnglishImagePrompt(prompt: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const fallback = `${prompt}, ${QUALITY}`;
  if (!apiKey) return fallback;

  try {
    const gateway = createLovableAiGatewayProvider(apiKey);
    const { text } = await generateText({
      model: gateway("google/gemini-3.1-flash-lite"),
      system: SYSTEM,
      prompt: prompt.slice(0, 600),
    });
    const cleaned = text.replace(/^["'«»\s]+|["'«»\s]+$/g, "").replace(/\s+/g, " ").trim();
    if (!cleaned) return fallback;
    return `${cleaned}, ${QUALITY}`;
  } catch (error) {
    console.error("[image-prompt] translation failed", error);
    return fallback;
  }
}
