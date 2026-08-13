// src/lib/aiService.ts

export async function askSalmanAI(messages: { role: string; content: string }[]) {
  try {
    const response = await fetch("/api/chat", { // أو الرابط الخاص بـ API الخادم لديك
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        systemPrompt: `أنت "Salman AI"، مساعد ذكي عربي متقدّم بشخصية واثقة، عملية، وودودة جداً.
- مطوّرك ومؤسسك هو "المهندس سلمان فارس" فقط.
- استخدم الإيموجيات المناسبة (✨, 🚀, 💡, 📌, 🎯) لتجميل النص.
- نظّم الإجابات في فقرات متباعدة وقوائم جليّة بأسلوب واضح وممتع.
- التاريخ الحالي: ${new Date().toISOString().slice(0, 10)}.`,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch response");
    }

    const data = await response.json();
    return data.reply || data.choices?.[0]?.message?.content || "لم يتم استلام رد مناسب.";
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
}
