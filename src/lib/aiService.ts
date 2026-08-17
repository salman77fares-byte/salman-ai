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

// قائمة النماذج الرسمية النشطة والمعتمدة حالياً فقط على سيرفرات Groq
async function getActiveGroqModels(apiKey: string, hasImage: boolean): Promise<string[]> {
  const activeTextModels = [
    "llama-3.3-70b-versatile",
    "deepseek-r1-distill-llama-70b",
    "llama-3.3-70b-specdec"
  ];

  const activeVisionModels = [
    "llama-3.2-11b-vision-instruct",
    "llama-3.2-90b-vision-instruct"
  ];

  const blacklistedPatterns = [
    "gemma", "mixtral", "preview", "8192", "instant", "llama-3.1-8b", "llama3-8b", "llama3-70b"
  ];

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      const fetchedIds: string[] = (data.data || [])
        .filter((m: any) => m.active !== false)
        .map((m: any) => m.id)
        .filter((id: string) => !blacklistedPatterns.some((p) => id.includes(p)));

      const preferredList = hasImage ? activeVisionModels : activeTextModels;
      const validFromApi = preferredList.filter((id) => fetchedIds.includes(id));

      if (validFromApi.length > 0) return validFromApi;
    }
  } catch (e) {
    console.warn("تعذر جلب النماذج تلقائياً، سيتم استخدام القائمة الافتراضية:", e);
  }

  return hasImage ? activeVisionModels : activeTextModels;
}

export async function askSalmanAI(messages: any[]) {
  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY?.trim();
  const tavilyApiKey = import.meta.env.VITE_TAVILY_API_KEY?.trim();

  if (!groqApiKey) {
    return "خطأ: مفتاح Groq مفقود في إعدادات البيئة (VITE_GROQ_API_KEY).";
  }

  const validMessages = (messages || []).filter(
    (m) => (m.role === "user" || m.role === "assistant") && (m.content || m.attachment || m.image || m.imageBase64)
  );

  const lastUserMsg = [...validMessages].reverse().find((m) => m.role === "user");
  let userQuery = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

  const now = new Date();
  const formattedDate = now.toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
          searchResultsContext = "\n\n[نتائج البحث المباشر في الويب (استخدم هذه البيانات لإعطاء إجابة حقيقية ومحدثة 100%)]:\n" +
            tavilyData.results.map((r: any) => `- ${r.title}: ${r.content}`).join("\n");
        }
      }
    } catch (e) {
      console.warn("تنبيه: تعذر إتمام البحث عبر Tavily:", e);
    }
  }

  const systemPrompt = {
    role: "system",
    content: `أنت "Salman AI"، مساعد ذكي متقدم وذو كفاءة عالية.
- المطور والمؤسس الخاص بك هو "المهندس سلمان فارس".
- تاريخ اليوم المرجعي هو: ${formattedDate}.
- التزم بالدقة العلمية والفعلية التامة في الإجابات ولا تقم باختراع أو تخمين أي معلومات.
- عند وجود نتائج بحث مباشر، اعتمد عليها كمصدر رئيسي ومؤكد للإجابة.`
  };

  let hasImage = false;

  const formattedMessages = await Promise.all(
    validMessages.map(async (m, index) => {
      const isLast = index === validMessages.length - 1;
      let rawImgUrl = m.attachment?.base64 || m.image || m.imageBase64;

      if (rawImgUrl) {
        hasImage = true;
        const url = typeof rawImgUrl === "string" && rawImgUrl.startsWith("data:")
          ? rawImgUrl
          : `data:image/jpeg;base64,${rawImgUrl}`;
        const compressed = await compressImage(url);

        let textPrompt = (typeof m.content === "string" && m.content.trim()) ? m.content : "اشرح الصورة بالتفصيل.";
        if (isLast && searchResultsContext) textPrompt += searchResultsContext;

        return {
          role: m.role,
          content: [
            { type: "text", text: textPrompt },
            { type: "image_url", image_url: { url: compressed } },
          ],
        };
      }

      let textContent = typeof m.content === "string" ? m.content.trim() : JSON.stringify(m.content || "");
      if (!textContent) textContent = "...";
      if (isLast && searchResultsContext) textContent += searchResultsContext;

      return { role: m.role, content: textContent };
    })
  );

  const finalMessages = [systemPrompt, ...formattedMessages];
  const candidateModels = await getActiveGroqModels(groqApiKey, hasImage);

  let lastErrorMessage = "";

  for (const model of candidateModels) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: finalMessages,
          temperature: 0.2,
          max_tokens: 2048,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "لا يوجد رد متوفر.";
      }

      const errorData = await response.json().catch(() => ({}));
      lastErrorMessage = errorData?.error?.message || `Status ${response.status}`;

      if (response.status === 401) {
        return "خطأ 401: المفتاح غير صالح. تأكد من تحديثه في Lovable Secrets واضغط Publish.";
      }
    } catch (e: any) {
      console.warn(`تعذر الاتصال بالنموذج ${model}:`, e);
    }
  }

  return `خطأ من Groq: ${lastErrorMessage}`;
}
