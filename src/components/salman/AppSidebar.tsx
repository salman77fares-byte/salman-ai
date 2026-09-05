import { Link } from "@tanstack/react-router";
import { isToday, isYesterday, parseISO, subDays } from "date-fns";
import {
  LogIn,
  LogOut,
  MessageSquare,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Settings,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { BrandMark } from "./BrandMark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/chat.functions";

type Group = { label: string; items: Conversation[] };

function groupConversations(conversations: Conversation[]): Group[] {
  const pinned: Conversation[] = [];
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const week: Conversation[] = [];
  const older: Conversation[] = [];
  const weekAgo = subDays(new Date(), 7);

  for (const conversation of conversations) {
    if (conversation.pinned) {
      pinned.push(conversation);
      continue;
    }
    const date = parseISO(conversation.updated_at);
    if (isToday(date)) today.push(conversation);
    else if (isYesterday(date)) yesterday.push(conversation);
    else if (date > weekAgo) week.push(conversation);
    else older.push(conversation);
  }

  return [
    { label: "📌 المحادثات المثبتة", items: pinned },
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
  onTogglePin,
  onRenameConversation,
  onOpenSettings,
  onSignOut,
  onClose,
}: {
  conversations: Conversation[];
  activeId?: string | undefined;
  isGuest: boolean;
  userEmail?: string | null | undefined;
  onDeleteConversation: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onRenameConversation: (id: string, title: string) => void;
  onClearAll?: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  onClose?: (() => void) | undefined;
}) {
  const groups = groupConversations(conversations);
  const [renaming, setRenaming] = useState<Conversation | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const submitRename = () => {
    const title = draftTitle.trim();
    if (renaming && title) onRenameConversation(renaming.id, title);
    setRenaming(null);
  };

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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label="خيارات المحادثة"
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                          >
                            <MoreVertical className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44">
                          <DropdownMenuItem
                            onClick={() => onTogglePin(conversation.id, !conversation.pinned)}
                            className="gap-2 text-xs font-bold"
                          >
                            {conversation.pinned ? (
                              <PinOff className="size-4" />
                            ) : (
                              <Pin className="size-4" />
                            )}
                            {conversation.pinned ? "إلغاء التثبيت" : "تثبيت المحادثة"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setDraftTitle(conversation.title);
                              setRenaming(conversation);
                            }}
                            className="gap-2 text-xs font-bold"
                          >
                            <Pencil className="size-4" />
                            تعديل الاسم
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDeleteConversation(conversation.id)}
                            className="gap-2 text-xs font-bold text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-4" />
                            حذف المحادثة
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Link
                        to="/chat/$conversationId"
                        params={{ conversationId: conversation.id }}
                        onClick={onClose}
                        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-sm"
                      >
                        {conversation.pinned ? (
                          <Pin className="size-4 shrink-0 text-primary" />
                        ) : (
                          <MessageSquare
                            className={cn(
                              "size-4 shrink-0",
                              active ? "text-primary" : "text-muted-foreground",
                            )}
                          />
                        )}
                        <span className="truncate">{conversation.title}</span>
                      </Link>
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

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="max-w-sm rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-base">✏️ تعديل اسم المحادثة</DialogTitle>
          </DialogHeader>
          <Input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitRename();
            }}
            autoFocus
            className="rounded-xl text-sm"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)} className="text-xs font-bold">
              إلغاء
            </Button>
            <Button onClick={submitRename} className="text-xs font-extrabold">
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
