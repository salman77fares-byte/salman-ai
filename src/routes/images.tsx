import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Images as ImagesIcon, Loader2, Sparkles, Eye, EyeOff, X } from "lucide-react";
import { addToGallery } from "@/lib/image-gallery";
import { useState } from "react";
import { toast } from "sonner";

import { GeneratedImage } from "@/components/salman/GeneratedImage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { defaultImageModel, generateImageUrl, getImageKey, setImageKey, type GenerationModelId } from "@/lib/pro-image";
import { translateImagePrompt } from "@/lib/image-prompt.functions";
import { IMAGE_MODELS } from "@/lib/pollinations";

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

type Item = { id: number; url: string; prompt: string; model: GenerationModelId };

function ImagesPage() {
  const translate = useServerFn(translateImagePrompt);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [model, setModel] = useState<GenerationModelId>(() => defaultImageModel(getImageKey()));
  const [apiKey, updateApiKey] = useState(getImageKey);
  const [showKey, setShowKey] = useState(false);

  const push = async (english: string, m: GenerationModelId) => {
    const url = await generateImageUrl(english, m);
    const item = { id: Date.now(), url, prompt: english, model: m };
    addToGallery({ ...item, createdAt: item.id });
    setItems((prev) => [item, ...prev]);
  };

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
      await push(english, model);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر إنشاء الصورة.");
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async (item: Item) => {
    if (busy) return;
    setBusy(true);
    try { await push(item.prompt, item.model); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذّر إعادة التوليد."); }
    finally { setBusy(false); }
  };

  return (
    <div className="h-dvh overflow-y-auto overscroll-contain bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <Button asChild size="icon" variant="ghost" className="rounded-full" aria-label="رجوع">
          <Link to="/chat">
            <ArrowRight className="size-5" />
          </Link>
        </Button>
        <h1 className="flex-1 text-lg font-extrabold">إنشاء الصور</h1>
        <Button asChild size="sm" variant="secondary" className="rounded-xl text-xs font-bold">
          <Link to="/gallery">
            <ImagesIcon className="size-3.5" />
            مكتبة الصور
          </Link>
        </Button>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 p-4">
        <div className="space-y-3 rounded-3xl border border-border bg-card p-4 shadow-soft">
          <label className="block space-y-1 text-xs font-bold text-muted-foreground">
            <span>نموذج التوليد</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as GenerationModelId)}
              disabled={busy}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              {IMAGE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
              <option value="openai-pro">OpenAI GPT Image 1 — احترافي (مفتاح خاص)</option>
            </select>
          </label>
          <div className="space-y-2">
            <label htmlFor="image-api-key" className="text-xs font-bold text-muted-foreground">مفتاح OpenAI اختياري</label>
            <div className="flex items-center gap-1">
              <Input id="image-api-key" type={showKey ? "text" : "password"} dir="ltr" autoComplete="off" maxLength={512}
                disabled={busy} value={apiKey} placeholder="OpenAI API Key"
                onChange={(e) => { const key = e.target.value; updateApiKey(key); setImageKey(key); setModel(defaultImageModel(key)); }} />
              <Button size="icon" variant="ghost" aria-label={showKey ? "إخفاء المفتاح" : "إظهار المفتاح"} onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>
              {apiKey ? <Button size="icon" variant="ghost" disabled={busy} aria-label="حذف المفتاح" onClick={() => { updateApiKey(""); setImageKey(""); setModel("flux"); }}><X className="size-4" /></Button> : null}
            </div>
            <p className="text-xs text-muted-foreground">OpenAI خدمة مدفوعة حسب حسابك. المفتاح مؤقت ولا يُحفظ؛ بدونه تتوفر الخيارات المجانية. لا توجد جودة مضمونة.</p>
          </div>
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
            disabled={busy || !prompt.trim() || (model === "openai-pro" && !apiKey.trim())}
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
                busy={busy}
                onRegenerate={() => void regenerate(item)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
