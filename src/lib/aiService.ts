import { createServerFn } from "@tanstack/react-start";

// تنظيف وتنسيق النصوص قبل إرسالها للـ API
function cleanText(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : item?.text || ""))
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return String(content?.text || content || "").trim();
}

const fetchAIResponseServer = createServerFn({ method: "POST" })
  .validator((data: { messages: any[] }) => data)
  .handler(async ({ data }) => {
    const rawMessages = data.messages || [];

    // تصفية الرسائل والتأكد من وجود نص غير فارغ
    const validMessages = rawMessages
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: cleanText(m.content),
      }))
      .filter((m) => m.content.length > 0);

    if (validMessages.length === 0) {
      return "يرجى كتابة نص للبدء في المحادثة.";
    }

    // جلب المفاتيح من بيئة التشغيل
    const googleKey = (
      process.env.Google ||
      process.env.VITE_GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY
    )?.trim();

    const groqKey = (
      process.env.Cr7 ||
      process.env.GROQ_API_KEY ||
      process.env.VITE_GROQ_API_KEY
    )?.trim();

    const openRouterKey = (
      process.env.OpenRouter ||
      process.env.VITE_OPENROUTER_API_KEY
    )?.trim();

    // 1. الخيار الأول: Groq (Llama 3.3 عبر مفتاح Cr7) - أسرع استجابة
    if (groqKey) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: validMessages,
            temperature: 0.7,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const text = json.choices?.[0]?.message?.content;
          if (text) return text;
        }
      } catch (e) {
        console.warn("Groq failed:", e);
      }
    }

    // 2. الخيار الثاني: Gemini Flash
    if (googleKey) {
      try {
        const geminiContents = validMessages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: geminiContents,
              systemInstruction: {
                parts: [{ text: "أنت Salman AI مساعد المهندس سلمان فارس. أجب بدقة وبدون جداول." }],
              },
            }),
          }
        );

        if (res.ok) {
          const json = await res.json();
          const text = json.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n").trim();
          if (text) return text;
        }
      } catch (e) {
        console.warn("Gemini Flash failed:", e);
      }
    }

    // 3. الخيار الثالث: OpenRouter
    if (openRouterKey) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.3-70b-instruct:free",
            messages: validMessages,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const text = json.choices?.[0]?.message?.content;
          if (text) return text;
        }
      } catch (e) {
        console.warn("OpenRouter failed:", e);
      }
    }

    return "عذراً، تعذّر الوصول إلى شبكة الذكاء الاصطناعي حالياً. يرجى التأكد من إضافة مفاتيح API في قائمة Secrets.";
  });

export async function askSalmanAI(messages: any[]): Promise<string> {
  try {
    return await fetchAIResponseServer({ data: { messages } });
  } catch (err) {
    console.error("Server Call Error:", err);
    return "عذراً، تعذّر الوصول إلى شبكة الذكاء الاصطناعي حالياً. يرجى المحاولة لاحقاً.";
  }
}
