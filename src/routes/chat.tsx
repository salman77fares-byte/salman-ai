import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronDown, Menu, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/salman/AppSidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import {
  createConversation,
  deleteConversation,
  listConversations,
  renameConversation,
  setConversationPinned,
  type Conversation,
} from "@/lib/chat.functions";
import { ENGINE_OPTIONS, ENGINE_STORAGE_KEY, type EngineId } from "@/lib/engines";
import { SettingsProvider } from "@/lib/settings-modal";
import { GuestChatProvider, NewChatProvider, useGuestChat } from "@/lib/guest-chat";

export const Route = createFileRoute("/chat")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "المحادثة — Salman AI" },
      {
        name: "description",
        content: "تحدّث مع Salman AI، من تطوير المهندس سلمان فارس. ابدأ كزائر أو احفظ محادثاتك بحسابك.",
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
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [engine, setEngine] = useState<EngineId>("gemini");
  const { session, user, isGuest } = useSession();
  const { resetGuestChat } = useGuestChat();

  useEffect(() => {
    const savedEngine = localStorage.getItem(ENGINE_STORAGE_KEY) as EngineId | null;
    if (savedEngine && ENGINE_OPTIONS.some((option) => option.id === savedEngine)) {
      setEngine(savedEngine);
    }
    const sizes: Record<string, string> = { small: "15px", medium: "16px", large: "18px" };
    document.documentElement.style.fontSize =
      sizes[localStorage.getItem("salman-font-scale") ?? "medium"] ?? "16px";
  }, []);

  const fetchConversations = useServerFn(listConversations);
  const createFn = useServerFn(createConversation);
  const deleteFn = useServerFn(deleteConversation);
  const pinFn = useServerFn(setConversationPinned);
  const renameFn = useServerFn(renameConversation);

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
    window.dispatchEvent(new Event("salman-new-chat"));
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

  const togglePin = useMutation({
    mutationFn: ({ conversationId, pinned }: { conversationId: string; pinned: boolean }) =>
      pinFn({ data: { conversationId, pinned } }),
    onSuccess: async (_result, variables) => {
      await invalidate();
      toast.success(variables.pinned ? "تم تثبيت المحادثة" : "تم إلغاء التثبيت");
    },
    onError: () => toast.error("تعذّر تحديث التثبيت."),
  });

  const rename = useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) =>
      renameFn({ data: { conversationId, title } }),
    onSuccess: async () => {
      await invalidate();
      toast.success("تم تعديل الاسم");
    },
    onError: () => toast.error("تعذّر تعديل الاسم."),
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
      onTogglePin={(id, pinned) => togglePin.mutate({ conversationId: id, pinned })}
      onRenameConversation={(id, title) => rename.mutate({ conversationId: id, title })}
      onOpenSettings={() => {
        onClose?.();
        void navigate({ to: "/settings" });
      }}
      onSignOut={() => void signOut()}
      onClose={onClose}
    />
  );

  const currentEngineLabel =
    ENGINE_OPTIONS.find((option) => option.id === engine)?.label.split(" (")[0] ?? "النموذج";

  const changeEngine = (value: EngineId) => {
    setEngine(value);
    try {
      localStorage.setItem(ENGINE_STORAGE_KEY, value);
      toast.success("تم حفظ نموذج الرد المفضّل");
    } catch {
      /* تجاهل */
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {desktopSidebarOpen ? (
        <aside className="hidden w-72 shrink-0 border-e border-sidebar-border md:block">
          {sidebar()}
        </aside>
      ) : null}

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-[68%] max-w-[260px] p-0 [&>button]:hidden">
          {sidebar(() => setMobileOpen(false))}
        </SheetContent>
      </Sheet>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-3 pb-2 sm:px-5"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + clamp(12px, 3vw, 20px))" }}
        >
          <div className="pointer-events-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (window.matchMedia("(min-width: 768px)").matches) {
                  setDesktopSidebarOpen((open) => !open);
                } else {
                  setMobileOpen(true);
                }
              }}
              aria-label="القائمة الجانبية"
              className="rounded-full text-foreground/80 hover:bg-secondary/70"
            >
              <Menu className="size-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 rounded-full px-3 text-xs font-extrabold text-foreground/80 hover:bg-secondary/70"
                >
                  {currentEngineLabel}
                  <ChevronDown className="size-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 rounded-2xl">
                {ENGINE_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.id}
                    onSelect={() => changeEngine(option.id)}
                    className="gap-2 text-xs font-bold"
                  >
                    <Check
                      className={`size-3.5 shrink-0 ${engine === option.id ? "text-primary opacity-100" : "opacity-0"}`}
                    />
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="pointer-events-auto flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={startNewChat}
              className="h-9 gap-1.5 rounded-full border-border/70 bg-background/70 px-3.5 text-xs font-extrabold backdrop-blur hover:bg-secondary/70"
            >
              <Plus className="size-4 text-primary" />
              محادثة جديدة
            </Button>
          </div>
        </div>

        <main className="min-h-0 flex-1 pt-14">
          <SettingsProvider onOpenSettings={() => void navigate({ to: "/settings" })}>
            <NewChatProvider onNewChat={startNewChat}>
              <Outlet />
            </NewChatProvider>
          </SettingsProvider>
        </main>
      </div>

    </div>
  );
}
