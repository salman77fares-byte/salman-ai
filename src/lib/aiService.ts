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
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const userText = extractText(lastUserMsg) || "مرحباً";

  // 1. التجربة عبر Groq API بواسطة POST
  const GROQ_KEY = (import.meta.env.VITE_GROQ_API_KEY || "").trim();
  if (GROQ_KEY) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userText }
          ],
          temperature: 0.7,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply && reply.trim()) return reply.trim();
      }
    } catch (e) {
      console.warn("Groq POST error:", e);
    }
  }

  // 2. المحرك الضامن عبر POST (بدون قيود على طول النص)
  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userText }
        ],
        model: "openai"
      }),
    });

    if (res.ok) {
      const text = await res.text();
      if (text && text.trim() && !text.includes("An error occurred")) {
        return text.trim();
      }
    }
  } catch (e) {
    console.error("Pollinations POST error:", e);
  }

  return "تعذر جلب الإجابة حالياً، يرجى محاولة إعادة إرسال السؤال.";
}
