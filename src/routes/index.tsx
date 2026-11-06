import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Salman AI" },
      {
        name: "description",
        content:
          "Salman AI | منصتك الذكية المتكاملة لتوليد الصور، برمجة الأكواد، كتابة النصوص، وغيرها من الخدمات المتطورة بسرعة ودقة متناهية. ابدأ الآن!",
      },
      { property: "og:title", content: "Salman AI" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        property: "og:description",
        content:
          "Salman AI | منصتك الذكية المتكاملة لتوليد الصور، برمجة الأكواد، كتابة النصوص، وغيرها من الخدمات المتطورة بسرعة ودقة متناهية. ابدأ الآن!",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/chat" });
  },
});
