// src/lib/aiService.ts

const SYSTEM_PROMPT = "أنت Salman AI، نموذج ذكاء اصطناعي متطور طوره المهندس سلمان فارس. أجب بدقة ووضوح وبطريقة احترافية.";

// قراءة المفاتيح سواء تم تعريفها باسم VITE_ أو بدونها
const GROQ_KEY = (import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY || "").trim();
const OPENROUTER_KEY = (import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.OPENROUTER_API_KEY || "").trim();

function extractText(m: any): string {
  if (!m) return "";
  if (typeof m === "string") return m.trim();
  if (m.content) {
    if (typeof m.content === "string") return m.content.trim();
    if (Array.isArray(m.content)) {
      return m.content.map((item: any) => (typeof item === "string" ? item : item?.text || "")).filter(Boolean).join("\n").trim();
    }
  }
  if (Array.isArray(m.parts)) {
    return m.parts.map((p: any) => (p.type === "text" ? p.text : p.text || "")).filter(Boolean).join("\n").trim();
  }
  return String(m.text || "").trim();
}

export async function askSalmanAI(messages: any[]): Promise<string> {
  const formattedMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: extractText(m),
    })),
  ];

  // 1. المحرك الرئيسي: Groq API (الخيار الأسرع)
  if (GROQ_KEY) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: formattedMessages,
          temperature: 0.7,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return reply.trim();
      }
    } catch (e) {
      console.warn("Groq Error:", e);
    }
  }

  // 2. المحرك الاحتياطي الأول: OpenRouter API
  if (OPENROUTER_KEY) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "X-Title": "Salman AI",
        },
        body: JSON.stringify({
          model: "google/gemma-2-9b-it:free",
          messages: formattedMessages,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return reply.trim();
      }
    } catch (e) {
      console.warn("OpenRouter Error:", e);
    }
  }

  // 3. المحرك الاحتياطي الثاني المباشر (ضمان الاستجابة)
  try {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const lastPrompt = extractText(lastUserMsg) || "مرحباً";
    const fullPrompt = `${SYSTEM_PROMPT}\n\nالمستخدم يسأل: ${lastPrompt}`;

    const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?model=openai`);
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim() && !text.includes("An error occurred")) {
        return text.trim();
      }
    }
  } catch (e) {
    console.error("Backup Engine Error:", e);
  }

  return "عذراً، تعذّر الاتصال بالخدمة حالياً. يرجى المحاولة مرة أخرى.";
}
