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

export async function askSalmanAI(messages: any[]) {
  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY?.trim();
  const tavilyApiKey = import.meta.env.VITE_TAVILY_API_KEY?.trim();

  if (!groqApiKey) {
    return "خطأ: مفتاح Groq مفقود في إعدادات البيئة (VITE_GROQ_API_KEY).";
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  let userQuery = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

  // 1. تحديد تاريخ اليوم ديناميكياً لتزويد النموذج بالمرجع الزمني الصحيح
  const now = new Date();
  const formattedDate = now.toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 2. توسيع نطاق البحث لضمان جلب أحدث البيانات والمعلومات المباشرة
  let searchResultsContext = "";
  const needsSearch = /بحث|أخبار|أحدث|ابحث|معلومات|مصادر|رياضة|مباراة|اليوم|سعر|من هو|ما هو|متى|كم|جديد|تاريخ|نتيجة|ترتيب/i.test(userQuery);

  if (needsSearch && tavilyApiKey && userQuery) {
    try {
      const tavilyRes = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyApiKey,
          query: userQuery,
          search_depth: "advanced",
          max_results: 5,
        }),
      });
      if (tavilyRes.ok) {
        const tavilyData = await tavilyRes.json();
        if (tavilyData.results?.length) {
          searchResultsContext = "\n\n[معلومات محدثة من البحث المباشر في الويب]:\n" +
            tavilyData.results.map((r: any) => `- ${r.title}: ${r.content}`).join("\n");
        }
      }
    } catch (e) {
      console.warn("تنبيه: تعذر إتمام البحث عبر Tavily:", e);
    }
  }

  // 3. تعليمات النظام المحسنة
  const systemPrompt = {
    role: "system",
    content: `أنت "Salman AI"، مساعد ذكي متقدم بشخصية واثقة وعملية.
- المطور والمؤسس الخاص بك هو "المهندس سلمان فارس".
- تاريخ اليوم المرجعي هو: ${formattedDate}.
- اعتمد على [معلومات من البحث المباشر] إذا توفرت لإعطاء إجابات دقيقة ومحدثة.
- قدم إجابات مباشرة بدون مقدمات أو حشو.`
  };

  let hasImage = false;

  const formattedMessages = await Promise.all(
    messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map(async (m, index) => {
        const isLast = index === messages.length - 1;
        let rawImgUrl = m.attachment?.base64 || m.image || m.imageBase64;

        if (rawImgUrl) {
          hasImage = true;
          const url = typeof rawImgUrl === "string" && rawImgUrl.startsWith("data:")
            ? rawImgUrl
            : `data:image/jpeg;base64,${rawImgUrl}`;
          const compressed = await compressImage(url);

          let textPrompt = m.content || "اشرح الصورة بالتفصيل.";
          if (isLast && searchResultsContext) textPrompt += searchResultsContext;

          return {
            role: m.role,
            content: [
              { type: "text", text: textPrompt },
              { type: "image_url", image_url: { url: compressed } },
            ],
          };
        }

        let textContent = typeof m.content === "string" ? m.content : JSON.stringify(m.content || "");
        if (isLast && searchResultsContext) textContent += searchResultsContext;

        return { role: m.role, content: textContent };
      })
  );

  const finalMessages = hasImage ? formattedMessages : [systemPrompt, ...formattedMessages];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: hasImage ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
        messages: finalMessages,
        temperature: 0.4,
        max_tokens: 2048,
      }),
    });

    if (response.status === 401) {
      return "خطأ 401: المفتاح غير صالح. تأكد من تحديثه في Lovable Secrets واضغط Publish.";
    }

    if (!response.ok) {
      return `خطأ من Groq: ${response.status}`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "لا يوجد رد متوفر.";
  } catch (e: any) {
    return `تعذر الاتصال بـ Groq: ${e.message || "خطأ في الشبكة"}`;
  }
}
