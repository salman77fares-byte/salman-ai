// دالة بسيطة لضغط الصور فقط
async function compressImage(dataUrl: string): Promise<string> {
  return dataUrl; // يمكنك إضافة كود الضغط السابق هنا، لكن لا داعي للتعقيد حالياً
}

export async function askSalmanAI(messages: any[], signal?: AbortSignal) {
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  
  if (!geminiApiKey) return "خطأ: مفتاح Gemini مفقود.";

  // تنظيف الرسائل
  const validMessages = messages.filter(m => m.role && m.content);
  
  // تحديد ما إذا كان السؤال يحتاج بحثاً
  const lastUserMsg = validMessages[validMessages.length - 1];
  const userQuery = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";
  const needsSearch = /بحث|أخبار|أحدث|ابحث|معلومات|سعر|من هو|ما هو|متى|كم|جديد|نتيجة/i.test(userQuery);

  // نستخدم "gemini-1.5-pro" للأسئلة المعقدة (أذكى بكثير وأقل هلوسة)
  // ونستخدم "gemini-2.0-flash" للأسئلة السريعة
  const modelName = needsSearch ? "gemini-1.5-pro" : "gemini-2.0-flash";

  const contents = validMessages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === 'string' ? m.content : "صورة مرفقة" }]
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

  const requestBody: any = {
    contents: contents,
    systemInstruction: {
      parts: [{ text: `أنت "Salman AI" مساعد المهندس سلمان فارس. 
        - أجب بدقة علمية.
        - إذا لم تكن متأكداً، قل "لا أملك إجابة مؤكدة".
        - لا تستخدم الجداول.
        - استعمل نقاطاً (Bullet Points) واضحة.` }]
    },
    generationConfig: {
      temperature: 0.2, // تقليل الحرارة يقلل الهلوسة جداً
      maxOutputTokens: 2000,
    }
  };

  // تفعيل البحث الأصلي لجوجل فقط عند الحاجة
  if (needsSearch) {
    requestBody.tools = [{ googleSearch: {} }];
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal,
  });

  const data = await response.json();
  
  if (data.error) throw new Error(data.error.message);
  
  return data.candidates[0].content.parts[0].text;
}
