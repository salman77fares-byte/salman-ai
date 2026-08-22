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

// 1. محرك Groq
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

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Groq error status: ${res.status}`);
  return data.choices?.[0]?.message?.content || "";
}

// 2. محرك OpenRouter
async function callOpenRouter(messages: any[]): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
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

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenRouter error status: ${res.status}`);
  return data.choices?.[0]?.message?.content || "";
}

// 3. محرك مجاني مباشر (بدون قيود CORS)
async function callPollinations(promptText: string): Promise<string> {
  const query = `${SYSTEM_PROMPT}\n\nسؤال المستخدم: ${promptText}`;
  const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);
  const text = await res.text();
  if (!text || text.includes("An error occurred")) throw new Error("Pollinations empty or invalid response");
  return text.trim();
}

export async function askSalmanAI(messages: any[]): Promise<string> {
  const lastUserMsg = messages.filter((m) => m.role === "user").pop();
  const lastText = extractText(lastUserMsg) || "مرحباً";

  // تجربة Groq
  try {
    const text = await callGroq(messages);
    if (text) return text;
  } catch (e: any) {
    console.error("Groq Error:", e?.message || e);
  }

  // تجربة OpenRouter
  try {
    const text = await callOpenRouter(messages);
    if (text) return text;
  } catch (e: any) {
    console.error("OpenRouter Error:", e?.message || e);
  }

  // تجربة المحرك الاحتياطي المباشر
  try {
    const text = await callPollinations(lastText);
    if (text) return text;
  } catch (e: any) {
    console.error("Pollinations Error:", e?.message || e);
  }

  return "عذراً، حدثت مشكلة في الاتصال بالخدمة. يرجى مراجعة وحدة التحكم (Console) للتأكد من حالة المفاتيح.";
}
