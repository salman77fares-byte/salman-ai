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

// 1. Groq Engine مع تجربة نماذج متعددة
async function callGroq(messages: any[]): Promise<string> {
  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  const formattedMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: extractText(m),
    })),
  ];

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
        if (reply) return reply.trim();
      }
    } catch (e) {
      console.warn(`Groq model ${model} failed`, e);
    }
  }
  throw new Error("Groq failed");
}

// 2. OpenRouter Engine مع تجربة نماذج مجانية متعددة
async function callOpenRouter(messages: any[]): Promise<string> {
  const models = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-2-9b-it:free",
    "mistralai/mistral-7b-instruct:free",
  ];
  const formattedMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: extractText(m),
    })),
  ];

  for (const model of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
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
        if (reply) return reply.trim();
      }
    } catch (e) {
      console.warn(`OpenRouter model ${model} failed`, e);
    }
  }
  throw new Error("OpenRouter failed");
}

// 3. المحرك المباشر الاحتياطي (يعمل مباشرة عبر المتصفح بدون مفاتيح)
async function callPublicEngine(promptText: string): Promise<string> {
  const fullPrompt = `${SYSTEM_PROMPT}\n\nسؤال المستخدم: ${promptText}`;
  const encoded = encodeURIComponent(fullPrompt);

  const urls = [
    `https://text.pollinations.ai/${encoded}?model=openai`,
    `https://text.pollinations.ai/${encoded}?model=mistral`,
    `https://text.pollinations.ai/${encodeURIComponent(promptText)}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim() && !text.includes("An error occurred")) {
          return text.trim();
        }
      }
    } catch (e) {
      console.warn("Public engine URL failed", url);
    }
  }
  throw new Error("All fallbacks failed");
}

export async function askSalmanAI(messages: any[]): Promise<string> {
  const lastUserMsg = messages.filter((m) => m.role === "user").pop();
  const lastText = extractText(lastUserMsg) || "مرحباً";

  // المحاولة 1: Groq
  if (GROQ_KEY && GROQ_KEY.startsWith("gsk_")) {
    try {
      return await callGroq(messages);
    } catch (e) {
      console.warn("Groq failed, switching to OpenRouter...");
    }
  }

  // المحاولة 2: OpenRouter
  if (OPENROUTER_KEY && OPENROUTER_KEY.startsWith("sk-or-")) {
    try {
      return await callOpenRouter(messages);
    } catch (e) {
      console.warn("OpenRouter failed, switching to Public Engine...");
    }
  }

  // المحاولة 3: المحرك المباشر الضامن للاستجابة
  try {
    return await callPublicEngine(lastText);
  } catch (e) {
    console.error("All AI services failed", e);
  }

  return "مرحباً بك! أنا سلمان AI. حدث ضغط مؤقت على الخوادم، يرجى إعادة إرسال رسالتك الآن.";
}
