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
  const GEMINI_KEY = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
  const GROQ_KEY = (import.meta.env.VITE_GROQ_API_KEY || "").trim();
  const OPENROUTER_KEY = (import.meta.env.VITE_OPENROUTER_API_KEY || "").trim();

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const userText = extractText(lastUserMsg) || "مرحباً";

  // 1. المحرك الرئيسي المباشر: Google Gemini API
  if (GEMINI_KEY && GEMINI_KEY !== "ضع_مفتاح_جوجل_هنا") {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${SYSTEM_PROMPT}\n\nسؤال المستخدم: ${userText}` }]
            }
          ]
        })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply && reply.trim()) return reply.trim();
      }
    } catch (e) {
      console.warn("Gemini Engine Exception:", e);
    }
  }

  // 2. المحرك الثاني: Groq API
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
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply && reply.trim()) return reply.trim();
      }
    } catch (e) {
      console.warn("Groq Engine Exception:", e);
    }
  }

  // 3. المحرك الثالث: OpenRouter API
  if (OPENROUTER_KEY) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemma-2-9b-it:free",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userText }
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply && reply.trim()) return reply.trim();
      }
    } catch (e) {
      console.warn("OpenRouter Engine Exception:", e);
    }
  }

  return "يرجى إدخال مفتاح VITE_GEMINI_API_KEY الصحيح في ملف .env وتحديث النشر برفع الملف للعمل فوراً.";
}
