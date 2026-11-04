import { Download, Expand, Loader2, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** Matches an assistant message that is purely a generated image. */
const IMAGE_MESSAGE = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/;

export function parseImageMessage(text: string): { prompt: string; url: string } | null {
  const match = IMAGE_MESSAGE.exec(text.trim());
  if (!match) return null;
  return { prompt: match[1] ?? "", url: match[2] ?? "" };
}

/** Saves an image; on phones uses the share sheet ("Save image") when available. */
export async function downloadImage(url: string) {
  const name = `salman-ai-${Date.now()}.png`;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], name, { type: blob.type || "image/png" });
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name });
        return;
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return;
      }
    }
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    toast.success("تم تحميل الصورة");
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

export function GeneratedImage({
  url,
  prompt,
  onRegenerate,
  busy,
}: {
  url: string;
  prompt: string;
  onRegenerate?: (() => void) | undefined;
  busy?: boolean | undefined;
}) {
  const [downloading, setDownloading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState(false);
  const src = attempt === 0 ? url : `${url}&retry=${attempt}`;

  const download = async () => {
    setDownloading(true);
    await downloadImage(src);
    setDownloading(false);
  };

  if (failed) {
    return (
      <p className="text-xs font-bold text-destructive">تعذّر توليد الصورة، حاول مرة أخرى.</p>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="relative overflow-hidden rounded-2xl border border-border shadow-soft">
        {!loaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-secondary">
            <div className="absolute inset-0 animate-pulse brand-gradient-bg opacity-15" />
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="px-3 text-center text-[11px] font-bold text-muted-foreground">
              جاري رسم وتوليد صورتك بواسطة Salman AI...
            </p>
          </div>
        ) : null}
        <button
          type="button"
          className="block w-full"
          onClick={() => loaded && setPreview(true)}
          aria-label="معاينة الصورة"
        >
          <img
            key={attempt}
            src={src}
            alt={prompt || "صورة مولّدة بواسطة Salman AI"}
            onLoad={() => setLoaded(true)}
            onError={() => {
              if (attempt < 2) setAttempt((value) => value + 1);
              else setFailed(true);
            }}
            className="block aspect-square w-full object-cover"
          />
        </button>
      </div>
      {prompt ? (
        <p dir="ltr" className="mt-1.5 line-clamp-3 text-start text-[10px] leading-4 text-muted-foreground">
          {prompt}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-xl text-xs font-bold"
          onClick={() => setPreview(true)}
          disabled={!loaded}
        >
          <Expand className="size-3.5" />
          معاينة
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-xl text-xs font-bold"
          onClick={() => void download()}
          disabled={downloading || !loaded}
        >
          {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          تحميل
        </Button>
        {onRegenerate ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl text-xs font-bold"
            onClick={onRegenerate}
            disabled={busy}
          >
            <RefreshCw className="size-3.5" />
            إعادة توليد
          </Button>
        ) : null}
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="flex h-dvh max-h-dvh w-screen max-w-none items-center justify-center rounded-none border-0 bg-background/95 p-0 [&>button]:hidden">
          <DialogTitle className="sr-only">معاينة الصورة</DialogTitle>
          <img src={src} alt={prompt || "صورة"} className="max-h-full max-w-full object-contain" />
          <div className="absolute inset-x-0 top-0 flex justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <Button size="icon" variant="secondary" className="rounded-full" onClick={() => setPreview(false)} aria-label="إغلاق">
              <X className="size-5" />
            </Button>
            <Button size="icon" variant="secondary" className="rounded-full" onClick={() => void download()} disabled={downloading} aria-label="تحميل">
              {downloading ? <Loader2 className="size-5 animate-spin" /> : <Download className="size-5" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
