// src/lib/aiService.ts

const SYSTEM_PROMPT = "أنت Salman AI، نموذج ذكاء اصطناعي متطور طوره المهندس سلمان فارس. أجب بدقة ووضوح وبطريقة احترافية.";

function extractText(m: any): string {
  if (!m) return "";
  if (typeof m === "string") return m.trim();
  if (m.content) {
    if (typeof m.content === "string") return m.content.trim();
    if (Array.isArray(m.content)) {
      return m.content.map((item: any) => (typeof item === "string" ? item : item?.text || "")).filter(Boolean).join("\n").trim();
    }
  }
  return String(m.text || "").trim();
}

export async function askSalmanAI(messages: any[]): Promise<string> {
  const GROQ_KEY = (import.meta.env.VITE_GROQ_API_KEY || "").trim();
  const OPENROUTER_KEY = (import.meta.env.VITE_OPENROUTER_API_KEY || "").trim();

  const formattedMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: extractText(m),
    })),
  ];

  // 1. المحرك الأول: Groq API
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
      console.warn("Groq fetch error:", e);
    }
  }

  // 2. المحرك الثاني: OpenRouter API
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
      console.warn("OpenRouter fetch error:", e);
    }
  }

  // 3. المحرك المباشر المضمون (يعمل فوراً دون الاعتماد على مفاتيح البيئة)
  try {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const userPrompt = extractText(lastUserMsg) || "مرحباً";

    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: formattedMessages,
        model: "openai",
        seed: Math.floor(Math.random() * 100000),
      }),
    });

    if (res.ok) {
      const text = await res.text();
      if (text && text.trim() && !text.includes("An error occurred")) {
        return text.trim();
      }
    }
  } catch (e) {
    console.error("Direct engine error:", e);
  }

  return "أهلاً بك! يرجى إعادة محاولة إرسال الرسالة الآن.";
}
