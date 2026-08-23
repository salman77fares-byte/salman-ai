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

// 1. محرك Groq المباشر
async function tryGroq(formattedMessages: any[]): Promise<string | null> {
  if (!GROQ_KEY) return null;
  const models = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];
  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature: 0.7,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply && reply.trim()) return reply.trim();
      }
    } catch (e) {
      console.warn(`Groq error:`, e);
    }
  }
  return null;
}

// 2. محرك OpenRouter
async function tryOpenRouter(formattedMessages: any[]): Promise<string | null> {
  if (!OPENROUTER_KEY) return null;
  const models = [
    "google/gemma-2-9b-it:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "mistralai/mistral-7b-instruct:free"
  ];
  for (const model of models) {
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
          model,
          messages: formattedMessages,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply && reply.trim()) return reply.trim();
      }
    } catch (e) {
      console.warn(`OpenRouter error:`, e);
    }
  }
  return null;
}

// 3. المحرك المباشر الضامن (GET Request بدون مفاتيح أو CORS)
async function tryDirectGet(prompt: string): Promise<string | null> {
  try {
    const fullPrompt = `${SYSTEM_PROMPT}\n\nالمستخدم يسأل: ${prompt}`;
    const url = `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?model=openai`;
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim() && !text.includes("An error occurred")) {
        return text.trim();
      }
    }
  } catch (e) {
    console.warn("Direct GET error:", e);
  }
  return null;
}

export async function askSalmanAI(messages: any[]): Promise<string> {
  const formattedMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: extractText(m),
    })),
  ];

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const lastPrompt = extractText(lastUserMsg) || "مرحباً";

  // تجربة Groq أولاً
  const groqReply = await tryGroq(formattedMessages);
  if (groqReply) return groqReply;

  // تجربة OpenRouter ثانياً
  const openRouterReply = await tryOpenRouter(formattedMessages);
  if (openRouterReply) return openRouterReply;

  // المحرك المباشر الضامن ثالثاً
  const getReply = await tryDirectGet(lastPrompt);
  if (getReply) return getReply;

  return "مرحباً بك! أنا Salman AI. تم إنعاش الاتصال، يرجى إعادة كتابة رسالتك وسأجيبك فوراً.";
}
