// src/lib/aiService.ts

// =========================================================
// 🗝️ المفاتيح الاحتياطية (OpenRouter أولاً ثم Groq)
// =========================================================
const FALLBACK_OPENROUTER_KEY = "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";
const FALLBACK_GROQ_KEY = "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";

const SYSTEM_PROMPT = "أنت Salman AI، نموذج ذكاء اصطناعي متطور طوره المهندس سلمان فارس. أجب بدقة ووضوح وبطريقة احترافية.";

// دالة تنظيف واستخراج النص من الرسائل
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

// 1. OpenRouter API (الخيار الأول)
async function callOpenRouter(messages: any[], apiKey: string): Promise<string> {
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
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`OpenRouter Status ${res.status}: ${data?.error?.message || "Invalid Key"}`);
  }
  return data.choices?.[0]?.message?.content || "";
}

// 2. Groq API (الخيار الثاني)
async function callGroq(messages: any[], apiKey: string): Promise<string> {
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
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Groq Status ${res.status}: ${data?.error?.message || "Invalid Key"}`);
  }
  return data.choices?.[0]?.message?.content || "";
}

// 3. Pollinations AI (احتياطي مجاني تلقائي بدون مفاتيح)
async function callFreePollinations(promptText: string): Promise<string> {
  const cleanQuery = encodeURIComponent(`${SYSTEM_PROMPT}\n\nسؤال المستخدم: ${promptText}`);
  const res = await fetch(`https://text.pollinations.ai/${cleanQuery}?model=openai`);

  if (!res.ok) throw new Error(`Pollinations Status ${res.status}`);
  const text = await res.text();
  if (!text || text.includes("Error")) throw new Error("Pollinations response invalid");
  return text.trim();
}

// المنسق الرئيسي للخدمة (OpenRouter ⬅️ Groq ⬅️ Pollinations)
export async function askSalmanAI(messages: any[]): Promise<string> {
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || FALLBACK_OPENROUTER_KEY;
  const groqKey = import.meta.env.VITE_GROQ_API_KEY || FALLBACK_GROQ_KEY;

  const lastUserMsg = messages.filter((m) => m.role === "user").pop();
  const lastText = extractText(lastUserMsg) || "مرحباً";

  // 1. المحاولة الأولى: OpenRouter
  if (openRouterKey && openRouterKey.startsWith("sk-or-")) {
    try {
      const text = await callOpenRouter(messages, openRouterKey);
      if (text) return text;
    } catch (e: any) {
      console.warn("[OpenRouter Failed]:", e.message);
    }
  }

  // 2. المحاولة الثانية: Groq
  if (groqKey && groqKey.startsWith("gsk_")) {
    try {
      const text = await callGroq(messages, groqKey);
      if (text) return text;
    } catch (e: any) {
      console.warn("[Groq Failed]:", e.message);
    }
  }

  // 3. المحاولة الأخيرة: المزود المجاني التلقائي
  try {
    return await callFreePollinations(lastText);
  } catch (e: any) {
    console.error("[Pollinations Failed]:", e.message);
  }

  return "عذراً، تعذّر الاتصال بجميع سيرفرات الذكاء الاصطناعي حالياً. يرجى إعادة المحاولة لاحقاً.";
}
