// src/lib/aiService.ts

// رسالة الخطأ العامة الموحدة للظهور للمستخدم النهائي
const GENERAL_ERROR_MESSAGE = "عذراً، تعذّر الاتصال بالخدمة حالياً. يرجى التحقق من اتصالك بالإنترنت والمحاولة لاحقاً.";

// دالة تنظيف واستخراج النص من الرسائل
function extractText(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : item?.text || ""))
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return String(content?.text || content || "").trim();
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
        parts: [{ text: extractText(m.content) }],
      })),
      systemInstruction: {
        parts: [
          {
            text: "أنت Salman AI، نموذج ذكاء اصطناعي متطور طوره المهندس سلمان فارس. أجب بدقة ووضوح.",
          },
        ],
      },
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini Status ${res.status}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p: any) => p.text || "").join("\n").trim();
  if (!text) throw new Error("Gemini returned empty response");
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
        {
          role: "system",
          content: "أنت Salman AI، نموذج ذكاء اصطناعي متطور طوره المهندس سلمان فارس. أجب بدقة ووضوح.",
        },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: extractText(m.content),
        })),
      ],
      temperature: 0.7,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq Status ${res.status}`);
  }

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
        {
          role: "system",
          content: "أنت Salman AI، نموذج ذكاء اصطناعي متطور طوره المهندس سلمان فارس.",
        },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: extractText(m.content),
        })),
      ],
    }),
    signal,
  });

  if (!res.ok) throw new Error(`OpenRouter Status ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content;
}

// المنسق الرئيسي لاستدعاء النماذج
export async function askSalmanAI(messages: any[], signal?: AbortSignal): Promise<string> {
  // الفحص الأولي للاتصال بالإنترنت
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return GENERAL_ERROR_MESSAGE;
  }

  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  // 1. تجربة Google Gemini
  if (geminiKey) {
    try {
      return await callGemini(messages, geminiKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.error("[Internal Log] Gemini failed:", e.message);
    }
  }

  // 2. تجربة Groq
  if (groqKey) {
    try {
      return await callGroq(messages, groqKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.error("[Internal Log] Groq failed:", e.message);
    }
  }

  // 3. تجربة OpenRouter
  if (openRouterKey) {
    try {
      return await callOpenRouter(messages, openRouterKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.error("[Internal Log] OpenRouter failed:", e.message);
    }
  }

  // عند تعذر جميع المزودين أو عدم قراءة المفاتيح تظهر رسالة عامة للمستخدم
  return GENERAL_ERROR_MESSAGE;
}
