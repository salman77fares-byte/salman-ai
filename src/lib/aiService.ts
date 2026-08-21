// src/lib/aiService.ts

// =========================================================
// 🗝️ المفاتيح الاحتياطية (ضع مفاتيحك الجديدة هنا لتأمين المعاينة)
// =========================================================
const FALLBACK_GEMINI_KEY = "AQ.Ab8RN6KQLFU-YDxOWL0lcytmXmg3vNnC-wsYOX4vmCHbXyDYOw";
const FALLBACK_GROQ_KEY = "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";
const FALLBACK_OPENROUTER_KEY = "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";

const SYSTEM_PROMPT = "أنت Salman AI، نموذج ذكاء اصطناعي متطور طوره المهندس سلمان فارس. أجب بدقة ووضوح وبطريقة احترافية.";

// دالة تنظيف واستخراج النص من الرسائل المختلفة
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
async function callGemini(messages: any[], apiKey: string, signal?: AbortSignal): Promise<string> {
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Gemini Error (${res.status}): ${data?.error?.message || "Invalid Key"}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("\n").trim();
  if (!text) throw new Error("Gemini returned empty text");
  return text;
}

// 2. Groq API
async function callGroq(messages: any[], apiKey: string, signal?: AbortSignal): Promise<string> {
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Groq Error (${res.status}): ${data?.error?.message || "Invalid Key"}`);
  }
  return data.choices?.[0]?.message?.content || "";
}

// 3. OpenRouter API
async function callOpenRouter(messages: any[], apiKey: string, signal?: AbortSignal): Promise<string> {
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`OpenRouter Error (${res.status}): ${data?.error?.message || "Invalid Key"}`);
  }
  return data.choices?.[0]?.message?.content || "";
}

// 4. Pollinations AI (احتياطي مجاني يعمل بدون مفتاح عند طوارئ السيرفرات)
async function callFreePollinations(messages: any[], signal?: AbortSignal): Promise<string> {
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
  return text.trim();
}

// المنسق الرئيسي الذكي (Gemini ⬅️ Groq ⬅️ OpenRouter ⬅️ Pollinations)
export async function askSalmanAI(messages: any[], signal?: AbortSignal): Promise<string> {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || FALLBACK_GEMINI_KEY;
  const groqKey = import.meta.env.VITE_GROQ_API_KEY || FALLBACK_GROQ_KEY;
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || FALLBACK_OPENROUTER_KEY;

  // 1. المحاولة الأولى: Google Gemini
  if (geminiKey && !geminiKey.startsWith("ضع_")) {
    try {
      return await callGemini(messages, geminiKey, signal);
    } catch (e: any) {
      console.warn("[Gemini Failed]:", e.message);
    }
  }

  // 2. المحاولة الثانية: Groq
  if (groqKey && !groqKey.startsWith("ضع_")) {
    try {
      return await callGroq(messages, groqKey, signal);
    } catch (e: any) {
      console.warn("[Groq Failed]:", e.message);
    }
  }

  // 3. المحاولة الثالثة: OpenRouter
  if (openRouterKey && !openRouterKey.startsWith("ضع_")) {
    try {
      return await callOpenRouter(messages, openRouterKey, signal);
    } catch (e: any) {
      console.warn("[OpenRouter Failed]:", e.message);
    }
  }

  // 4. المحاولة الأخيرة: المزود المجاني التلقائي
  try {
    return await callFreePollinations(messages, signal);
  } catch (e: any) {
    console.error("[Pollinations Failed]:", e.message);
  }

  return "عذراً، تعذّر الاتصال بجميع سيرفرات الذكاء الاصطناعي حالياً. يرجى التأكد من صحة المفاتيح وإعادة المحاولة.";
}
