import { createFileRoute } from "@tanstack/react-router";

import { ChatScreen } from "@/components/salman/ChatScreen";

export const Route = createFileRoute("/chat/")({
  component: () => <ChatScreen key="new" />,
});
