// src/lib/aiService.ts
// نظام محركات متعاقب: Google Gemini -> OpenRouter -> Groq -> Lovable AI Gateway
// كل محرك معزول تماماً؛ أي فشل (404/403/CORS/شبكة) ينتقل صامتاً للمحرك التالي.

import { buildSearchQuery, needsFreshInfo } from "@/lib/fresh-intent";

type SearchResult = { title: string; url: string; snippet: string };

function baseSystemPrompt(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  return [
    "أنت Salman AI، نموذج ذكاء اصطناعي متطور ودقيق جداً طوّره المهندس سلمان فارس.",
    `نحن حالياً في عام ${now.getUTCFullYear()} (التاريخ بالضبط: ${date}). يجب أن تتوافق جميع الإجابات والمعلومات والأحداث الرياضية والعامة مع هذا السياق الزمني بدقة.`,
    "تجنب التكهن أو إعطاء معلومات قديمة، وقدم إجابات موثوقة ومباشرة وموجزة بدون مقدمات طويلة أو حشو.",
    "قواعد التنسيق الإلزامية:",
    "1) يمنع منعاً تاماً استخدام الجداول (Tables) أو صيغة | --- |، واستبدلها دائماً بقوائم منقطة قصيرة أو بطاقات نصية واضحة.",
    "2) ضع كل الأكواد البرمجية والأوامر النصية والبرومبتات وأي نص طويل يحتاج نسخاً داخل صناديق أكواد بصيغة ``` مع تحديد اللغة.",
    "3) استخدم إيموجيات معبرة ومناسبة في بداية العناوين والفقرات وبجانب النقاط لجعل القراءة ممتعة.",
    "4) استخدم **الخط العريض** للعناوين والكلمات المفتاحية، وقسّم الإجابة إلى نقاط قصيرة، وافصل الأفكار الكبيرة بفاصل بصري ---.",
    "إذا زُوّدت بنتائج بحث حية فاعتمد عليها كمصدر أساسي للحقائق الزمنية ولا تعتمد على بيانات تدريبك القديمة،",
    "واذكر المصادر في النهاية كقائمة روابط مختصرة. إن تعارضت معلوماتك مع نتائج البحث فالنتائج هي الصحيحة.",
  ].join("\n");
}


/** يطلب نتائج بحث حية من نقطة البحث في التطبيق (تعمل من المتصفح والسيرفر). */
async function fetchLiveContext(query: string): Promise<string> {
  const base =
    typeof window !== "undefined"
      ? ""
      : (env("APP_ORIGIN") || env("VITE_APP_ORIGIN") || "http://localhost:8080");
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14_000);
    const res = await fetch(`${base}/api/public/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 6 }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return "";
    const data = (await res.json()) as { results?: SearchResult[]; fetchedAt?: string };
    const results = (data.results ?? []).filter((r) => r?.title);
    if (!results.length) return "";
    const lines = results
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   المصدر: ${r.url}`)
      .join("\n");
    return [
      `نتائج بحث حية من الويب (وقت الجلب: ${data.fetchedAt ?? new Date().toISOString()}) للاستعلام: "${query}"`,
      lines,
      "استخدم هذه النتائج كمرجع أساسي وأجب بشكل محدث ومباشر، ثم اذكر المصادر.",
    ].join("\n");
  } catch {
    return "";
  }
}

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

type ImagePart = { mimeType: string; data: string };
type Msg = { role: "user" | "assistant"; content: string; images?: ImagePart[] };

