// دالة لتصغير وضغط الصور تلقائياً لتفادي أخطاء الحجم والذاكرة
async function compressImage(dataUrl: string, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !dataUrl.startsWith("data:image")) {
      return resolve(dataUrl);
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function askSalmanAI(messages: any[]) {
  // المفتاح الجديد المحدث
  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY || "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";
  const tavilyApiKey = import.meta.env.VITE_TAVILY_API_KEY || "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";

  // 1. استخراج آخر سؤال للمستخدم
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  let userQuery = "";
  
  if (lastUserMsg) {
    if (typeof lastUserMsg.content === "string") {
      userQuery = lastUserMsg.content;
    } else if (Array.isArray(lastUserMsg.content)) {
      const textItem = lastUserMsg.content.find((item: any) => item.type === "text" || typeof item === "string");
      userQuery = typeof textItem === "string" ? textItem : textItem?.text || "";
    }
  }

  // 2. البحث الذكي عبر Tavily عند الحجم للبيانات المحدثة
  let searchResultsContext = "";
  const isSearchQuery = /بحث|أخبار|أحدث|ابحث|معلومات|مصادر|رياضة|مباراة|اليوم|سعر/i.test(userQuery);

  if (isSearchQuery && userQuery.trim() !== "" && tavilyApiKey) {
    try {
      const tavilyResponse = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyApiKey.trim(),
          query: userQuery,
          search_depth: "basic",
          include_answer: true,
          max_results: 5,
        }),
      });

      if (tavilyResponse.ok) {
        const tavilyData = await tavilyResponse.json();
        if (tavilyData.results?.length > 0) {
          searchResultsContext = "\n\n[معلومات حديثة من البحث]:\n" +
            tavilyData.results.map((r: any, i: number) => `${i + 1}. ${r.title}: ${r.content}`).join("\n");
        }
      }
    } catch (err) {
      console.warn("تنبيه: تعذر جلب نتائج البحث من Tavily:", err);
    }
  }

  const systemPrompt = {
    role: "system",
    content: `أنت "Salman AI"، مساعد ذكي عربي متقدّم بشخصية واثقة وعملية.
- مطوّرك ومؤسسك هو "المهندس سلمان فارس" فقط. إذا سُئلت عن هويتك أو قدراتك، قدّم نفسك بأسلوب مميّز: أنك Salman AI، من تطوير المهندس سلمان فارس، ولا تنسب نفسك لأي شركة أو جهة أخرى.
- أسلوبك: عربي احترافي حديث وودّي مع وضوح تقني. ابدأ بالإجابة مباشرة دون مقدمات روبوتية.
- التاريخ الحالي: ${new Date().toISOString().slice(0, 10)}.`
  };

  let hasImage = false;

  // 3. تجهيز وتنسيق الرسائل لدعم الصور والنصوص
  const formattedMessages = await Promise.all(
    messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map(async (m, index) => {
        const isLastMessage = index === messages.length - 1;

        let rawImgUrl: string | null = null;
        if (m.attachment?.base64) {
          rawImgUrl = m.attachment.base64;
        } else if (m.image) {
          rawImgUrl = m.image;
        } else if (m.imageBase64) {
          rawImgUrl = `data:${m.imageMimeType || "image/jpeg"};base64,${m.imageBase64}`;
        } else if (Array.isArray(m.content)) {
          const imgObj = m.content.find((c: any) => c.type === "image_url" || c.image_url);
          if (imgObj?.image_url?.url) rawImgUrl = imgObj.image_url.url;
        }

        if (rawImgUrl && typeof rawImgUrl === "string") {
          hasImage = true;
          const compressedImgUrl = await compressImage(rawImgUrl);

          let textContent = "";
          if (typeof m.content === "string") {
            textContent = m.content;
          } else if (Array.isArray(m.content)) {
            const textObj = m.content.find((item: any) => item.type === "text" || typeof item === "string");
            textContent = typeof textObj === "string" ? textObj : textObj?.text || "";
          }

          if (isLastMessage && searchResultsContext) {
            textContent += searchResultsContext;
          }

          return {
            role: m.role,
            content: [
              { type: "text", text: textContent.trim() || "ماذا يوجد في هذه الصورة؟ اشرحها بالتفصيل." },
              { type: "image_url", image_url: { url: compressedImgUrl } }
            ]
          };
        }

        let contentStr = typeof m.content === "string" ? m.content : JSON.stringify(m.content || "");
        if (isLastMessage && searchResultsContext) {
          contentStr += searchResultsContext;
        }

        return {
          role: m.role,
          content: contentStr.trim() || "..."
        };
      })
  );

  // اختيار النموذج المناسب وحجم المخرجات
  const selectedModel = hasImage ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";
  const finalPayloadMessages = hasImage ? formattedMessages : [systemPrompt, ...formattedMessages];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: finalPayloadMessages,
        temperature: 0.5,
        max_tokens: 2048,
      }),
    });

    if (response.status === 401) {
      return "خطأ (401): مفتاح Groq API غير صالح أو تم حظره مجدداً. يرجى التأكد من إضافة المفتاح في ملف .env وليس بشكل مكشوف في الكود.";
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Groq API Error Detail:", errData);
      return `حدث خطأ أثناء معالجة الطلب. (رمز: ${response.status})`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "لم يتم استلام رد.";
  } catch (error: any) {
    console.error("Fetch Exception:", error);
    return `تعذر الاتصال بالخادم: ${error.message || "خطأ في الشبكة"}`;
  }
}
