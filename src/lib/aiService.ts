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

// 1. OpenRouter API
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

// 2. Groq API
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

// 3. Free Backup Engine (مزدوج لضمان الاستجابة)
async function callFreeEngine(promptText: string): Promise<string> {
  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: promptText }
        ],
        model: "openai"
      }),
    });
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim() && !text.includes("An error occurred")) return text.trim();
    }
  } catch (e) {
    console.warn("Free Engine POST failed, trying GET...");
  }

  const cleanQuery = encodeURIComponent(promptText);
  const res = await fetch(`https://text.pollinations.ai/${cleanQuery}?model=openai`);
  if (!res.ok) throw new Error("Free Engine GET failed");
  const text = await res.text();
  if (!text || text.includes("An error occurred")) throw new Error("Invalid response");
  return text.trim();
}

// المنسق الرئيسي
export async function askSalmanAI(messages: any[]): Promise<string> {
  const openRouterKey = (import.meta.env.VITE_OPENROUTER_API_KEY || "").trim();
  const groqKey = (import.meta.env.VITE_GROQ_API_KEY || "").trim();

  const lastUserMsg = messages.filter((m) => m.role === "user").pop();
  const lastText = extractText(lastUserMsg) || "مرحباً";

  // 1. تجربة OpenRouter
  if (openRouterKey && openRouterKey.startsWith("sk-or-")) {
    try {
      const text = await callOpenRouter(messages, openRouterKey);
      if (text) return text;
    } catch (e: any) {
      console.warn("[OpenRouter Failed]:", e.message);
    }
  }

  // 2. تجربة Groq
  if (groqKey && groqKey.startsWith("gsk_")) {
    try {
      const text = await callGroq(messages, groqKey);
      if (text) return text;
    } catch (e: any) {
      console.warn("[Groq Failed]:", e.message);
    }
  }

  // 3. المحرك المجاني الاحتياطي
  try {
    const text = await callFreeEngine(lastText);
    if (text) return text;
  } catch (e: any) {
    console.error("[Free Engine Failed]:", e.message);
  }

  return "عذراً، تعذّر الاتصال بالسيرفرات حالياً. يرجى التأكد من إضافة المفاتيح الصحيحة وإعادة المحاولة.";
}
