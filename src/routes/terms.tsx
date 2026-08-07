import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام — Salman AI" },
      {
        name: "description",
        content: "شروط استخدام Salman AI: الاستخدام المسموح، حدود المسؤولية، ودقة إجابات الذكاء الاصطناعي.",
      },
      { property: "og:title", content: "شروط الاستخدام — Salman AI" },
      {
        property: "og:description",
        content: "الشروط والأحكام الخاصة باستخدام منصة Salman AI.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsScreen,
});

function TermsScreen() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <Link to="/chat" className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-primary">
        <ArrowRight className="size-3.5" />
        رجوع إلى المحادثة
      </Link>
      <h1 className="text-2xl font-extrabold">شروط الاستخدام</h1>
      <div className="mt-5 space-y-5 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-base font-extrabold text-foreground">قبول الشروط</h2>
          <p>باستخدامك Salman AI فإنك توافق على هذه الشروط. إذا لم توافق عليها فيرجى عدم استخدام التطبيق.</p>
        </section>
        <section>
          <h2 className="text-base font-extrabold text-foreground">الاستخدام المسموح</h2>
          <p>
            يُمنع استخدام التطبيق في أي نشاط غير قانوني، أو لإنتاج محتوى مسيء أو مخالف للحقوق، أو
            لإرسال طلبات آلية مفرطة تضرّ بالخدمة.
          </p>
        </section>
        <section>
          <h2 className="text-base font-extrabold text-foreground">دقة الإجابات</h2>
          <p>
            الردود مولّدة بالذكاء الاصطناعي وقد تحتوي أخطاء. تحقّق دائماً من المعلومات المهمة،
            خصوصاً الطبية والقانونية والمالية.
          </p>
        </section>
        <section>
          <h2 className="text-base font-extrabold text-foreground">الصور المولّدة</h2>
          <p>أنت مسؤول عن الوصف الذي تدخله وعن استخدام الصور الناتجة عنه.</p>
        </section>
        <p className="text-xs">تطوير: سلمان فارس.</p>
      </div>
    </main>
  );
}
