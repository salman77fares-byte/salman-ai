/** Detects whether a user message is asking Salman AI to create an image. */
const PATTERNS: RegExp[] = [
  /(أنشئ|انشئ|اصنع|صمم|صمّم|ولّد|ولد|توليد|رسم|ارسم|إرسم)\s*(لي)?\s*(صورة|صوره|رسمة|رسمه|لوحة|بوستر|تصميم)/i,
  /صورة\s+(ل|لـ|عن|تمثل|فيها)/i,
  /(generate|create|make|draw|paint|design|render)\s+(me\s+)?(an?\s+)?(image|picture|photo|illustration|drawing|poster|artwork)/i,
  /\b(image|picture)\s+of\b/i,
];

const CLEANERS: RegExp[] = [
  /^(من فضلك|رجاءً|رجاء|please)\s+/i,
  /^(أنشئ|انشئ|اصنع|صمم|صمّم|ولّد|ولد|توليد|ارسم|إرسم|رسم)\s*(لي)?\s*/i,
  /^(صورة|صوره|رسمة|رسمه|لوحة|بوستر|تصميم)\s*(ل|لـ|عن|فيها|تمثل)?\s*/i,
  /^(generate|create|make|draw|paint|design|render)\s+(me\s+)?(an?\s+)?/i,
  /^(image|picture|photo|illustration|drawing|poster|artwork)\s+(of|for|with)?\s*/i,
];

export function isImageRequest(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  return PATTERNS.some((pattern) => pattern.test(value));
}

/** Strips the "make me an image of" wrapper so the model gets a clean subject. */
export function extractImagePrompt(text: string): string {
  let value = text.trim();
  for (const cleaner of CLEANERS) value = value.replace(cleaner, "").trim();
  return value || text.trim();
}
