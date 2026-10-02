import { supabase } from "@/integrations/supabase/client";

/** وضع الذاكرة: حفظ في قاعدة البيانات للمسجّلين، وفي المتصفح للضيوف. */
export type Memory = { id: string; content: string; created_at: string };

export const MEMORY_ENABLED_KEY = "salman-memory-enabled";
const LOCAL_KEY = "salman-memories";
export const MEMORY_CHANGED_EVENT = "salman-memories-changed";

export function isMemoryEnabled(): boolean {
  try {
    return localStorage.getItem(MEMORY_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMemoryEnabled(on: boolean) {
  localStorage.setItem(MEMORY_ENABLED_KEY, on ? "1" : "0");
}

function readLocal(): Memory[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]") as Memory[];
  } catch {
    return [];
  }
}
function writeLocal(list: Memory[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}
function notify() {
  window.dispatchEvent(new Event(MEMORY_CHANGED_EVENT));
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function listMemories(): Promise<Memory[]> {
  const uid = await currentUserId();
  if (!uid) return readLocal();
  const { data, error } = await supabase
    .from("user_memories")
    .select("id, content, created_at")
    .order("created_at", { ascending: true });
  if (error) return readLocal();
  return data ?? [];
}

export async function addMemory(content: string): Promise<void> {
  const text = content.trim().slice(0, 300);
  if (!text) return;
  const existing = await listMemories();
  if (existing.some((m) => m.content.trim() === text)) return;
  const uid = await currentUserId();
  if (uid) {
    const { error } = await supabase.from("user_memories").insert({ user_id: uid, content: text });
    if (error) throw error;
  } else {
    writeLocal([
      ...readLocal(),
      { id: crypto.randomUUID(), content: text, created_at: new Date().toISOString() },
    ]);
  }
  notify();
}

export async function deleteMemory(id: string): Promise<void> {
  const uid = await currentUserId();
  if (uid) {
    const { error } = await supabase.from("user_memories").delete().eq("id", id);
    if (error) throw error;
  } else {
    writeLocal(readLocal().filter((m) => m.id !== id));
  }
  notify();
}

/** يستخرج وسوم <memory>…</memory> من رد النموذج ويحفظها، ويعيد النص نظيفاً. */
export function extractAndSaveMemories(reply: string): string {
  const found: string[] = [];
  const clean = reply
    .replace(/<memory>([\s\S]*?)<\/memory>/gi, (_, fact: string) => {
      if (fact.trim()) found.push(fact.trim());
      return "";
    })
    .trim();
  if (found.length && isMemoryEnabled()) {
    void (async () => {
      for (const f of found) {
        try {
          await addMemory(f);
        } catch {
          // تجاهل
        }
      }
    })();
  }
  return clean;
}
