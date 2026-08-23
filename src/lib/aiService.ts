// src/lib/aiService.ts

const SYSTEM_PROMPT = "أنت Salman AI، نموذج ذكاء اصطناعي متطور طوره المهندس سلمان فارس. أجب بدقة ووضوح وبطريقة احترافية.";

// مفتاح OpenRouter
const OPENROUTER_KEY = (import.meta.env.VITE_OPENROUTER_API_KEY || "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").trim();

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

  // 1. المحاولة الأولى: أسرع النماذج المجانية وأكثرها استقراراً في OpenRouter
  const FREE_MODELS = [
    "meta-llama/llama-3.1-8b-instruct:free",
    "google/gemma-2-9b-it:free"
  ];

  for (const model of FREE_MODELS) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://salman-ai.lovable.app",
          "X-Title": "Salman AI",
        },
        body: JSON.stringify({
          model: model,
          messages: formattedMessages,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          return reply.trim();
        }
      }
    } catch (e) {
      console.warn(`OpenRouter model ${model} failed, trying next...`);
    }
  }

  // 2. محرك الطوارئ (الضامن): يعمل بصمت إذا فشل OpenRouter أو تعطل المفتاح
  // هذا سيضمن للمستخدمين الحصول على إجابة بدلاً من ظهور رسالة الخطأ
  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: formattedMessages,
        model: "openai",
        seed: Math.floor(Math.random() * 100000)
      }),
    });

    if (res.ok) {
      const text = await res.text();
      if (text && !text.includes("An error occurred")) {
        return text.trim();
      }
    }
  } catch (e) {
    console.error("Backup engine failed", e);
  }

  return "عذراً، الخوادم تتلقى ضغطاً استثنائياً حالياً. يرجى إعادة محاولة إرسال الرسالة بعد قليل.";
}
