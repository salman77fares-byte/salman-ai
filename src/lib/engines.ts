/** المحركات المتاحة للاختيار من الإعدادات (آمن للمتصفح — بلا مفاتيح). */
export const ENGINE_OPTIONS = [
  { id: "gemini", label: "Google Gemini Flash (سريع + بحث حي)" },
  { id: "groq", label: "Groq GPT-OSS (أسرع استجابة)" },
  { id: "openrouter", label: "OpenRouter (Llama / DeepSeek)" },
  { id: "gateway", label: "Salman Cloud (احتياطي مضمون)" },
] as const;

export type EngineId = (typeof ENGINE_OPTIONS)[number]["id"];
export const ENGINE_STORAGE_KEY = "salman-ai-engine";
