import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/salman/BrandMark";
import { createConversation } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: NewChatScreen,
});

/** Entering /chat starts a fresh conversation and moves to its own URL. */
function NewChatScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createConversation);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
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
        toast.error("تعذّر بدء محادثة جديدة.");
      }
    })();
  }, [createFn, navigate, queryClient]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <BrandMark size={64} className="shadow-glow" />
      <h1 className="text-xl font-extrabold">
        مرحباً بك، أنا <span className="brand-gradient-text">Salman AI</span>
      </h1>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        جارٍ تجهيز محادثة جديدة...
      </p>
    </div>
  );
}
