import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import type { UIMessage } from "ai";
import { Loader2 } from "lucide-react";
import { useCallback, useMemo } from "react";

import { ChatWindow } from "@/components/salman/ChatWindow";
import { getConversationMessages, type StoredMessage } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/chat/$conversationId")({
  component: ConversationScreen,
  errorComponent: () => (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
      تعذّر تحميل هذه المحادثة.
    </div>
  ),
});

function toUIMessages(rows: StoredMessage[]): UIMessage[] {
  return rows.map((row) => ({
    id: row.id,
    role: row.sender === "user" ? "user" : "assistant",
    parts: [{ type: "text" as const, text: row.content }],
  }));
}

function ConversationScreen() {
  const { conversationId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchMessages = useServerFn(getConversationMessages);

  const { data, isPending } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages({ data: { conversationId } }),
  });

  const initialMessages = useMemo(() => toUIMessages(data ?? []), [data]);

  const handleFirstMessage = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [queryClient]);

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ChatWindow
      key={conversationId}
      conversationId={conversationId}
      initialMessages={initialMessages}
      onFirstMessage={handleFirstMessage}
    />
  );
}
