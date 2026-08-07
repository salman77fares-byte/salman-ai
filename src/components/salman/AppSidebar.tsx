import { Link } from "@tanstack/react-router";
import { isToday, isYesterday, parseISO, subDays } from "date-fns";
import {
  LogIn,
  LogOut,
  MessageSquare,
  Moon,
  Rocket,
  Settings,
  Sun,
  Trash2,
} from "lucide-react";

import { BrandMark } from "./BrandMark";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/chat.functions";
import { SALMAN_PROJECTS } from "@/lib/projects";

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
  isGuest,
  userEmail,
  onDeleteConversation,
  onClearAll,
  onOpenSettings,
  onSignOut,
  onClose,
}: {
  conversations: Conversation[];
  activeId?: string | undefined;
  isGuest: boolean;
  userEmail?: string | null | undefined;
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
      <div className="safe-top flex items-center gap-2 px-4 py-4">
        <Link to="/chat" className="flex min-w-0 items-center gap-2.5">
          <BrandMark size={36} />
          <span className="min-w-0 truncate text-base font-extrabold">Salman AI</span>
        </Link>
      </div>

      <Separator />

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {isGuest ? (
          <p className="px-3 py-6 text-center text-xs leading-6 text-muted-foreground">
            سجّل الدخول لحفظ محادثاتك وعرض سجلّك هنا.
          </p>
        ) : groups.length === 0 ? (
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
                      <button
                        type="button"
                        aria-label="حذف المحادثة"
                        onClick={() => onDeleteConversation(conversation.id)}
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
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
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}

        <div className="mt-4 border-t border-sidebar-border pt-3">
          <p className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
            مشاريع سلمان
          </p>
          <ul className="space-y-0.5">
            {SALMAN_PROJECTS.map((project) => (
              <li key={project.name} className="rounded-lg px-3 py-2 hover:bg-sidebar-accent/60">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <Rocket className="size-3.5 text-primary" />
                  {project.name}
                </p>
                <p className="ps-6 text-[11px] text-muted-foreground">{project.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Separator />
      <div className="space-y-1 p-3">
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
        </Button>
        {!isGuest ? (
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={onClearAll}>
            <Trash2 className="size-4" />
            حذف كل المحادثات
          </Button>
        ) : null}
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={onOpenSettings}>
          <Settings className="size-4" />
          الإعدادات
        </Button>
        {isGuest ? (
          <Button
            asChild
            className="w-full justify-start gap-2 brand-gradient-bg font-extrabold text-primary-foreground hover:opacity-90"
          >
            <Link to="/auth" onClick={onClose}>
              <LogIn className="size-4" />
              تسجيل الدخول
            </Link>
          </Button>
        ) : (
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={onSignOut}>
            <LogOut className="size-4" />
            <span className="min-w-0 truncate">
              تسجيل الخروج
              {userEmail ? <span className="text-muted-foreground"> — {userEmail}</span> : null}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