/** يستخرج الصور المرفقة (base64) من أي شكل للرسالة. */
function extractImages(m: unknown): ImagePart[] {
  if (!m || typeof m !== "object") return [];
  const obj = m as Record<string, unknown>;
  const out: ImagePart[] = [];

  const push = (url: string, fallbackMime?: string) => {
    const match = /^data:([^;]+);base64,(.+)$/.exec(url);
    if (match?.[1] && match[2]) out.push({ mimeType: match[1], data: match[2] });
    else if (url && !url.startsWith("http")) {
      out.push({ mimeType: fallbackMime || "image/jpeg", data: url });
    }
  };

  if (typeof obj["imageBase64"] === "string") {
    push(String(obj["imageBase64"]), String(obj["imageMimeType"] ?? "image/jpeg"));
  } else if (typeof obj["image"] === "string") {
    push(String(obj["image"]));
  }

  const content = obj["content"];
  if (Array.isArray(content)) {
    for (const part of content) {
      const p = part as Record<string, unknown> | null;
      if (p?.["type"] === "image_url") {
        const url = (p["image_url"] as { url?: string } | undefined)?.url;
        if (typeof url === "string") push(url);
      }
    }
  }

  // إزالة التكرار
  const seen = new Set<string>();
  return out.filter((img) => {
    const key = img.data.slice(0, 64);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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
  const content = obj['content'] ?? obj['parts'] ?? obj['text'] ?? obj['message'] ?? obj['value'];
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

/** مهلة قصيرة لكل محرك: أي تأخر ينقل الطلب فوراً للمحرك التالي. */
export const ENGINE_TIMEOUT_MS = 4_000;

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs = ENGINE_TIMEOUT_MS) {
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

async function tryGemini(history: Msg[], systemPrompt: string, grounded: boolean): Promise<string | null> {
  const key = keyFor("gemini");
  if (!key) return null;

  for (const model of GEMINI_MODELS) {
    try {
      const res = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {},
        {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: history.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          // أداة البحث الحي المدمجة في Gemini (Google Search Grounding) مفعّلة دائماً
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.6, topP: 0.9, maxOutputTokens: 1400 },
        },
        grounded ? 8_000 : ENGINE_TIMEOUT_MS,
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
  systemPrompt: string,
  extraHeaders: Record<string, string> = {},
): Promise<string | null> {
  if (!key) return null;
  for (const model of models) {
    try {
      const res = await postJson(
        url,
        { Authorization: `Bearer ${key}`, ...extraHeaders },
        { model, messages: [{ role: "system", content: systemPrompt }, ...history] },
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

const tryOpenRouter = (history: Msg[], systemPrompt: string, _grounded = false) =>
  tryOpenAICompatible(
    "https://openrouter.ai/api/v1/chat/completions",
    keyFor("openrouter"),
    OPENROUTER_MODELS,
    history,
    systemPrompt,
    { "HTTP-Referer": "https://salman-ai.lovable.app", "X-Title": "Salman AI" },
  );

const tryGroq = (history: Msg[], systemPrompt: string, _grounded = false) =>
  tryOpenAICompatible(
    "https://api.groq.com/openai/v1/chat/completions",
    keyFor("groq"),
    GROQ_MODELS,
    history,
    systemPrompt,
  );

/** محرك أخير مضمون عبر بوابة Lovable AI. */
async function tryGateway(history: Msg[], systemPrompt: string, _grounded = false): Promise<string | null> {
  const key = env("LOVABLE_API_KEY");
  if (!key) return null;
  try {
    const res = await postJson(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      { "Lovable-API-Key": key },
      { model: GATEWAY_MODEL, messages: [{ role: "system", content: systemPrompt }, ...history] },
      20_000,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: unknown }[] };
    return extractText(data.choices?.[0]?.message) || null;
  } catch {
    return null;
  }
}

/** المحركات المتاحة للاختيار من الإعدادات. */
export const ENGINE_OPTIONS = [
  { id: "gemini", label: "Google Gemini Flash (سريع + بحث حي)" },
  { id: "groq", label: "Groq GPT-OSS (أسرع استجابة)" },
  { id: "openrouter", label: "OpenRouter (Llama / DeepSeek)" },
  { id: "gateway", label: "Salman Cloud (احتياطي مضمون)" },
] as const;

export type EngineId = (typeof ENGINE_OPTIONS)[number]["id"];
export const ENGINE_STORAGE_KEY = "salman-ai-engine";

function preferredEngine(): EngineId | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const value = localStorage.getItem(ENGINE_STORAGE_KEY) as EngineId | null;
    return value && ENGINE_OPTIONS.some((e) => e.id === value) ? value : null;
  } catch {
    return null;
  }
}

export async function askSalmanAI(messages: unknown[]): Promise<string> {
  const history = normalize(messages);
  // آخر 4 رسائل فقط لتقليل حجم الطلب وزمن الاستجابة
  const safeHistory = history.length
    ? history.slice(-4)
    : [{ role: "user" as const, content: "مرحباً" }];

  // بحث حي تلقائي للأسئلة التي تحتاج معلومات محدّثة زمنياً
  const lastUser = [...safeHistory].reverse().find((m) => m.role === "user")?.content ?? "";
  let systemPrompt = baseSystemPrompt();
  let grounded = false;
  if (needsFreshInfo(lastUser)) {
    const context = await fetchLiveContext(buildSearchQuery(lastUser));
    grounded = true;
    if (context) systemPrompt = `${systemPrompt}\n\n${context}`;
  }

  const engines = {
    gemini: tryGemini,
    openrouter: tryOpenRouter,
    groq: tryGroq,
    gateway: tryGateway,
  } as const;

  const order: EngineId[] = ["gemini", "openrouter", "groq", "gateway"];
  const chosen = preferredEngine();
  const chain = chosen ? [chosen, ...order.filter((e) => e !== chosen)] : order;

  for (const id of chain) {
    try {
      const reply = await engines[id](safeHistory, systemPrompt, grounded);
      if (reply) return reply;
    } catch {
      // انتقال صامت للمحرك التالي
    }
  }


  return "تعذر الاتصال بأي من المحركات حالياً، يرجى المحاولة مرة أخرى بعد قليل.";
}
