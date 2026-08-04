import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Salman AI — محادثة ذكية بالعربية" },
      {
        name: "description",
        content:
          "Salman AI من سلمان للتقنية: ابدأ المحادثة فوراً بالعربية والإنجليزية مع دعم الأكواد وتوليد الصور.",
      },
      { property: "og:title", content: "Salman AI — محادثة ذكية بالعربية" },
      {
        property: "og:description",
        content: "ابدأ المحادثة فوراً مع Salman AI: نصوص، أكواد، وتوليد صور.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/chat" });
  },
});
