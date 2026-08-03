import { Link } from "@tanstack/react-router";
import { MessageSquare, Plus, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

export function MobileBottomNav({
  onNewChat,
  onOpenHistory,
  onOpenSettings,
}: {
  onNewChat: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}) {
  const itemClass =
    "flex flex-1 select-none flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-bold text-muted-foreground transition-transform duration-150 active:scale-95 active:bg-secondary";

  return (
    <nav className="safe-bottom border-t border-border bg-sidebar/95 backdrop-blur md:hidden">
      <div className="flex items-stretch gap-1 px-2 py-1.5">
        <button type="button" onClick={onOpenHistory} className={itemClass}>
          <MessageSquare className="size-5" />
          المحادثات
        </button>
        <button
          type="button"
          onClick={onNewChat}
          className={cn(itemClass, "text-primary-foreground")}
        >
          <span className="grid size-9 place-items-center rounded-full brand-gradient-bg shadow-glow">
            <Plus className="size-5 text-primary-foreground" />
          </span>
          <span className="text-primary">جديدة</span>
        </button>
        <button type="button" onClick={onOpenSettings} className={itemClass}>
          <Settings className="size-5" />
          الإعدادات
        </button>
      </div>
      <Link to="/chat" className="sr-only">
        المحادثة
      </Link>
    </nav>
  );
}
