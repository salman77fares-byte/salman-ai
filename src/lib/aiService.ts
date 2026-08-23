// src/lib/aiService.ts

const SYSTEM_PROMPT = "أنت Salman AI، نموذج ذكاء اصطناعي متطور طوره المهندس سلمان فارس. أجب بدقة ووضوح وبطريقة احترافية.";

const GROQ_KEY = (import.meta.env.VITE_GROQ_API_KEY || "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").trim();
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

// 1. Groq Engine
async function callGroq(messages: any[]): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_KEY}`,
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

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Groq status: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// 2. OpenRouter Engine
async function callOpenRouter(messages: any[]): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
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

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `OpenRouter status: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// 3. Fallback Engine (Direct JSON POST)
async function callBackup(messages: any[]): Promise<string> {
  const formattedMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: extractText(m),
    })),
  ];

  const res = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: formattedMessages,
      model: "openai",
      seed: Math.floor(Math.random() * 100000),
    }),
  });

  if (!res.ok) throw new Error(`Backup status: ${res.status}`);
  const text = await res.text();
  if (!text || text.trim().startsWith("An error occurred")) {
    throw new Error("Invalid backup response");
  }

  return text.trim();
}

export async function askSalmanAI(messages: any[]): Promise<string> {
  // محاولة Groq أولاً
  try {
    const text = await callGroq(messages);
    if (text) return text;
  } catch (e: any) {
    console.warn("Groq Failed:", e.message);
  }

  // محاولة OpenRouter ثانياً
  try {
    const text = await callOpenRouter(messages);
    if (text) return text;
  } catch (e: any) {
    console.warn("OpenRouter Failed:", e.message);
  }

  // المحرك الاحتياطي المباشر ثالثاً
  try {
    const text = await callBackup(messages);
    if (text) return text;
  } catch (e: any) {
    console.warn("Backup Failed:", e.message);
  }

  return "عذراً، تعذّر الاتصال بالسيرفرات حالياً. يرجى إعادة المحاولة بعد لحظات.";
}
