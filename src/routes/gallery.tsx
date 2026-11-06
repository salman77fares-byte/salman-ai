import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GeneratedImage } from "@/components/salman/GeneratedImage";
import { Button } from "@/components/ui/button";
import { addToGallery, loadGallery, modelLabel, removeFromGallery, type GalleryItem } from "@/lib/image-gallery";
import { generateImageUrl } from "@/lib/pro-image";

export const Route = createFileRoute("/gallery")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "مكتبة الصور — Salman AI" },
      { name: "description", content: "كل الصور التي أنشأتها مع Salman AI في مكان واحد." },
      { property: "og:title", content: "مكتبة الصور — Salman AI" },
      { property: "og:description", content: "مكتبة الصور المُنشأة بالذكاء الاصطناعي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => setItems(loadGallery()), []);

  const regenerate = async (item: GalleryItem) => {
    if (busy) return;
    setBusy(true);
    try {
    const url = await generateImageUrl(item.prompt, item.model);
    const next: GalleryItem = {
      id: Date.now(),
      url,
      prompt: item.prompt,
      model: item.model,
      createdAt: Date.now(),
    };
    addToGallery(next);
    setItems(loadGallery());
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذّر إعادة التوليد."); }
    finally { setBusy(false); }
  };

  return (
    <div className="h-dvh overflow-y-auto overscroll-contain bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <Button asChild size="icon" variant="ghost" className="rounded-full" aria-label="رجوع">
          <Link to="/images">
            <ArrowRight className="size-5" />
          </Link>
        </Button>
        <h1 className="flex-1 text-lg font-extrabold">مكتبة الصور</h1>
        <Button asChild size="sm" variant="secondary" className="rounded-xl text-xs font-bold">
          <Link to="/images">
            <Sparkles className="size-3.5" />
            إنشاء
          </Link>
        </Button>
      </header>
      <main className="mx-auto max-w-4xl p-4">
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">لا توجد صور محفوظة بعد.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="space-y-1.5 rounded-3xl border border-border bg-card p-3 shadow-soft">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold">
                    {modelLabel(item.model)}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-full text-destructive"
                    aria-label="حذف الصورة"
                    onClick={() => setItems(removeFromGallery(item.id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <GeneratedImage url={item.url} prompt={item.prompt} busy={busy} onRegenerate={() => void regenerate(item)} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
