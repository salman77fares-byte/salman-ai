// src/lib/aiService.ts

// =========================================================
// 🗝️ المفاتيح الاحتياطية (مقبولة من ملف .env والمستندة للمفتاح المباشر)
// =========================================================
const FALLBACK_GEMINI_KEY = "AQ.Ab8RN6ImcuSsUlnTqxMEMu4McIjltEZgkXiMjafzzOx6cTRPmA";
const FALLBACK_GROQ_KEY = "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";
const FALLBACK_OPENROUTER_KEY = "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";

const SYSTEM_PROMPT = "أنت Salman AI، نموذج ذكاء اصطناعي متطور طوره المهندس سلمان فارس. أجب بدقة ووضوح وبطريقة احترافية.";

// دالة تنظيف واستخراج النص
function extractText(m: any): string {
  if (!m) return "";
  if (typeof m === "string") return m.trim();

  if (m.content) {
    if (typeof m.content === "string") return m.content.trim();
    if (Array.isArray(m.content)) {
      return m.content
        .map((item: any) => (typeof item === "string" ? item : item?.text || ""))
        .filter(Boolean)
        .join("\n")
        .trim();
    }
  }

  if (Array.isArray(m.parts)) {
    return m.parts
      .map((p: any) => (p.type === "text" ? p.text : p.text || ""))
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return String(m.text || "").trim();
}

// 1. Google Gemini API
async function callGemini(messages: any[], apiKey: string, signal?: AbortSignal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: extractText(m) }],
      })),
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini Status ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("\n").trim();
  if (!text) throw new Error("Gemini returned empty text");
  return text;
}

// 2. Groq API
async function callGroq(messages: any[], apiKey: string, signal?: AbortSignal) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: extractText(m),
        })),
      ],
    }),
    signal,
  });

  if (!res.ok) throw new Error(`Groq Status ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content;
}

// 3. OpenRouter API
async function callOpenRouter(messages: any[], apiKey: string, signal?: AbortSignal) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: extractText(m),
        })),
      ],
    }),
    signal,
  });

  if (!res.ok) throw new Error(`OpenRouter Status ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content;
}

// 4. Pollinations AI (مزود مجاني أخير)
async function callFreePollinations(messages: any[], signal?: AbortSignal) {
  const res = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: extractText(m),
        })),
      ],
      model: "openai",
    }),
    signal,
  });

  if (!res.ok) throw new Error(`Pollinations Status ${res.status}`);
  const text = await res.text();
  if (!text) throw new Error("Empty response from Pollinations");
  return text;
}

// المنسق الرئيسي للخدمة (Gemini ⬅️ Groq ⬅️ OpenRouter ⬅️ Pollinations)
export async function askSalmanAI(messages: any[], signal?: AbortSignal): Promise<string> {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || FALLBACK_GEMINI_KEY;
  const groqKey = import.meta.env.VITE_GROQ_API_KEY || FALLBACK_GROQ_KEY;
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || FALLBACK_OPENROUTER_KEY;

  // 1. تجربة Google Gemini (تستخدم المفتاح الممرر من .env أو المفتاح المباشر)
  if (geminiKey && !geminiKey.startsWith("ضع_")) {
    try {
      return await callGemini(messages, geminiKey, signal);
    } catch (e: any) {
      console.warn("[Gemini Failed]:", e.message);
    }
  }

  // 2. تجربة Groq
  if (groqKey && !groqKey.startsWith("ضع_")) {
    try {
      return await callGroq(messages, groqKey, signal);
    } catch (e: any) {
      console.warn("[Groq Failed]:", e.message);
    }
  }

  // 3. تجربة OpenRouter
  if (openRouterKey && !openRouterKey.startsWith("ضع_")) {
    try {
      return await callOpenRouter(messages, openRouterKey, signal);
    } catch (e: any) {
      console.warn("[OpenRouter Failed]:", e.message);
    }
  }

  // 4. المحاولة المجانية المضمونة في حال تعثر باقي المفاتيح
  try {
    return await callFreePollinations(messages, signal);
  } catch (e: any) {
    console.error("[Pollinations Failed]:", e.message);
  }

  return "عذراً، تعذّر الاتصال بالخدمة حالياً. يرجى إعادة المحاولة لاحقاً.";
}
