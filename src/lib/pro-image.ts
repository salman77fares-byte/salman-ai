import { z } from "zod";
import { buildPollinationsUrl, type ImageModelId } from "./pollinations";

export type GenerationModelId = ImageModelId | "openai-pro";
export const proImageSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  apiKey: z.string().trim().min(1).max(512).regex(/^[^\s]+$/),
});

// Deliberately session-only: never serialize credentials to storage or gallery.
let sessionKey = "";
export const getImageKey = () => sessionKey;
export const setImageKey = (value: string) => { sessionKey = value.trim(); };
export const defaultImageModel = (key: string): GenerationModelId => key.trim() ? "openai-pro" : "flux";
export const proImageBody = (prompt: string) => ({
  model: "gpt-image-1", prompt, quality: "high", size: "1024x1024", n: 1,
});

export async function generateImageUrl(prompt: string, model: GenerationModelId): Promise<string> {
  if (!navigator.onLine) throw new Error("لا يوجد اتصال بالإنترنت. يرجى الاتصال لإنشاء الصور.");
  if (model !== "openai-pro") return buildPollinationsUrl(prompt, undefined, model);
  const parsed = proImageSchema.safeParse({ prompt, apiKey: sessionKey });
  if (!parsed.success) throw new Error("أدخل مفتاح OpenAI في صفحة إنشاء الصور لإعادة التوليد الاحترافي.");
  const response = await fetch("/api/images", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });
  const data = await response.json() as { image?: string; error?: string };
  if (!response.ok || !data.image) throw new Error(data.error || "تعذّر توليد الصورة الاحترافية.");
  return data.image;
}