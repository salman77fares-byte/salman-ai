export async function askSalmanAI(messages: { role: string; content: any }[]) {
  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY || "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";
  const tavilyApiKey = import.meta.env.VITE_TAVILY_API_KEY || "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";

  // استخراج آخر سؤال للمستخدم
  const lastUserMsg = messages.filter((m) => m.role === "user").pop();
  let userQuery = "";
  
  if (lastUserMsg) {
    if (typeof lastUserMsg.content === "string") {
      userQuery = lastUserMsg.content;
    } else if (Array.isArray(lastUserMsg.content)) {
      const textItem = lastUserMsg.content.find((item: any) => item.type === "text");
      userQuery = textItem?.text || "";
    }
  }

  let searchResultsContext = "";

  // إذا كان السؤال يتضمن طلب بحث أو أخبار أو معلومات محدثة، نقوم بالبحث عبر Tavily API
  const isSearchQuery = /بحث|أخبار|أحدث|ابحث|معلومات|مصادر|رياضة|مباراة|اليوم|سعر/i.test(userQuery);

  if (isSearchQuery && userQuery.trim() !== "") {
    try {
      const tavilyResponse = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

  // تجهيز الرسائل وإرفاق سياق البحث في نهايتها إن وجد
  const formattedMessages = messages.map((m, index) => {
    let contentStr = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    if (index === messages.length - 1 && searchResultsContext) {
      contentStr += searchResultsContext;
    }
    return {
      role: m.role,
      content: contentStr
    };
  });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [systemPrompt, ...formattedMessages],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("Groq API Error Detail:", errData);
      return `حدث خطأ في الخدمة (${response.status}): ${errData.error?.message || "فشل الاتصال"}`;
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "لم يتم استلام رد.";
  } catch (error: any) {
    console.error("Fetch Exception:", error);
    return `تعذر الاتصال بالخادم: ${error.message || "خطأ في الشبكة"}`;
  }
}
