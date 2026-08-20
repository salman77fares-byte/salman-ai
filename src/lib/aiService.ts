// دالة مساعدة لاستخراج النص الصريح من محتوى الرسالة
function extractText(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : item.text || ""))
      .filter(Boolean)
      .join("\n");
  }
  if (content && typeof content === "object" && content.text) return content.text;
  return String(content || "");
}

// دالة طلب نماذج Google Gemini (Pro أو Flash)
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
        parts: [{ text: `أنت "Salman AI" مساعد المهندس سلمان فارس. أجب بدقة واستخدم نقاطاً محدودة وبدون جداول.` }]
      },
      generationConfig: { temperature: 0.2 }
    }),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini ${modelName} Status ${response.status}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p: any) => p.text || "").join("\n").trim();
  
  if (!text) throw new Error(`${modelName} returned empty text`);
  return text;
}

// دالة OpenRouter (DeepSeek R1)
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

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenRouter Status ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

// دالة Groq (Llama 3.3)
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

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq Status ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

// المنسق الرئيسي (Priority Failover Chain)
export async function askSalmanAI(messages: any[], signal?: AbortSignal) {
  // جلب المفاتيح بدعم جميع أسماء Secrets المتاحة
  const geminiApiKey = (
    process.env.Google ||
    process.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_GOOGLE_API_KEY ||
    import.meta.env.Google
  )?.trim();

  const openRouterApiKey = (
    process.env.OpenRouter ||
    process.env.VITE_OPENROUTER_API_KEY ||
    import.meta.env.VITE_OPENROUTER_API_KEY ||
    import.meta.env.OpenRouter
  )?.trim();

  const groqApiKey = (
    process.env.Cr7 ||
    process.env.VITE_GROQ_API_KEY ||
    import.meta.env.VITE_GROQ_API_KEY ||
    import.meta.env.Cr7
  )?.trim();

  // 1. المحاولة الأولى: Gemini 1.5 Pro
  if (geminiApiKey) {
    try {
      console.log("جاري طلب: Gemini 1.5 Pro...");
      return await callGemini(messages, "gemini-1.5-pro", geminiApiKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.warn("Pro غير متاح، الانتقال إلى Gemini Flash...", e.message);
    }
  }

  // 2. المحاولة الثانية: Gemini 2.0 Flash
  if (geminiApiKey) {
    try {
      console.log("جاري طلب: Gemini 2.0 Flash...");
      return await callGemini(messages, "gemini-2.0-flash", geminiApiKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.warn("Flash غير متاح، الانتقال إلى OpenRouter...", e.message);
    }
  }

  // 3. المحاولة الثالثة: OpenRouter (DeepSeek R1)
  if (openRouterApiKey) {
    try {
      console.log("جاري طلب: OpenRouter DeepSeek...");
      return await callOpenRouter(messages, openRouterApiKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.warn("OpenRouter غير متاح، الانتقال إلى Groq...", e.message);
    }
  }

  // 4. المحاولة الرابعة: Groq (Llama 3.3 عبر مفتاح Cr7)
  if (groqApiKey) {
    try {
      console.log("جاري طلب: Groq Llama...");
      return await callGroq(messages, groqApiKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.error("فشلت جميع النماذج:", e.message);
    }
  }

  return "عذراً، تعذّر الوصول إلى شبكة الذكاء الاصطناعي حالياً. يرجى المحاولة لاحقاً.";
}
