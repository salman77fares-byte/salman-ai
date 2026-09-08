// src/lib/memory.ts
// وضع الذاكرة: حفظ حقائق وتفضيلات المستخدم عبر كل المحادثات.
// عند تسجيل الدخول تُحفظ في جدول user_memories، وإلا في localStorage.

import { supabase } from "@/integrations/supabase/client";

export type Memory = { id: string; content: string; created_at: string };

export const MEMORY_ENABLED_KEY = "salman-ai-memory-enabled";
export const MEMORY_LOCAL_KEY = "salman-ai-memories";
export const MEMORY_EVENT = "salman-memory-changed";

const MAX_MEMORIES = 60;

function browser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function notify() {
  if (browser()) window.dispatchEvent(new Event(MEMORY_EVENT));
}

export function isMemoryEnabled(): boolean {
  if (!browser()) return false;
  try {
    return localStorage.getItem(MEMORY_ENABLED_KEY) !== "off";
  } catch {
    return false;
  }
}

export function setMemoryEnabled(enabled: boolean) {
  if (!browser()) return;
  try {
    localStorage.setItem(MEMORY_ENABLED_KEY, enabled ? "on" : "off");
  } catch {
    /* تجاهل */
  }
  notify();
}

function readLocal(): Memory[] {
  if (!browser()) return [];
  try {
    const raw = localStorage.getItem(MEMORY_LOCAL_KEY);
    const list = raw ? (JSON.parse(raw) as Memory[]) : [];
    return Array.isArray(list) ? list.filter((m) => m && typeof m.content === "string") : [];
  } catch {
    return [];
  }
}

function writeLocal(list: Memory[]) {
  if (!browser()) return;
  try {
    localStorage.setItem(MEMORY_LOCAL_KEY, JSON.stringify(list.slice(0, MAX_MEMORIES)));
  } catch {
    /* تجاهل */
  }
  notify();
}

async function currentUserId(): Promise<string | null> {
  if (!browser()) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** قائمة الذكريات (السحابة عند تسجيل الدخول، وإلا المحلية). */
export async function listMemories(): Promise<Memory[]> {
  const userId = await currentUserId();
  if (!userId) return readLocal();
  try {
    const { data, error } = await supabase
      .from("user_memories")
      .select("id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_MEMORIES);
    if (error) return readLocal();
    return data ?? [];
  } catch {
    return readLocal();
  }
}

export async function addMemory(content: string): Promise<boolean> {
  const text = content.trim().slice(0, 400);
  if (!text) return false;

  const existing = await listMemories();
  if (existing.some((m) => m.content.trim().toLowerCase() === text.toLowerCase())) return false;

  const userId = await currentUserId();
  if (userId) {
    try {
      const { error } = await supabase.from("user_memories").insert({ user_id: userId, content: text });
      if (!error) {
        notify();
        return true;
      }
    } catch {
      /* الرجوع للتخزين المحلي */
    }
  }
  writeLocal([
    { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, content: text, created_at: new Date().toISOString() },
    ...readLocal(),
  ]);
  return true;
}

export async function deleteMemory(id: string): Promise<void> {
  if (id.startsWith("local-")) {
    writeLocal(readLocal().filter((m) => m.id !== id));
    return;
  }
  try {
    await supabase.from("user_memories").delete().eq("id", id);
    notify();
  } catch {
    /* تجاهل */
  }
}

export async function clearMemories(): Promise<void> {
  const userId = await currentUserId();
  if (userId) {
    try {
      await supabase.from("user_memories").delete().eq("user_id", userId);
    } catch {
      /* تجاهل */
    }
  }
  writeLocal([]);
}

/** كتلة تُدمج في بداية الـ SYSTEM_PROMPT. */
export async function memoryPromptBlock(): Promise<string> {
  if (!isMemoryEnabled()) return "";
  const memories = await listMemories();
  if (!memories.length) return "";
  const lines = memories.slice(0, 30).map((m) => `- ${m.content}`).join("\n");
  return `معلومات وحقائق هامة تتذكرها دائماً عن المستخدم لاستخدامها في الإجابة:\n${lines}`;
}

const PATTERNS: RegExp[] = [
  /(?:اسمي|انا اسمي|أنا اسمي)\s+([^\n.،,؛!?]{2,60})/i,
  /(?:أنا|انا)\s+(?:أعمل|اعمل|أدرس|ادرس)\s+([^\n.،,؛!?]{2,80})/i,
  /(?:أحب|احب|أفضّل|أفضل|افضل|مهتم بـ?|أكره|اكره|لا أحب|لا احب)\s+([^\n.،,؛!?]{2,80})/i,
  /(?:تذكر أن|تذكر ان|تذكّر أن)\s+([^\n.؛!?]{2,120})/i,
  /(?:my name is|i work as|i live in|i like|i prefer|i hate|remember that)\s+([^\n.,;!?]{2,100})/i,
];

/** استخراج ذكي مبسّط للحقائق من رسالة المستخدم. */
export function extractFacts(text: string): string[] {
  const value = (text ?? "").trim();
  if (!value || value.length > 600) return [];
  const facts: string[] = [];
  for (const pattern of PATTERNS) {
    const match = pattern.exec(value);
    if (match?.[0]) facts.push(match[0].trim());
  }
  return [...new Set(facts)].slice(0, 3);
}

/** يحفظ الحقائق المستخرجة تلقائياً (بصمت). */
export async function rememberFromMessage(text: string): Promise<void> {
  if (!isMemoryEnabled()) return;
  for (const fact of extractFacts(text)) {
    try {
      await addMemory(fact);
    } catch {
      /* تجاهل */
    }
  }
}
