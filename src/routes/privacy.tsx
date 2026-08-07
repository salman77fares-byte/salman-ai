import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — Salman AI" },
      {
        name: "description",
        content: "سياسة الخصوصية في Salman AI: أي بيانات نجمعها، كيف نحفظ محادثاتك، وحقوقك في حذفها.",
      },
      { property: "og:title", content: "سياسة الخصوصية — Salman AI" },
      {
        property: "og:description",
        content: "تعرّف على كيفية تعامل Salman AI مع بياناتك ومحادثاتك.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyScreen,
});

function PrivacyScreen() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <Link to="/chat" className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-primary">
        <ArrowRight className="size-3.5" />
        رجوع إلى المحادثة
      </Link>
      <h1 className="text-2xl font-extrabold">سياسة الخصوصية</h1>
      <div className="mt-5 space-y-5 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-base font-extrabold text-foreground">البيانات التي نجمعها</h2>
          <p>
            عند إنشاء حساب نحفظ بريدك الإلكتروني ومعرّف الحساب فقط. أما المحادثات فتُحفظ في حسابك
            الخاص ولا يمكن لأي مستخدم آخر الوصول إليها. إذا استخدمت التطبيق كزائر فلا يتم حفظ أي
            محادثة على الإطلاق.
          </p>
        </section>
        <section>
          <h2 className="text-base font-extrabold text-foreground">استخدام البيانات</h2>
          <p>
            تُرسل رسائلك إلى مزوّدي نماذج الذكاء الاصطناعي لتوليد الردود، ولا تُستخدم لأي أغراض
            تسويقية ولا تُشارك مع أطراف ثالثة لغير هذا الغرض.
          </p>
        </section>
        <section>
          <h2 className="text-base font-extrabold text-foreground">حقوقك</h2>
          <p>
            يمكنك حذف أي محادثة أو حذف كل السجل في أي وقت من الشريط الجانبي، كما يمكنك طلب حذف
            حسابك بالكامل من صفحة{" "}
            <Link to="/delete-account" className="font-bold text-primary">
              حذف الحساب
            </Link>
            .
          </p>
        </section>
        <p className="text-xs">تطوير: سلمان فارس.</p>
      </div>
    </main>
  );
}
