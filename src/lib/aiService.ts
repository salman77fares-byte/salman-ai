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

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
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

    const data = await response.json();

    if (response.ok) {
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply && reply.trim()) {
        return reply.trim();
      }
      return "تم استلام الطلب لكن الاستجابة فارغة، يرجى إرسال السؤال مرة أخرى.";
    }

    const errorDetails = data?.error?.message || response.statusText;
    return `خطأ من خادم جوجل Gemini (${response.status}): ${errorDetails}`;
  } catch (error: any) {
    console.error("Gemini Fetch Error:", error);
    return `خطأ في اتصال الشبكة: ${error?.message || "تعذر الوصول لخوادم جوجل."}`;
  }
}
