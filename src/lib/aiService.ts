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

  if (!GEMINI_KEY || GEMINI_KEY === "ضع_مفتاح_جوجل_الخاص_بك_هنا") {
    return "خطأ: لم يتم العثور على مفتاح VITE_GEMINI_API_KEY داخل ملف .env. يرجى إضافته ثم ضغط Publish.";
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const userText = extractText(lastUserMsg) || "مرحباً";

  // قائمة بأسماء نماذج Gemini الرسمية للتجربة التلقائية والتعافي السريع
  const GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro"
  ];

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
      const response = await fetch(url, {
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

      if (response.ok) {
        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply && reply.trim()) {
          return reply.trim();
        }
      }
    } catch (e) {
      console.warn(`Model ${model} connection attempt failed, trying fallback model...`, e);
    }
  }

  return "خطأ: تعذر الحصول على استجابة من نماذج Google Gemini. يرجى التأكد من صلاحية المفتاح في Google AI Studio.";
}
