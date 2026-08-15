export async function askSalmanAI(messages: any[]) {
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

  // 2. البحث الذكي عبر الإنترنت (Tavily)
  let searchResultsContext = "";
  const isSearchQuery = /بحث|أخبار|أحدث|ابحث|معلومات|مصادر|رياضة|مباراة|اليوم|سعر/i.test(userQuery);

  if (isSearchQuery && userQuery.trim() !== "") {
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
        if (tavilyData.results && tavilyData.results.length > 0) {
          searchResultsContext = "\n\n[معلومات حديثة تم جلبها مباشرة من البحث]:\n" +
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
- استعن بالمعلومات المحدثة المرفقة في طلبات البحث للإجابة بدقة وبأسلوب منظم يضم مسافات وأسطر واضحة.
- التاريخ الحالي: ${new Date().toISOString().slice(0, 10)}.`
  };

  let hasImage = false;

  // 3. تنظيف وتنسيق الرسائل لدعم Vision API
  const formattedMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m, index) => {
      const isLastMessage = index === messages.length - 1;

      // استخراج الصورة من كافة الأشكال المحتملة (attachment أو image أو base64)
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

      // إذا كانت الرسالة تحتوي على صورة
      if (rawImgUrl && typeof rawImgUrl === "string") {
        hasImage = true;

        // تنظيف Base64 من الأسطر الجديدة والمسافات لتجنب خطأ 400
        let cleanedImgUrl = rawImgUrl.replace(/[\r\n\s]+/g, "");
        if (!cleanedImgUrl.startsWith("data:")) {
          cleanedImgUrl = `data:image/jpeg;base64,${cleanedImgUrl}`;
        }

        // استخراج النص المصاحب للصورة وضمان عدم إرسال string فارغ
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

        const finalText = textContent.trim() || "ماذا يوجد في هذه الصورة؟ اشرحها بالتفصيل.";

        return {
          role: m.role,
          content: [
            { type: "text", text: finalText },
            { type: "image_url", image_url: { url: cleanedImgUrl } }
          ]
        };
      }

      // الرسائل النصية العادية
      let contentStr = "";
      if (typeof m.content === "string") {
        contentStr = m.content;
      } else if (Array.isArray(m.content)) {
        contentStr = m.content
          .map((item: any) => (typeof item === "string" ? item : item.text || ""))
          .join(" ");
      } else {
        contentStr = String(m.content || "");
      }

      if (isLastMessage && searchResultsContext) {
        contentStr += searchResultsContext;
      }

      return {
        role: m.role,
        content: contentStr.trim() || "..."
      };
    });

  // تحديد النموذج المناسب (الرؤية للصور، أو Llama 3.3 للنصوص)
  const selectedModel = hasImage ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile";

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [systemPrompt, ...formattedMessages],
        temperature: 0.5,
        max_tokens: 2048,
      }),
    });

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
