const SYSTEM_PROMPT = "أنت Salman AI، نموذج ذكاء اصطناعي متطور طوره المهندس سلمان فارس. أجب بدقة ووضوح وبطريقة احترافية.";

function extractText(m: any): string {
  if (!m) return "";
  if (typeof m === "string") return m.trim();

  if (m.content) {
    if (typeof m.content === "string") return m.content.trim();
    if (Array.isArray(m.content)) {
      return m.content
        .map((item: any) => (typeof item === "string" ? item : item?.text || ""))
        .filter(Boolean)
        .join("\n")
        .trim();
    }
  }

  if (Array.isArray(m.parts)) {
    return m.parts
      .map((p: any) => (p.type === "text" ? p.text : p.text || ""))
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return String(m.text || "").trim();
}

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

async function callBackup(promptText: string): Promise<string> {
  const cleanQuery = encodeURIComponent(`${SYSTEM_PROMPT}\n\nسؤال المستخدم: ${promptText}`);
  const res = await fetch(`https://text.pollinations.ai/${cleanQuery}?model=openai`);

  if (!res.ok) throw new Error("Backup failed");
  const text = await res.text();
  if (!text || text.includes("Error")) throw new Error("Invalid response");
  return text.trim();
}

export async function askSalmanAI(messages: any[]): Promise<string> {
  const env = (import.meta as any).env || {};
  const openRouterKey = (env.VITE_OPENROUTER_API_KEY || env.OPENROUTER_API_KEY || "").trim();
  const groqKey = (env.VITE_GROQ_API_KEY || env.GROQ_API_KEY || "").trim();

  const lastUserMsg = messages.filter((m) => m.role === "user").pop();
  const lastText = extractText(lastUserMsg) || "مرحباً";

  if (openRouterKey && !openRouterKey.includes("ضع_مفتاح")) {
    try {
      const text = await callOpenRouter(messages, openRouterKey);
      if (text) return text;
    } catch (e: any) {
      console.warn("OpenRouter failed:", e.message);
    }
  }

  if (groqKey && !groqKey.includes("ضع_مفتاح")) {
    try {
      const text = await callGroq(messages, groqKey);
      if (text) return text;
    } catch (e: any) {
      console.warn("Groq failed:", e.message);
    }
  }

  try {
    const text = await callBackup(lastText);
    if (text) return text;
  } catch (e: any) {
    console.error("Backup failed:", e.message);
  }

  return "عذراً، تعذّر الاتصال بالسيرفرات. يرجى التأكد من إضافة المفاتيح في ملف .env وإعادة المحاولة.";
}
