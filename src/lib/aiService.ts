import { createServerFn } from "@tanstack/react-start";

function extractText(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : item.text || ""))
      .filter(Boolean)
      .join("\n");
  }
  return String(content?.text || content || "");
}

// دالة خادمة تُنفذ على السيرفر لقراءة Secrets والاتصال بالنماذج مباشرة
const fetchAIResponseServer = createServerFn({ method: "POST" })
  .validator((data: { messages: any[] }) => data)
  .handler(async ({ data }) => {
    const messages = data.messages || [];

    // 1. تجربة Google Gemini (Pro ثم Flash)
    const googleKey = (
      process.env.Google ||
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GOOGLE_API_KEY
    )?.trim();

    if (googleKey) {
      // Gemini 1.5 Pro
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${googleKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: messages.map((m) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: extractText(m.content) }],
              })),
              systemInstruction: {
                parts: [{ text: `أنت "Salman AI" مساعد المهندس سلمان فارس. أجب بدقة وبدون جداول.` }],
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
        console.warn("فشل Gemini Pro على السيرفر:", e);
      }

      // Gemini 2.0 Flash
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: messages.map((m) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: extractText(m.content) }],
              })),
              systemInstruction: {
                parts: [{ text: `أنت "Salman AI" مساعد المهندس سلمان فارس. أجب بدقة وبدون جداول.` }],
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
        console.warn("فشل Gemini Flash على السيرفر:", e);
      }
    }

    // 2. تجربة OpenRouter (DeepSeek R1)
    const openRouterKey = (
      process.env.OpenRouter ||
      process.env.VITE_OPENROUTER_API_KEY
    )?.trim();

    if (openRouterKey) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek/deepseek-r1",
            messages: messages.map((m) => ({ role: m.role, content: extractText(m.content) })),
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const text = json.choices?.[0]?.message?.content;
          if (text) return text;
        }
      } catch (e) {
        console.warn("فشل OpenRouter على السيرفر:", e);
      }
    }

    // 3. تجربة Groq (Llama 3.3 عبر مفتاح Cr7)
    const groqKey = (
      process.env.Cr7 ||
      process.env.GROQ_API_KEY ||
      process.env.VITE_GROQ_API_KEY
    )?.trim();

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
            messages: messages.map((m) => ({ role: m.role, content: extractText(m.content) })),
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const text = json.choices?.[0]?.message?.content;
          if (text) return text;
        }
      } catch (e) {
        console.warn("فشل Groq على السيرفر:", e);
      }
    }

    return "عذراً، تعذّر الوصول إلى شبكة الذكاء الاصطناعي حالياً. يرجى التأكد من إضافة مفاتيح API في قائمة Secrets.";
  });

// الدالة الرئيسية المستدعاة في شاشات المحادثة
export async function askSalmanAI(messages: any[]): Promise<string> {
  try {
    return await fetchAIResponseServer({ data: { messages } });
  } catch (err) {
    console.error("خطأ أثناء استدعاء السيرفر:", err);
    return "عذراً، تعذّر الوصول إلى شبكة الذكاء الاصطناعي حالياً. يرجى المحاولة لاحقاً.";
  }
}
