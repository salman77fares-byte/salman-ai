// src/lib/aiService.ts
// Triple-Tier Fallback System: Google Gemini -> OpenRouter -> Groq

const SYSTEM_PROMPT =
  "أنت Salman AI، نموذج ذكاء اصطناعي متطور طوره المهندس سلمان فارس. أجب بدقة ووضوح وبطريقة احترافية ومباشرة دون حشو.";

const FALLBACK_GEMINI_KEY = "AQ.Ab8RN6KGMJdiMVtgQRgjPMeDey_4R_i6XnHdiWt02fEGA6XS6w";

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
const OPENROUTER_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-r1:free",
];
const GROQ_MODELS = ["llama-3.1-8b-instant"];

/** استخراج نص متين من أي شكل للرسالة (نص، كائن، مصفوفة أجزاء). */
export function extractText(m: any): string {
  if (m === null || m === undefined) return "";
  if (typeof m === "string") return m.trim();
  if (typeof m === "number" || typeof m === "boolean") return String(m);
  if (Array.isArray(m)) return m.map(extractText).filter(Boolean).join("\n").trim();

  const content = m.content ?? m.parts ?? m.text ?? m.message ?? m.value;
  if (content !== undefined && content !== m) {
    const nested = extractText(content);
    if (nested) return nested;
  }
  return "";
}

function normalize(messages: any[]): { role: "user" | "assistant"; content: string }[] {
  const list = Array.isArray(messages) ? messages : [messages];
  return list
    .map((m) => ({
      role: (m?.role === "assistant" || m?.role === "model" ? "assistant" : "user") as
        | "user"
        | "assistant",
      content: extractText(m),
    }))
    .filter((m) => m.content.length > 0);
}

async function tryGemini(history: { role: "user" | "assistant"; content: string }[]) {
  const key = (import.meta.env.VITE_GEMINI_API_KEY || FALLBACK_GEMINI_KEY).trim();
  if (!key) return null;

  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: history.map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
          }),
        },
      );
      if (!res.ok) continue;
      const data: any = await res.json();
      const reply = (data?.candidates?.[0]?.content?.parts || [])
        .map((p: any) => p?.text || "")
        .join("")
        .trim();
      if (reply) return reply;
    } catch {
      // فشل صامت والانتقال للنموذج/المحرك التالي
    }
  }
  return null;
}

async function tryOpenRouter(history: { role: "user" | "assistant"; content: string }[]) {
  const key = (import.meta.env.VITE_OPENROUTER_API_KEY || "").trim();
  if (!key) return null;

  for (const model of OPENROUTER_MODELS) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "HTTP-Referer": "https://lovable.dev",
          "X-Title": "Salman AI",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        }),
      });
      if (!res.ok) continue;
      const data: any = await res.json();
      const reply = extractText(data?.choices?.[0]?.message);
      if (reply) return reply;
    } catch {
      // فشل صامت
    }
  }
  return null;
}

async function tryGroq(history: { role: "user" | "assistant"; content: string }[]) {
  const key = (import.meta.env.VITE_GROQ_API_KEY || "").trim();
  if (!key) return null;

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        }),
      });
      if (!res.ok) continue;
      const data: any = await res.json();
      const reply = extractText(data?.choices?.[0]?.message);
      if (reply) return reply;
    } catch {
      // فشل صامت
    }
  }
  return null;
}

export async function askSalmanAI(messages: any[]): Promise<string> {
  const history = normalize(messages);
  const safeHistory = history.length ? history.slice(-12) : [{ role: "user" as const, content: "مرحباً" }];

  for (const engine of [tryGemini, tryOpenRouter, tryGroq]) {
    try {
      const reply = await engine(safeHistory);
      if (reply) return reply;
    } catch {
      // انتقال صامت للمحرك التالي
    }
  }

  return "تعذر الاتصال بأي من المحركات حالياً، يرجى المحاولة مرة أخرى بعد قليل.";
}
