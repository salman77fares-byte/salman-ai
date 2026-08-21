// src/lib/aiService.ts

const SYSTEM_PROMPT = "أنت Salman AI، نموذج ذكاء اصطناعي متطور طوره المهندس سلمان فارس. أجب بدقة ووضوح وبطريقة احترافية.";

// دالة لاستخراج النص من أي هيكل رسالة
function extractText(m: any): string {
  if (!m) return "";
  if (typeof m === "string") return m.trim();
  if (m.content) {
    if (typeof m.content === "string") return m.content.trim();
    if (Array.isArray(m.content)) {
      return m.content.map((i: any) => (typeof i === "string" ? i : i?.text || "")).join("\n").trim();
    }
  }
  if (Array.isArray(m.parts)) {
    return m.parts.map((p: any) => (p.type === "text" ? p.text : p.text || "")).join("\n").trim();
  }
  return String(m.text || "").trim();
}

// 1. سيرفر مباشر ومضمون 100% بدون أي مفاتيح API (GET Request)
async function callFreeDirect(promptText: string): Promise<string> {
  const cleanPrompt = encodeURIComponent(`${SYSTEM_PROMPT}\n\nالمستخدم يسأل: ${promptText}`);
  const res = await fetch(`https://text.pollinations.ai/${cleanPrompt}?model=openai`);
  
  if (!res.ok) throw new Error(`Free Engine Status: ${res.status}`);
  const text = await res.text();
  if (!text || text.startsWith("Error")) throw new Error("Free Engine returned invalid response");
  return text.trim();
}

// 2. Google Gemini API
async function callGemini(messages: any[], apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: extractText(m) }],
      })),
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini Error (${res.status}): ${data?.error?.message || "Invalid Key"}`);
  
  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("\n").trim();
  if (!text) throw new Error("Gemini returned empty text");
  return text;
}

// 3. Groq API
async function callGroq(messages: any[], apiKey: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: extractText(m),
        })),
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Groq Error (${res.status}): ${data?.error?.message || "Invalid Key"}`);
  return data.choices?.[0]?.message?.content;
}

// المنسق الرئيسي للخدمة
export async function askSalmanAI(messages: any[]): Promise<string> {
  const lastUserMsg = messages.filter((m) => m.role === "user").pop();
  const userText = extractText(lastUserMsg) || "مرحبا";

  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || "AQ.Ab8RN6ImcuSsUlnTqxMEMu4McIjltEZgkXiMjafzzOx6cTRPmA";
  const groqKey = import.meta.env.VITE_GROQ_API_KEY || "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";

  // الخيار 1: المحاولة بالسيرفر المجاني المباشر لتضمن عمل الشات فوراً
  try {
    const freeResponse = await callFreeDirect(userText);
    if (freeResponse) return freeResponse;
  } catch (e: any) {
    console.error("[Free Engine Failed]:", e.message);
  }

  // الخيار 2: تجربة Gemini
  if (geminiKey && !geminiKey.startsWith("ضع_")) {
    try {
      return await callGemini(messages, geminiKey);
    } catch (e: any) {
      console.error("[Gemini Failed]:", e.message);
    }
  }

  // الخيار 3: تجربة Groq
  if (groqKey && !groqKey.startsWith("ضع_")) {
    try {
      return await callGroq(messages, groqKey);
    } catch (e: any) {
      console.error("[Groq Failed]:", e.message);
    }
  }

  return "عذراً، تعذّر الاتصال بجميع سيرفرات الذكاء الاصطناعي حالياً. يرجى مراجعة Console لمعرفة تفاصيل الخطأ.";
}
