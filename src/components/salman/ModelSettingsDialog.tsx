import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ENGINE_OPTIONS, ENGINE_STORAGE_KEY, type EngineId } from "@/lib/aiService";

/** نافذة إعدادات مختصرة لاختيار نموذج الرد المفضّل وحفظه محلياً. */
export function ModelSettingsDialog() {
  const [engine, setEngine] = useState<EngineId>("gemini");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ENGINE_STORAGE_KEY) as EngineId | null;
      if (saved && ENGINE_OPTIONS.some((e) => e.id === saved)) setEngine(saved);
    } catch {
      /* تجاهل */
    }
  }, []);

  const handleChange = (value: EngineId) => {
    setEngine(value);
    try {
      localStorage.setItem(ENGINE_STORAGE_KEY, value);
      toast.success("تم حفظ نموذج الرد المفضّل");
    } catch {
      /* تجاهل */
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title="الإعدادات"
          className="size-8 rounded-full border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <Settings className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm border-slate-800 bg-[#0f1524] text-slate-100" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-base font-black">⚙️ الإعدادات</DialogTitle>
          <DialogDescription className="text-right text-xs text-slate-400">
            اختر نموذج الرد المفضّل. عند تعذّر النموذج المختار يتم الانتقال تلقائياً لنموذج آخر.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-right">
          <label htmlFor="engine-select" className="text-xs font-bold text-slate-300">
            🤖 نموذج الرد
          </label>
          <select
            id="engine-select"
            value={engine}
            onChange={(e) => handleChange(e.target.value as EngineId)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-xs font-semibold text-white focus:border-[#2dd4bf] focus:outline-none"
          >
            {ENGINE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </DialogContent>
    </Dialog>
  );
}
