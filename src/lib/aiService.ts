// src/lib/aiService.ts

const SYSTEM_PROMPT = "أنت Salman AI، نموذج ذكاء اصطناعي متطور طوره المهندس سلمان فارس. أجب بدقة ووضوح وبطريقة احترافية.";

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
  // نماذج سريعة وموثوقة جداً للإجابات
  const FREE_MODELS = [
    "google/gemma-2-9b-it:free",
    "mistralai/mistral-7b-instruct:free",
    "qwen/qwen-2.5-7b-instruct:free"
  ];

  const formattedMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: extractText(m),
    })),
  ];

  for (const model of FREE_MODELS) {
    const controller = new AbortController();
    // تم ضبط الوقت على 15 ثانية (15000) ليعطي النموذج وقتاً لكتابة الردود الطويلة
    const timeoutId = setTimeout(() => controller.abort(), 15000);

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          return reply.trim();
        }
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      // في حال فشل أو تأخر نموذج، سينتقل بسلاسة للنموذج التالي
    }
  }

  return "عذراً، الخوادم تتلقى ضغطاً استثنائياً حالياً. يرجى إعادة محاولة إرسال الرسالة فوراً.";
}
