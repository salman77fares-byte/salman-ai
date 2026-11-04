import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GeneratedImage } from "@/components/salman/GeneratedImage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { translateImagePrompt } from "@/lib/image-prompt.functions";
import { buildPollinationsUrl } from "@/lib/pollinations";

export const Route = createFileRoute("/images")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "إنشاء الصور — Salman AI" },
      { name: "description", content: "اكتب وصفاً وأنشئ صوراً بالذكاء الاصطناعي ثم عاينها وحمّلها." },
      { property: "og:title", content: "إنشاء الصور — Salman AI" },
      { property: "og:description", content: "أنشئ صوراً بالذكاء الاصطناعي مع Salman AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImagesPage,
});

type Item = { id: number; url: string; prompt: string };

function ImagesPage() {
  const translate = useServerFn(translateImagePrompt);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  const generate = async () => {
    const text = prompt.trim();
    if (!text || busy) return;
    if (!navigator.onLine) {
      toast.error("لا يوجد اتصال بالإنترنت. يرجى الاتصال لإنشاء الصور.");
      return;
    }
    setBusy(true);
    try {
      let english = text;
      try {
        english = (await translate({ data: { prompt: text.slice(0, 600) } })).prompt || text;
      } catch {
        /* use the original text */
      }
      setItems((prev) => [{ id: Date.now(), url: buildPollinationsUrl(english), prompt: english }, ...prev]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-dvh overflow-y-auto overscroll-contain bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <Button asChild size="icon" variant="ghost" className="rounded-full" aria-label="رجوع">
          <Link to="/chat">
            <ArrowRight className="size-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-extrabold">إنشاء الصور</h1>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 p-4">
        <div className="space-y-3 rounded-3xl border border-border bg-card p-4 shadow-soft">
          <Textarea
            dir="auto"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="صف الصورة التي تريدها... مثال: قلعة على جبل وقت الغروب"
            className="min-h-24 rounded-2xl"
            maxLength={600}
          />
          <Button
            onClick={() => void generate()}
            disabled={busy || !prompt.trim()}
            className="w-full rounded-xl brand-gradient-bg font-extrabold text-primary-foreground hover:opacity-90"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            إنشاء الصورة
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">ستظهر صورك هنا.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {items.map((item) => (
              <GeneratedImage
                key={item.id}
                url={item.url}
                prompt={item.prompt}
                onRegenerate={() =>
                  setItems((prev) => [
                    { id: Date.now(), url: buildPollinationsUrl(item.prompt), prompt: item.prompt },
                    ...prev,
                  ])
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
