// ضغط الصور لتقليل استهلاك الـ API وسرعة الرد
async function compressImage(dataUrl: string, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !dataUrl.startsWith("data:image")) return resolve(dataUrl);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width, height = img.height;
      if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL("image/jpeg", quality)); }
      else resolve(dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// 1. مزود Google Gemini (الخيار الأول والأساسي)
async function callGemini(contents: any[], systemInstructionText: string, apiKey: string, signal?: AbortSignal) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstructionText }] },
      contents: contents,
      tools: [{ googleSearch: {} }], // البحث المباشر في جوجل
    }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Gemini Status ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
  if (!text) throw new Error("Gemini returned empty text");
  return text;
}

// 2. مزود OpenRouter (الخيار الثاني / احتياطي)
async function callOpenRouter(openaiMessages: any[], apiKey: string, signal?: AbortSignal) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-r1",
      messages: openaiMessages,
      temperature: 0.3,
      max_tokens: 2048,
    }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `OpenRouter Status ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("OpenRouter returned empty text");
  return text;
}

// 3. مزود Groq (الخيار الثالث / الأخير)
async function callGroq(openaiMessages: any[], apiKey: string, hasImage: boolean, signal?: AbortSignal) {
  const model = hasImage ? "llama-3.2-11b-vision-instruct" : "llama-3.3-70b-versatile";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: openaiMessages,
      temperature: 0.3,
      max_tokens: 2048,
    }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Groq Status ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Groq returned empty text");
  return text;
}

// الوظيفة الرئيسية لتنسيق الطلبات والتحويل التلقائي عند الفشل
export async function askSalmanAI(messages: any[], signal?: AbortSignal) {
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  const openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY?.trim();
  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY?.trim();

  const validMessages = (messages || []).filter(
    (m) => (m.role === "user" || m.role === "assistant") && (m.content || m.attachment || m.image || m.imageBase64)
  );

  const now = new Date();
  const formattedDate = now.toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const systemInstructionText = `أنت "Salman AI"، مساعد ذكي متقدم بتطوير المهندس سلمان فارس.
- تاريخ اليوم المرجعي هو: ${formattedDate}.
- **قواعد التنسيق الصارمة**:
  1. يُمنع تماماً استخدام الجداول (Markdown Tables) لأنها تخرج عن حدود الشاشة في الهواتف.
  2. اعرض جميع الإجابات والمعلومات والنتائج في شكل **سرد متسلسل، فقرات واضحة، أو نقاط محدودة (Bullet Points)** فقط.
  3. لا تعتذر ولا تقل "لا يمكنني الوصول للإنترنت"، واعرض الأخبار والمعلومات المطلوبة مباشرة بشكل جذاب ومباشر.`;

  let hasImage = false;

  // إعداد بيانات الرسائل لصيغتي Gemini و OpenAI
  const geminiContents: any[] = [];
  const openaiMessages: any[] = [{ role: "system", content: systemInstructionText }];

  for (const m of validMessages) {
    const role = m.role === "assistant" ? "model" : "user";
    const openAiRole = m.role === "assistant" ? "assistant" : "user";
    let rawImgUrl = m.attachment?.base64 || m.image || m.imageBase64;

    if (rawImgUrl) {
      hasImage = true;
      const url = typeof rawImgUrl === "string" && rawImgUrl.startsWith("data:")
        ? rawImgUrl
        : `data:image/jpeg;base64,${rawImgUrl}`;
      const compressed = await compressImage(url);
      const base64Data = compressed.split(",")[1] || compressed;
      let textPrompt = (typeof m.content === "string" && m.content.trim()) ? m.content : "اشرح الصورة بالتفصيل.";

      // صيغة Gemini
      geminiContents.push({
        role: role,
        parts: [
          { text: textPrompt },
          { inlineData: { mimeType: "image/jpeg", data: base64Data } }
        ]
      });

      // صيغة OpenAI/Groq/OpenRouter
      openaiMessages.push({
        role: openAiRole,
        content: [
          { type: "text", text: textPrompt },
          { type: "image_url", image_url: { url: compressed } }
        ]
      });
    } else {
      let textContent = typeof m.content === "string" ? m.content.trim() : JSON.stringify(m.content || "");
      if (!textContent) textContent = "...";

      geminiContents.push({
        role: role,
        parts: [{ text: textContent }]
      });

      openaiMessages.push({
        role: openAiRole,
        content: textContent
      });
    }
  }

  // 1. المحاولة الأولى: Google Gemini
  if (geminiApiKey) {
    try {
      return await callGemini(geminiContents, systemInstructionText, geminiApiKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.warn("فشل الاتصال بـ Gemini، جاري التحول إلى OpenRouter:", e);
    }
  }

  // 2. المحاولة الثانية: OpenRouter
  if (openRouterApiKey) {
    try {
      return await callOpenRouter(openaiMessages, openRouterApiKey, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.warn("فشل الاتصال بـ OpenRouter، جاري التحول إلى Groq:", e);
    }
  }

  // 3. المحاولة الثالثة: Groq
  if (groqApiKey) {
    try {
      return await callGroq(openaiMessages, groqApiKey, hasImage, signal);
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      console.error("فشل الاتصال بـ Groq أيضاً:", e);
    }
  }

  return "عذراً، تعذّر الاتصال بجميع مزودي الخدمة حالياً. يرجى التحقق من مفاتيح API الخاصة بك والاتصال بالشبكة.";
}
