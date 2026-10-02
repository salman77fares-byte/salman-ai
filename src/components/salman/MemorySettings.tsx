import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  addMemory,
  deleteMemory,
  isMemoryEnabled,
  listMemories,
  MEMORY_CHANGED_EVENT,
  setMemoryEnabled,
  type Memory,
} from "@/lib/memory";

export function MemorySettings() {
  const [enabled, setEnabled] = useState(false);
  const [items, setItems] = useState<Memory[]>([]);
  const [draft, setDraft] = useState("");

  const refresh = () => void listMemories().then(setItems).catch(() => setItems([]));

  useEffect(() => {
    setEnabled(isMemoryEnabled());
    refresh();
    window.addEventListener(MEMORY_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(MEMORY_CHANGED_EVENT, refresh);
  }, []);

  return (
    <section className="space-y-2">
      <p className="text-xs font-extrabold text-muted-foreground">الذاكرة</p>
      <label className="flex items-center justify-between rounded-2xl border border-border px-3 py-2 text-xs font-bold">
        تفعيل وضع الذاكرة
        <Switch
          checked={enabled}
          onCheckedChange={(v) => {
            setEnabled(v);
            setMemoryEnabled(v);
          }}
        />
      </label>

      <div className="space-y-2 rounded-2xl border border-border p-3">
        <p className="text-xs font-extrabold">إدارة الذاكرة</p>
        {items.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">لا توجد ذكريات محفوظة بعد.</p>
        ) : (
          <ul className="max-h-40 space-y-1.5 overflow-y-auto">
            {items.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-2 rounded-xl bg-secondary/50 px-2.5 py-1.5 text-[11px]">
                <span className="leading-relaxed">{m.content}</span>
                <button
                  type="button"
                  aria-label="حذف الذكرى"
                  className="shrink-0"
                  onClick={() => deleteMemory(m.id).catch(() => toast.error("تعذّر الحذف"))}
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            addMemory(draft)
              .then(() => setDraft(""))
              .catch(() => toast.error("تعذّر الحفظ"));
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="أضف معلومة عنك..."
            dir="auto"
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary"
          />
          <Button type="submit" size="sm" className="rounded-xl text-xs" disabled={!draft.trim()}>
            إضافة
          </Button>
        </form>
      </div>
    </section>
  );
}
