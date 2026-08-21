// دالة استخراج النص من محتوى الرسائل
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

// دالة جلب المفاتيح بأمان من import.meta.env الخاص بـ Vite
function getApiKey(possibleNames: string[]): string {
  const env = (import.meta as any).env || {};
  for (const name of possibleNames) {
    if (env[name] && typeof env[name] === "string" && env[name].trim() !== "") {
      return env[name].trim();
    }
  }
  return "";
}

// 1. Groq API
async function callGroq(messages: any[], apiKey: string, signal?: AbortSignal) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: extractText(m.content),
      })),
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

// 2. Gemini API
async function callGemini(messages: any[], modelName: string, apiKey: string, signal?: AbortSignal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: extractText(m.content) }],
  }));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{ text: "أنت Salman AI مساعد المهندس سلمان فارس. أجب بدقة وبدون جداول." }],
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

// 3. OpenRouter API
async function callOpenRouter(messages: any[], apiKey: string, signal?: AbortSignal) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: extractText(m.content),
      })),
    }),
    signal,
  });

  if (!res.ok) throw new Error(`OpenRouter Status ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content;
}

// المنسق الرئيسي
export async function askSalmanAI(messages: any[], signal?: AbortSignal): Promise<string> {
  // البحث عن المفاتيح بجميع الأسماء المحتملة
  const groqKey = getApiKey(["VITE_GROQ_API_KEY", "VITE_Cr7", "Cr7"]);
  const googleKey = getApiKey(["VITE_GOOGLE_API_KEY", "VITE_Google", "Google"]);
  const openRouterKey = getApiKey(["VITE_OPENROUTER_API_KEY", "VITE_OpenRouter", "OpenRouter"]);

  // طباعة حالة المفاتيح في Console لتسهيل التتبع
  console.log("API Keys Detected:", {
    Groq: !!groqKey,
    Google: !!googleKey,
    OpenRouter: !!openRouterKey,
  });

  // 1. Groq
  if (groqKey) {
    try {
      return await callGroq(messages, groqKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.warn("Groq failed:", e.message);
    }
  }

  // 2. Gemini Flash
  if (googleKey) {
    try {
      return await callGemini(messages, "gemini-1.5-flash", googleKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.warn("Gemini failed:", e.message);
    }
  }

  // 3. OpenRouter
  if (openRouterKey) {
    try {
      return await callOpenRouter(messages, openRouterKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.warn("OpenRouter failed:", e.message);
    }
  }

  return "عذراً، تعذّر الوصول إلى شبكة الذكاء الاصطناعي حالياً. يرجى التأكد من إدخال المفاتيح ببادئة VITE_ في قائمة Secrets.";
}
