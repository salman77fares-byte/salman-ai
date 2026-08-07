import { generateText } from "ai";

import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const QUALITY = "highly detailed, 8k resolution, cinematic lighting, photorealistic, sharp focus";

const SYSTEM = `You translate image requests into English prompts for the Flux text-to-image model.
Rules:
- Output ONLY the final English prompt, nothing else.
- Preserve every specific detail from the request: subjects, car models, brands, colors, counts, environment, time of day, camera angle, art style.
- If the request names a real famous person (athlete, actor, singer, public figure), keep the name AND add precise descriptive terms that help realism, for example: "detailed portrait, high definition, real photograph, realistic lighting, accurate facial features, professional sports photography" for athletes.
- Describe recognisable attributes instead of relying on the name alone (build, hair, kit/outfit colors, typical setting).
- Never invent subjects that were not requested.
- Keep it under 70 words.`;

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
