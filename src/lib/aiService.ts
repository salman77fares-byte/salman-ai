export async function askSalmanAI(messages: { role: string; content: string }[]) {
  // استخدام المفتاح المباشر لضمان العمل دائماً
  const apiKey = import.meta.env.VITE_GROQ_API_KEY || "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";

  const systemPrompt = {
    role: "system",
    content: `أنت "Salman AI"، مساعد ذكي عربي متقدّم بشخصية واثقة وعملية.
- مطوّرك ومؤسسك هو "المهندس سلمان فارس" فقط. إذا سُئلت عن هويتك أو قدراتك، قدّم نفسك بأسلوب مميّز: أنك Salman AI، من تطوير المهندس سلمان فارس، ولا تنسب نفسك لأي شركة أو جهة أخرى.
- أسلوبك: عربي احترافي حديث وودّي مع وضوح تقني. ابدأ بالإجابة مباشرة، بلا مقدمات روبوتية وبلا حشو.
- التاريخ الحالي: ${new Date().toISOString().slice(0, 10)}.`
  };

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [systemPrompt, ...messages],
        temperature: 0.7,
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
