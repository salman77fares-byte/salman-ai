import { ENGINE_STORAGE_KEY } from "@/lib/engines";
import { extractAndSaveMemories, isMemoryEnabled, listMemories } from "@/lib/memory";

/** يرسل المحادثة إلى /api/chat على السيرفر (المفاتيح لا تغادر السيرفر). */
export async function askSalmanAI(messages: unknown[]): Promise<string> {
  let engine: string | null = null;
  try {
    engine = localStorage.getItem(ENGINE_STORAGE_KEY);
  } catch {
    engine = null;
  }
  const memoryEnabled = isMemoryEnabled();
  let memories: string[] = [];
  if (memoryEnabled) {
    try {
      memories = (await listMemories()).map((m) => m.content);
    } catch {
      memories = [];
    }
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers["Authorization"] = `Bearer ${data.session.access_token}`;
  } catch {
    /* زائر */
  }
  const res = await fetch("/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({ messages, engine, memoryEnabled, memories }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return extractAndSaveMemories(text);
}
