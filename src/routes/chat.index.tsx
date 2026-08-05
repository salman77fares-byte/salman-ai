import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/salman/BrandMark";
import { ChatWindow } from "@/components/salman/ChatWindow";
import { useSession } from "@/hooks/useSession";
import { createConversation } from "@/lib/chat.functions";
import { useGuestChat } from "@/lib/guest-chat";

export const Route = createFileRoute("/chat/")({
  component: ChatIndexScreen,
});

/**
 * Guests chat here directly (in-memory only). Signed-in users get a fresh
 * conversation row and are moved to its own URL so history is saved.
 */
function ChatIndexScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createConversation);
  const { session, loading } = useSession();
  const { resetKey } = useGuestChat();
  const startedRef = useRef(false);

  useEffect(() => {
    if (loading || !session || startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      try {
        const conversation = await createFn();
        await queryClient.invalidateQueries({ queryKey: ["conversations"] });
        void navigate({
          to: "/chat/$conversationId",
          params: { conversationId: conversation.id },
          replace: true,
        });
      } catch {
        startedRef.current = false;
        toast.error("تعذّر بدء محادثة جديدة.");
      }
    })();
  }, [createFn, loading, navigate, queryClient, session]);

  if (loading || session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <BrandMark size={64} className="shadow-glow" />
        <h1 className="text-xl font-extrabold">
          مرحباً بك، أنا <span className="brand-gradient-text">Salman AI</span>
        </h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          جارٍ التجهيز...
        </p>
      </div>
    );
  }

  return (
    <ChatWindow
      key={`guest-${resetKey}`}
      chatKey={`guest-${resetKey}`}
      initialMessages={[]}
      isGuest
    />
  );
}
