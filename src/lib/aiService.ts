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
  const OPENROUTER_KEY = (import.meta.env.VITE_OPENROUTER_API_KEY || "").trim();

  if (!OPENROUTER_KEY) {
    return "خطأ: لم يتم العثور على VITE_OPENROUTER_API_KEY في ملف .env. يرجى إضافته وإعادة الضغط على Publish.";
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const userText = extractText(lastUserMsg) || "مرحباً";

  // النماذج المجانية المعتمدة في OpenRouter والتي تتجاوز الحظر الجغرافي
  const MODELS = [
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-r1:free"
  ];

  for (const model of MODELS) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": "https://lovable.dev",
          "X-Title": "Salman AI",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userText }
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply && reply.trim()) {
          return reply.trim();
        }
      }
    } catch (error) {
      console.warn(`OpenRouter model ${model} failed, trying next...`, error);
    }
  }

  return "تعذر الاتصال بالنموذج حالياً، يرجى التأكد من صحة مفتاح OpenRouter في ملف .env.";
}
