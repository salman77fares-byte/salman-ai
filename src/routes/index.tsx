import { createFileRoute } from "@tanstack/react-router";

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
      {
        property: "og:description",
        content:
          "Salman AI | منصتك الذكية المتكاملة لتوليد الصور، برمجة الأكواد، كتابة النصوص، وغيرها من الخدمات المتطورة بسرعة ودقة متناهية. ابدأ الآن!",
      },
      // إضافة علامة إثبات الملكية لجوجل في المكان المخصص لها
      {
        name: "google-site-verification",
        content: "La90iHMhtvnYwBk1mnhonFebPOlu3J5Vb4YlO2CrGQQ",
      },
    ],
  }),
  // تم إزالة إعادة التوجيه الإجبارية (beforeLoad) لكي تفتح الواجهة محلياً وبدون إنترنت
});
