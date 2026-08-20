// دالة مساعدة لطلب نماذج Google Gemini (Pro أو Flash)
async function callGemini(messages: any[], modelName: string, apiKey: string, signal?: AbortSignal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
  }));

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      tools: [{ googleSearch: {} }], // تفعيل محرك بحث جوجل المدمج
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
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`${modelName} returned empty text`);
  return text;
}

// دالة OpenRouter (DeepSeek R1)
async function callOpenRouter(messages: any[], apiKey: string, signal?: AbortSignal) {
  const response = await fetch("https://openrouter.ai/ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-r1",
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
    signal,
  });

  if (!response.ok) throw new Error("OpenRouter Failed");
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
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
    signal,
  });

  if (!response.ok) throw new Error("Groq Failed");
  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

// المنسق الرئيسي (Priority Failover Chain)
export async function askSalmanAI(messages: any[], signal?: AbortSignal) {
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY?.trim();
  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY?.trim();

  // 1. المحاولة الأولى: Gemini 1.5 Pro (الأعلى ذكاءً وبحثاً)
  if (geminiApiKey) {
    try {
      console.log("جاري طلب: Gemini 1.5 Pro...");
      return await callGemini(messages, "gemini-1.5-pro", geminiApiKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.warn("Pro غير متاح أو انتهت كوته، الانتقال إلى Gemini Flash...", e.message);
    }
  }

  // 2. المحاولة الثانية: Gemini 2.0 Flash (سريع + 1500 طلب يومياً + بحث)
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

  // 4. المحاولة الرابعة: Groq (Llama 3.3)
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
