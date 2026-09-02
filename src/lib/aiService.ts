// src/lib/aiService.ts
// نظام محركات متعاقب: Google Gemini -> OpenRouter -> Groq -> Lovable AI Gateway
// كل محرك معزول تماماً؛ أي فشل (404/403/CORS/شبكة) ينتقل صامتاً للمحرك التالي.

const SYSTEM_PROMPT =
  "أنت Salman AI، نموذج ذكاء اصطناعي متطور طوّره المهندس سلمان فارس. أجب بدقة ووضوح وبأسلوب احترافي مباشر دون حشو.";

// مفاتيح احتياطية مضمّنة لضمان عمل الخدمة حتى لو لم تُحمّل متغيرات البيئة.
const FALLBACK_KEYS = {
  gemini: "AQ.Ab8RN6Ia3pJBukWcrhouICMlcX5Z8_FKwuhC6JNfuugP3E9PxA",
  openrouter: "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",
  groq: "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",
};

const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-flash-latest"];
const OPENROUTER_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat-v3.1:free",
];
const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
const GATEWAY_MODEL = "openai/gpt-5.6-sol";

type Msg = { role: "user" | "assistant"; content: string };

function env(name: string): string {
  const fromProcess =
    typeof process !== "undefined" && process.env ? (process.env[name] ?? "") : "";
  if (fromProcess) return fromProcess.trim();
  try {
    const value = (import.meta as unknown as { env?: Record<string, string> }).env?.[name];
    return (value ?? "").trim();
  } catch {
    return "";
  }
}

function keyFor(kind: "gemini" | "openrouter" | "groq"): string {
  const upper = kind.toUpperCase();
  return env(`VITE_${upper}_API_KEY`) || env(`${upper}_API_KEY`) || FALLBACK_KEYS[kind];
}

/** استخراج نص متين من أي شكل للرسالة (نص، كائن، مصفوفة أجزاء). */
export function extractText(m: unknown): string {
  if (m === null || m === undefined) return "";
  if (typeof m === "string") return m.trim();
  if (typeof m === "number" || typeof m === "boolean") return String(m);
  if (Array.isArray(m)) return m.map(extractText).filter(Boolean).join("\n").trim();

  const obj = m as Record<string, unknown>;
  const content = obj.content ?? obj.parts ?? obj.text ?? obj.message ?? obj.value;
  if (content !== undefined && content !== m) {
    const nested = extractText(content);
    if (nested) return nested;
  }
  return "";
}

function normalize(messages: unknown[]): Msg[] {
  const list = Array.isArray(messages) ? messages : [messages];
  return list
    .map((m) => {
      const role = (m as { role?: string } | null)?.role;
      return {
        role: (role === "assistant" || role === "model" ? "assistant" : "user") as Msg["role"],
        content: extractText(m),
      };
    })
    .filter((m) => m.content.length > 0);
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs = 25_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function tryGemini(history: Msg[]): Promise<string | null> {
  const key = keyFor("gemini");
  if (!key) return null;

  for (const model of GEMINI_MODELS) {
    try {
      const res = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {},
        {
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: history.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
        },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const reply = (data.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p?.text ?? "")
        .join("")
        .trim();
      if (reply) return reply;
    } catch {
      // فشل صامت والانتقال للنموذج/المحرك التالي
    }
  }
  return null;
}

async function tryOpenAICompatible(
  url: string,
  key: string,
  models: string[],
  history: Msg[],
  extraHeaders: Record<string, string> = {},
): Promise<string | null> {
  if (!key) return null;
  for (const model of models) {
    try {
      const res = await postJson(
        url,
        { Authorization: `Bearer ${key}`, ...extraHeaders },
        { model, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history] },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as { choices?: { message?: unknown }[] };
      const reply = extractText(data.choices?.[0]?.message);
      if (reply) return reply;
    } catch {
      // فشل صامت
    }
  }
  return null;
}

const tryOpenRouter = (history: Msg[]) =>
  tryOpenAICompatible(
    "https://openrouter.ai/api/v1/chat/completions",
    keyFor("openrouter"),
    OPENROUTER_MODELS,
    history,
    { "HTTP-Referer": "https://salman-ai.lovable.app", "X-Title": "Salman AI" },
  );

const tryGroq = (history: Msg[]) =>
  tryOpenAICompatible(
    "https://api.groq.com/openai/v1/chat/completions",
    keyFor("groq"),
    GROQ_MODELS,
    history,
  );

/** محرك أخير مضمون عبر بوابة Lovable AI. */
async function tryGateway(history: Msg[]): Promise<string | null> {
  const key = env("LOVABLE_API_KEY");
  if (!key) return null;
  try {
    const res = await postJson(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      { "Lovable-API-Key": key },
      { model: GATEWAY_MODEL, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history] },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: unknown }[] };
    return extractText(data.choices?.[0]?.message) || null;
  } catch {
    return null;
  }
}

export async function askSalmanAI(messages: unknown[]): Promise<string> {
  const history = normalize(messages);
  const safeHistory = history.length
    ? history.slice(-12)
    : [{ role: "user" as const, content: "مرحباً" }];

  for (const engine of [tryGemini, tryOpenRouter, tryGroq, tryGateway]) {
    try {
      const reply = await engine(safeHistory);
      if (reply) return reply;
    } catch {
      // انتقال صامت للمحرك التالي
    }
  }

  return "تعذر الاتصال بأي من المحركات حالياً، يرجى المحاولة مرة أخرى بعد قليل.";
}
