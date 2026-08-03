import { Link } from "@tanstack/react-router";
import { isToday, isYesterday, parseISO, subDays } from "date-fns";
import {
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  Settings,
  Sun,
  Trash2,
  Sparkle,
  PanelLeftClose,
} from "lucide-react";

import { BrandMark } from "./BrandMark";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/chat.functions";

type Group = { label: string; items: Conversation[] };

function groupConversations(conversations: Conversation[]): Group[] {
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const week: Conversation[] = [];
  const older: Conversation[] = [];
  const weekAgo = subDays(new Date(), 7);

  for (const conversation of conversations) {
    const date = parseISO(conversation.updated_at);
    if (isToday(date)) today.push(conversation);
    else if (isYesterday(date)) yesterday.push(conversation);
    else if (date > weekAgo) week.push(conversation);
    else older.push(conversation);
  }

  return [
    { label: "اليوم", items: today },
    { label: "أمس", items: yesterday },
    { label: "آخر ٧ أيام", items: week },
    { label: "أقدم", items: older },
  ].filter((group) => group.items.length > 0);
}

export function AppSidebar({
  conversations,
  activeId,
  onNewChat,
  onDeleteConversation,
  onClearAll,
  onOpenSettings,
  onSignOut,
  onClose,
}: {
  conversations: Conversation[];
  activeId?: string | undefined;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onClearAll: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  onClose?: (() => void) | undefined;
}) {
  const { theme, toggleTheme } = useTheme();
  const groups = groupConversations(conversations);

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 pt-4">
        <Link to="/chat" className="flex min-w-0 items-center gap-2">
          <BrandMark size={34} />
          <span className="min-w-0">
            <span className="block truncate text-base font-extrabold">Salman AI</span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-primary">
              <Sparkle className="size-3" />
              سلمان للتقنية
            </span>
          </span>
        </Link>
        {onClose ? (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="إغلاق القائمة">
            <PanelLeftClose className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="p-4">
        <Button
          onClick={onNewChat}
          className="w-full justify-center gap-2 rounded-xl brand-gradient-bg text-base font-extrabold text-primary-foreground shadow-glow hover:opacity-90"
        >
          <Plus className="size-4" />
          محادثة جديدة
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {groups.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            لا توجد محادثات بعد. ابدأ محادثتك الأولى.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((conversation) => {
                  const active = conversation.id === activeId;
                  return (
                    <li
                      key={conversation.id}
                      className={cn(
                        "group flex items-center gap-1 rounded-lg px-1 transition-colors",
                        active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
                      )}
                    >
                      <Link
                        to="/chat/$conversationId"
                        params={{ conversationId: conversation.id }}
                        onClick={onClose}
                        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-sm"
                      >
                        <MessageSquare
                          className={cn(
                            "size-4 shrink-0",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <span className="truncate">{conversation.title}</span>
                      </Link>
                      <button
                        type="button"
                        aria-label="حذف المحادثة"
                        onClick={() => onDeleteConversation(conversation.id)}
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      <Separator />
      <div className="space-y-1 p-3">
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={onClearAll}>
          <Trash2 className="size-4" />
          حذف كل المحادثات
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={onOpenSettings}>
          <Settings className="size-4" />
          الإعدادات
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={onSignOut}>
          <LogOut className="size-4" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}
