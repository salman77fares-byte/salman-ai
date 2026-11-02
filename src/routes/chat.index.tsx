import { createFileRoute } from "@tanstack/react-router";

import { ChatScreen } from "@/components/salman/ChatScreen";

export const Route = createFileRoute("/chat/")({
  head: () => ({
    meta: [
      { title: "محادثة جديدة — Salman AI" },
      { name: "description", content: "ابدأ محادثة جديدة مع Salman AI." },
      { property: "og:title", content: "محادثة جديدة — Salman AI" },
      { property: "og:description", content: "ابدأ محادثة جديدة مع Salman AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <ChatScreen key="new" />,
});
