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

// جلب وتصفية النماذج النشطة فقط وحظر أي نموذج ملغى أو تجريبي
async function getActiveGroqModels(apiKey: string, hasImage: boolean): Promise<string[]> {
  const safeTextFallbacks = ["llama-3.3-70b-versatile", "deepseek-r1-distill-llama-70b"];
  const safeVisionFallbacks = ["llama-3.2-11b-vision-instruct", "llama-3.2-90b-vision-instruct"];

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.ok) {
      const data = await res.json();
      const rawModels: any[] = data.data || [];

      const validActive = rawModels
        .filter((m) => m.active !== false)
        .map((m) => m.id as string)
        .filter((id) => {
          const lower = id.toLowerCase();
          return (
            !lower.includes("specdec") &&
            !lower.includes("preview") &&
            !lower.includes("deprecated") &&
            !lower.includes("whisper") &&
            !lower.includes("guard") &&
            !lower.includes("gemma") &&
            !lower.includes("mixtral") &&
            !lower.includes("8192")
          );
        });

      if (hasImage) {
        const visionList = validActive.filter((id) => id.includes("vision"));
        if (visionList.length > 0) return visionList;
      } else {
        const textList = validActive.filter((id) => !id.includes("vision"));
        textList.sort((a, b) => {
          if (a.includes("llama-3.3-70b-versatile")) return -1;
          if (b.includes("llama-3.3-70b-versatile")) return 1;
          return 0;
        });
        if (textList.length > 0) return textList;
      }
    }
  } catch (e) {
    console.warn("تعذر استعلام API النماذج الحية من Groq، استخدام القائمة الافتراضية:", e);
  }

  return hasImage ? safeVisionFallbacks : safeTextFallbacks;
}

// محرك بحث مرن (Tavily أولاً ثم DuckDuckGo كبديل مجاني مباشر)
async function fetchLiveSearchResults(query: string, tavilyApiKey?: string): Promise<string> {
  // 1. تجربة Tavily API عند توفر المفتاح
  if (tavilyApiKey) {
    try {
      const tavilyRes = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyApiKey,
          query: query,
          search_depth: "basic",
          max_results: 5,
        }),
      });
      if (tavilyRes.ok) {
        const tavilyData = await tavilyRes.json();
        if (tavilyData.results?.length) {
          return tavilyData.results.map((r: any) => `- ${r.title}: ${r.content}`).join("\n");
        }
      }
    } catch (e) {
      console.warn("تنبيه: تعذر إتمام البحث عبر Tavily:", e);
    }
  }

  // 2. محرك بحث مجاني احتياطي عبر DuckDuckGo
  try {
    const ddgRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    if (ddgRes.ok) {
      const ddgData = await ddgRes.json();
      const results: string[] = [];
      if (ddgData.AbstractText) results.push(`- ${ddgData.Heading}: ${ddgData.AbstractText}`);
      if (ddgData.RelatedTopics?.length) {
        ddgData.RelatedTopics.slice(0, 5).forEach((t: any) => {
          if (t.Text) results.push(`- ${t.Text}`);
        });
      }
      if (results.length > 0) return results.join("\n");
    }
  } catch (e) {
    console.warn("تنبيه: تعذر البحث عبر البديل المجاني:", e);
  }

  return "";
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

  if (needsSearch && userQuery) {
    const rawSearch = await fetchLiveSearchResults(userQuery, tavilyApiKey);
    if (rawSearch) {
      searchResultsContext = `\n\n[معلومات ونتائج البحث الحية المحدثة من الويب]:\n${rawSearch}`;
    }
  }

  const systemPrompt = {
    role: "system",
    content: `أنت "Salman AI"، مساعد ذكي متقدم وذو كفاءة عالية.
- المطور والمؤسس الخاص بك هو "المهندس سلمان فارس".
- تاريخ اليوم المرجعي هو: ${formattedDate}.
- يمنع تماماً القول "لا يمكنني الوصول للإنترنت" أو "ليس لدي معلومات حديثة".
- قدم دائماً إجابات عملية، مباشرة، ومنظمة في نقاط أو جداول مفصلة بناءً على المعطيات أو نتائج البحث المتاحة.`
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
          temperature: 0.3,
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
