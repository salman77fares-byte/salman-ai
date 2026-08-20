// دالة آمنة لجلب المفاتيح من المتصفح بدون التسبب في توقف الكود
function getSecret(keyName: string): string | undefined {
  try {
    const env = (import.meta as any).env || {};
    // تجربة اسم المفتاح المباشر، أو بالبادئة VITE_
    return (
      env[keyName] ||
      env[`VITE_${keyName}`] ||
      env[`VITE_${keyName.toUpperCase()}_API_KEY`] ||
      (typeof process !== "undefined" && process.env ? process.env[keyName] : undefined)
    );
  } catch (e) {
    return undefined;
  }
}

// دالة مساعدة لاستخراج النصوص
function extractText(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : item.text || ""))
      .filter(Boolean)
      .join("\n");
  }
  return String(content?.text || content || "");
}

// 1. Google Gemini
async function callGemini(messages: any[], modelName: string, apiKey: string, signal?: AbortSignal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: extractText(m.content) }],
  }));

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      tools: [{ googleSearch: {} }],
      systemInstruction: {
        parts: [{ text: `أنت "Salman AI" مساعد المهندس سلمان فارس. أجب بدقة وبدون جداول.` }]
      },
      generationConfig: { temperature: 0.2 }
    }),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Status ${response.status}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p: any) => p.text || "").filter(Boolean).join("\n").trim();
  
  if (!text) throw new Error("استجابة فارغة من Gemini");
  return text;
}

// 2. OpenRouter
async function callOpenRouter(messages: any[], apiKey: string, signal?: AbortSignal) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-r1",
      messages: messages.map((m) => ({ role: m.role, content: extractText(m.content) })),
    }),
    signal,
  });

  if (!response.ok) throw new Error(`OpenRouter Status ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

// 3. Groq
async function callGroq(messages: any[], apiKey: string, signal?: AbortSignal) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: messages.map((m) => ({ role: m.role, content: extractText(m.content) })),
    }),
    signal,
  });

  if (!response.ok) throw new Error(`Groq Status ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

// المنسق الرئيسي
export async function askSalmanAI(messages: any[], signal?: AbortSignal) {
  const googleKey = getSecret("Google") || getSecret("GEMINI_API_KEY");
  const openRouterKey = getSecret("OpenRouter");
  const groqKey = getSecret("Cr7") || getSecret("GROQ_API_KEY");

  console.log("المفاتيح المكتشفة:", { 
    Google: !!googleKey, 
    OpenRouter: !!openRouterKey, 
    Groq: !!groqKey 
  });

  // 1. Gemini Pro
  if (googleKey) {
    try {
      console.log("جاري تجربة: Gemini 1.5 Pro");
      return await callGemini(messages, "gemini-1.5-pro", googleKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.warn("فشل Gemini Pro:", e.message);
    }
  }

  // 2. Gemini Flash
  if (googleKey) {
    try {
      console.log("جاري تجربة: Gemini 2.0 Flash");
      return await callGemini(messages, "gemini-2.0-flash", googleKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.warn("فشل Gemini Flash:", e.message);
    }
  }

  // 3. OpenRouter
  if (openRouterKey) {
    try {
      console.log("جاري تجربة: OpenRouter DeepSeek");
      return await callOpenRouter(messages, openRouterKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.warn("فشل OpenRouter:", e.message);
    }
  }

  // 4. Groq
  if (groqKey) {
    try {
      console.log("جاري تجربة: Groq Llama");
      return await callGroq(messages, groqKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.warn("فشل Groq:", e.message);
    }
  }

  return "عذراً، تعذّر الوصول إلى شبكة الذكاء الاصطناعي حالياً. يرجى المحاولة لاحقاً.";
}
