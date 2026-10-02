import { createFileRoute } from "@tanstack/react-router";

import { ChatScreen } from "@/components/salman/ChatScreen";

export const Route = createFileRoute("/chat/$conversationId")({
  component: ConversationRoute,
  errorComponent: () => (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
      تعذّر تحميل هذه المحادثة.
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
      هذه المحادثة غير موجودة.
    </div>
  ),
});

function ConversationRoute() {
  const { conversationId } = Route.useParams();
  return <ChatScreen key={conversationId} conversationId={conversationId} />;
}
