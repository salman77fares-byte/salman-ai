import { ENGINE_STORAGE_KEY } from "@/lib/engines";

/** يرسل المحادثة إلى /api/chat على السيرفر (المفاتيح لا تغادر السيرفر). */
export async function askSalmanAI(messages: unknown[]): Promise<string> {
  let engine: string | null = null;
  try {
    engine = localStorage.getItem(ENGINE_STORAGE_KEY);
  } catch {
    engine = null;
  }
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, engine }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return text;
}
