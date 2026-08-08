import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LogIn, LogOut, Menu, Rocket, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/salman/AppSidebar";
import { BrandMark } from "@/components/salman/BrandMark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import {
  clearAllConversations,
  createConversation,
  deleteConversation,
  listConversations,
  type Conversation,
} from "@/lib/chat.functions";
import { GuestChatProvider, NewChatProvider, useGuestChat } from "@/lib/guest-chat";
import { SALMAN_PROJECTS } from "@/lib/projects";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/chat")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "المحادثة — Salman AI" },
      {
        name: "description",
        content: "تحدّث مع Salman AI بالعربية والإنجليزية، ابدأ كزائر أو احفظ محادثاتك بحسابك.",
      },
      { property: "og:title", content: "المحادثة — Salman AI" },
      { property: "og:description", content: "تحدّث مع Salman AI بالعربية والإنجليزية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatRoute,
});

function ChatRoute() {
  return (
    <GuestChatProvider>
      <ChatLayout />
    </GuestChatProvider>
  );
}

function ChatLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams({ strict: false }) as { conversationId?: string };
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontScale, setFontScale] = useState("medium");
  const [replyLang, setReplyLang] = useState("auto");
  const { theme, toggleTheme } = useTheme();
  const { session, user, isGuest } = useSession();
  const { resetGuestChat } = useGuestChat();

  useEffect(() => {
    const stored = localStorage.getItem("salman-font-scale");
    if (stored) setFontScale(stored);
    const lang = localStorage.getItem("salman-reply-lang");
    if (lang) setReplyLang(lang);
  }, []);

  useEffect(() => {
    const sizes: Record<string, string> = {
      small: "15px",
      medium: "16px",
      large: "18px",
    };
    document.documentElement.style.fontSize = sizes[fontScale] ?? "16px";
    localStorage.setItem("salman-font-scale", fontScale);
  }, [fontScale]);

  useEffect(() => {
    localStorage.setItem("salman-reply-lang", replyLang);
  }, [replyLang]);

  const fetchConversations = useServerFn(listConversations);
  const createFn = useServerFn(createConversation);
  const deleteFn = useServerFn(deleteConversation);
  const clearFn = useServerFn(clearAllConversations);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => fetchConversations(),
    enabled: Boolean(session),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["conversations"] });

  const newChat = useMutation({
    mutationFn: () => createFn(),
    onSuccess: async (conversation) => {
      await invalidate();
      setMobileOpen(false);
      void navigate({
        to: "/chat/$conversationId",
        params: { conversationId: conversation.id },
      });
    },
    onError: () => toast.error("تعذّر إنشاء محادثة جديدة."),
  });

  const startNewChat = () => {
    if (isGuest) {
      resetGuestChat();
      setMobileOpen(false);
      void navigate({ to: "/chat" });
      return;
    }
    newChat.mutate();
  };

  const removeChat = useMutation({
    mutationFn: (conversationId: string) => deleteFn({ data: { conversationId } }),
    onSuccess: async (_result, conversationId) => {
      await invalidate();
      toast.success("تم حذف المحادثة");
      if (params.conversationId === conversationId) void navigate({ to: "/chat" });
    },
    onError: () => toast.error("تعذّر حذف المحادثة."),
  });

  const clearAll = useMutation({
    mutationFn: () => clearFn(),
    onSuccess: async () => {
      await invalidate();
      toast.success("تم حذف كل المحادثات");
      void navigate({ to: "/chat" });
    },
    onError: () => toast.error("تعذّر حذف المحادثات."),
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/chat", replace: true });
  };

  const sidebar = (onClose?: () => void) => (
    <AppSidebar
      conversations={conversations}
      activeId={params.conversationId}
      isGuest={isGuest}
      userEmail={user?.email ?? null}
      onDeleteConversation={(id) => removeChat.mutate(id)}
      onClearAll={() => clearAll.mutate()}
      onOpenSettings={() => {
        setSettingsOpen(true);
        onClose?.();
      }}
      onSignOut={() => void signOut()}
      onClose={onClose}
    />
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside className="hidden w-72 shrink-0 border-e border-sidebar-border md:block">
        {sidebar()}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="right"
          className="w-[68%] max-w-[260px] p-0 [&>button]:hidden"
        >
          {sidebar(() => setMobileOpen(false))}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top shrink-0 border-b border-border bg-background/95 px-3 py-3 backdrop-blur sm:px-5">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label="فتح القائمة"
              className="md:hidden"
            >
              <Menu className="size-5" />
            </Button>
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandMark size={40} />
              <span className="truncate text-lg font-extrabold sm:text-xl">Salman AI</span>
            </div>
            {isGuest ? (
              <Button
                asChild
                size="sm"
                className="shrink-0 gap-1.5 rounded-xl brand-gradient-bg text-xs font-extrabold text-primary-foreground hover:opacity-90"
              >
                <Link to="/auth">
                  <LogIn className="size-3.5" />
                  تسجيل الدخول
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void signOut()}
                className="shrink-0 gap-1.5 rounded-xl text-xs font-bold"
              >
                <LogOut className="size-3.5" />
                تسجيل الخروج
              </Button>
            )}
          </div>
          {!isGuest && user?.email ? (
            <p className="mt-1.5 truncate text-[11px] text-muted-foreground" dir="ltr">
              {user.email}
            </p>
          ) : null}
        </header>

        <main className="min-h-0 flex-1">
          <NewChatProvider onNewChat={startNewChat}>
            <Outlet />
          </NewChatProvider>
        </main>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>الإعدادات</DialogTitle>
            <DialogDescription>تخصيص تجربتك في Salman AI.</DialogDescription>
          </DialogHeader>

          <section className="space-y-2">
            <p className="text-xs font-extrabold text-muted-foreground">الحساب</p>
            <div className="rounded-2xl bg-secondary px-4 py-3 text-xs leading-6">
              {isGuest ? (
                <span className="text-muted-foreground">
                  أنت تستخدم التطبيق كزائر، سجّل الدخول لحفظ محادثاتك.
                </span>
              ) : (
                <span dir="ltr" className="block truncate font-bold">
                  {user?.email}
                </span>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-extrabold text-muted-foreground">التفضيلات</p>
            <div className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
              <span className="text-sm font-bold">الوضع الليلي</span>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-secondary px-4 py-3">
              <span className="text-sm font-bold">لغة الردود</span>
              <select
                value={replyLang}
                onChange={(event) => setReplyLang(event.currentTarget.value)}
                className="rounded-xl border border-border bg-background px-2 py-1 text-xs font-bold"
              >
                <option value="auto">تلقائي</option>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-secondary px-4 py-3">
              <span className="text-sm font-bold">حجم الخط</span>
              <select
                value={fontScale}
                onChange={(event) => setFontScale(event.currentTarget.value)}
                className="rounded-xl border border-border bg-background px-2 py-1 text-xs font-bold"
              >
                <option value="small">صغير</option>
                <option value="medium">متوسط</option>
                <option value="large">كبير</option>
              </select>
            </div>
          </section>

          {!isGuest ? (
            <section className="space-y-2">
              <p className="text-xs font-extrabold text-muted-foreground">البيانات</p>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 rounded-2xl text-xs font-bold text-destructive"
                onClick={() => clearAll.mutate()}
              >
                <Trash2 className="size-4" />
                حذف كل المحادثات
              </Button>
            </section>
          ) : null}

          <section className="space-y-2">
            <p className="text-xs font-extrabold text-muted-foreground">
              🌐 مشاريع وخدمات سلمان
            </p>
            <ul className="space-y-1.5">
              {SALMAN_PROJECTS.map((project) => (
                <li key={project.name}>
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3 transition hover:bg-secondary/70"
                  >
                    <span className="text-lg">{project.emoji}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-extrabold">{project.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {project.description}
                      </span>
                    </span>
                    <ExternalLink className="ms-auto size-3.5 shrink-0 text-primary" />
                  </a>
                </li>
              ))}
            </ul>
          </section>


          <section className="space-y-2">
            <p className="text-xs font-extrabold text-muted-foreground">عن التطبيق</p>
            <div className="space-y-2 rounded-2xl bg-secondary px-4 py-3 text-xs leading-6 text-muted-foreground">
              <p>Salman AI — الإصدار 1.0. تطوير: سلمان فارس.</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 font-bold text-primary">
                <Link to="/privacy" onClick={() => setSettingsOpen(false)}>
                  سياسة الخصوصية
                </Link>
                <Link to="/terms" onClick={() => setSettingsOpen(false)}>
                  شروط الاستخدام
                </Link>
                <Link to="/delete-account" onClick={() => setSettingsOpen(false)}>
                  حذف الحساب
                </Link>
              </div>
            </div>
          </section>
        </DialogContent>
      </Dialog>
    </div>
  );
}
