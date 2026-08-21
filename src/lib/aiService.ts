// src/lib/aiService.ts

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

// 1. OpenRouter API
async function callOpenRouter(messages: any[], apiKey: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
      "X-Title": "Salman AI",
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
  if (!res.ok) throw new Error(`OpenRouter (${res.status}): ${data?.error?.message || "Invalid Key"}`);
  return data.choices?.[0]?.message?.content || "";
}

// 2. Groq API
async function callGroq(messages: any[], apiKey: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
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
  if (!res.ok) throw new Error(`Groq (${res.status}): ${data?.error?.message || "Invalid Key"}`);
  return data.choices?.[0]?.message?.content || "";
}

// 3. Pollinations Free Direct Engine (محرّك احتياطي يعمل بدون مفاتيح)
async function callPollinations(messages: any[]): Promise<string> {
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
  });

  if (!res.ok) throw new Error(`Pollinations Status ${res.status}`);
  const text = await res.text();
  if (!text || text.startsWith("Error")) throw new Error("Invalid response");
  return text.trim();
}

// المنسق الرئيسي للخدمة (OpenRouter ⬅️ Groq ⬅️ Pollinations)
export async function askSalmanAI(messages: any[]): Promise<string> {
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;

  // 1. المحاولة الأولى: OpenRouter
  if (openRouterKey && openRouterKey.trim() !== "" && !openRouterKey.includes("ضع_مفتاح")) {
    try {
      const res = await callOpenRouter(messages, openRouterKey.trim());
      if (res) return res;
    } catch (e: any) {
      console.warn("[OpenRouter Error]:", e.message);
    }
  }

  // 2. المحاولة الثانية: Groq
  if (groqKey && groqKey.trim() !== "" && !groqKey.includes("ضع_مفتاح")) {
    try {
      const res = await callGroq(messages, groqKey.trim());
      if (res) return res;
    } catch (e: any) {
      console.warn("[Groq Error]:", e.message);
    }
  }

  // 3. المحاولة الثالثة: المحرك المجاني المباشر
  try {
    const res = await callPollinations(messages);
    if (res) return res;
  } catch (e: any) {
    console.error("[Pollinations Error]:", e.message);
  }

  return "عذراً، تعذّر الاتصال بجميع سيرفرات الذكاء الاصطناعي حالياً. يرجى التأكد من إضافة المفاتيح في Secrets وإعادة المحاولة.";
}
