// src/lib/aiService.ts

// 1. ضع مفاتيحك مباشرة بين التنصيص هنا
const GROQ_API_KEY = "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";
const OPENROUTER_API_KEY = "sk-or-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";

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
  if (Array.isArray(m.parts)) {
    return m.parts.map((p: any) => (p.type === "text" ? p.text : p.text || "")).filter(Boolean).join("\n").trim();
  }
  return String(m.text || "").trim();
}

// Groq API
async function callGroq(messages: any[], apiKey: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Groq Error: ${data?.error?.message || res.statusText}`);
  return data.choices?.[0]?.message?.content || "";
}

// OpenRouter API
async function callOpenRouter(messages: any[], apiKey: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Salman AI",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: extractText(m),
        })),
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenRouter Error: ${data?.error?.message || res.statusText}`);
  return data.choices?.[0]?.message?.content || "";
}

// Free Public Engine (GET - No CORS)
async function callFreeEngine(promptText: string): Promise<string> {
  const url = `https://text.pollinations.ai/${encodeURIComponent(promptText)}?system=${encodeURIComponent(SYSTEM_PROMPT)}&model=openai`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Free engine failed");
  const text = await res.text();
  if (!text || text.trim().startsWith("An error occurred")) throw new Error("Response error");
  return text.trim();
}

export async function askSalmanAI(messages: any[]): Promise<string> {
  const lastUserMsg = messages.filter((m) => m.role === "user").pop();
  const lastText = extractText(lastUserMsg) || "مرحباً";

  // 1. Groq
  if (GROQ_API_KEY && GROQ_API_KEY.startsWith("gsk_")) {
    try {
      const text = await callGroq(messages, GROQ_API_KEY.trim());
      if (text) return text;
    } catch (e: any) {
      console.warn("Groq failed:", e.message);
    }
  }

  // 2. OpenRouter
  if (OPENROUTER_API_KEY && OPENROUTER_API_KEY.startsWith("sk-or-")) {
    try {
      const text = await callOpenRouter(messages, OPENROUTER_API_KEY.trim());
      if (text) return text;
    } catch (e: any) {
      console.warn("OpenRouter failed:", e.message);
    }
  }

  // 3. المحرك المجاني المباشر
  try {
    const text = await callFreeEngine(lastText);
    if (text) return text;
  } catch (e: any) {
    console.error("Free Engine failed:", e.message);
  }

  return "عذراً، تعذّر الاتصال بالسيرفرات. يرجى التأكد من إضافة المفتاح الصحيح أعلى ملف aiService.ts.";
}
