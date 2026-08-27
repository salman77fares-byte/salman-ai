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

  if (!GROQ_KEY) {
    return "خطأ: مفتاح VITE_GROQ_API_KEY غير موجود في ملف .env. يرجى إضافته وتحديث النشر.";
  }

  const formattedMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: extractText(m),
    })),
  ];

  // قائمة أسماء النماذج المعتمدة والرسمية في Groq
  const MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-specdec",
    "mixtral-8x7b-32768"
  ];

  for (const model of MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return reply.trim();
      }
    } catch (e) {
      console.error(`Error with Groq model ${model}:`, e);
    }
  }

  return "عذراً، متعذر الوصول لخادم Groq حالياً. يرجى التأكد من صحة المفتاح في .env وإعادة المحاولة.";
}
