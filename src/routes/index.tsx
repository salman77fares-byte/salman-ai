import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquareCode, ShieldCheck, Languages, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/salman/BrandMark";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Salman AI — منصة المحادثة الذكية بالعربية" },
      {
        name: "description",
        content:
          "Salman AI من سلمان للتقنية: محادثة ذكية بالعربية والإنجليزية، دعم كامل للأكواد والتنسيق وحفظ سجل المحادثات.",
      },
      { property: "og:title", content: "Salman AI — منصة المحادثة الذكية بالعربية" },
      {
        property: "og:description",
        content: "محادثة ذكية بالعربية والإنجليزية مع دعم الأكواد وسجل محادثات محفوظ.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Languages, title: "عربي وإنجليزي", body: "دعم كامل للاتجاه من اليمين لليسار ولغة برمجية LTR." },
  { icon: MessageSquareCode, title: "أكواد منسّقة", body: "تلوين الأكواد وزر نسخ فوري لكل كتلة برمجية." },
  { icon: ShieldCheck, title: "محادثاتك محفوظة", body: "سجل محادثات خاص بك ومحمي بحسابك فقط." },
];

function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5">
        <div className="flex min-w-0 items-center gap-2">
          <BrandMark size={38} />
          <span className="truncate text-lg font-extrabold">Salman AI</span>
        </div>
        <Button asChild variant="outline" className="rounded-xl font-bold">
          <Link to={signedIn ? "/chat" : "/auth"}>{signedIn ? "المحادثات" : "تسجيل الدخول"}</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="rounded-4xl border border-border bg-card p-8 text-center shadow-soft sm:p-14">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
            <Sparkles className="size-3.5" />
            سلمان للتقنية
          </span>
          <h1 className="mt-6 text-3xl font-black leading-tight sm:text-5xl">
            مساعدك الذكي <span className="brand-gradient-text">بالعربية</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-8 text-muted-foreground sm:text-base">
            اكتب، اسأل، برمج، ولخّص — كل ذلك في واجهة محادثة أنيقة تدعم العربية والإنجليزية والأكواد
            بتنسيق كامل.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              className="rounded-xl brand-gradient-bg px-7 text-base font-extrabold text-primary-foreground shadow-glow hover:opacity-90"
            >
              <Link to={signedIn ? "/chat" : "/auth"}>ابدأ المحادثة</Link>
            </Button>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-border bg-card p-5">
              <feature.icon className="size-5 text-primary" />
              <h2 className="mt-3 text-base font-extrabold">{feature.title}</h2>
              <p className="mt-1 text-sm leading-7 text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
