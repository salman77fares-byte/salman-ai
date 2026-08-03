import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Menu } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/salman/AppSidebar";
import { MobileBottomNav } from "@/components/salman/MobileBottomNav";
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
import { supabase } from "@/integrations/supabase/client";
import {
  clearAllConversations,
  createConversation,
  deleteConversation,
  listConversations,
  type Conversation,
} from "@/lib/chat.functions";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "المحادثة — Salman AI" },
      { name: "description", content: "تحدّث مع Salman AI بالعربية والإنجليزية واحفظ محادثاتك." },
      { property: "og:title", content: "المحادثة — Salman AI" },
      { property: "og:description", content: "تحدّث مع Salman AI بالعربية والإنجليزية." },
    ],
  }),
  component: ChatLayout,
});

function ChatLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams({ strict: false }) as { conversationId?: string };
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const fetchConversations = useServerFn(listConversations);
  const createFn = useServerFn(createConversation);
  const deleteFn = useServerFn(deleteConversation);
  const clearFn = useServerFn(clearAllConversations);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => fetchConversations(),
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
    void navigate({ to: "/auth", replace: true });
  };

  const sidebar = (onClose?: () => void) => (
    <AppSidebar
      conversations={conversations}
      activeId={params.conversationId}
      onNewChat={() => newChat.mutate()}
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
        <SheetContent side="right" className="w-[85%] max-w-xs p-0">
          {sidebar(() => setMobileOpen(false))}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-b border-border px-3 py-2 md:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <BrandMark size={28} />
            <span className="truncate text-sm font-extrabold">Salman AI</span>
          </div>
        </header>

        <main className="min-h-0 flex-1">
          <Outlet />
        </main>

        <MobileBottomNav
          onNewChat={() => newChat.mutate()}
          onOpenHistory={() => setMobileOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>الإعدادات</DialogTitle>
            <DialogDescription>تخصيص تجربتك في Salman AI.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
            <span className="text-sm font-bold">الوضع الليلي</span>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
          <div className="rounded-2xl bg-secondary px-4 py-3 text-xs leading-6 text-muted-foreground">
            يتم حفظ محادثاتك في حسابك الخاص، ولا يمكن لأي مستخدم آخر الوصول إليها.
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
