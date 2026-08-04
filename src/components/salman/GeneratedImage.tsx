import { Download, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Matches an assistant message that is purely a generated image. */
const IMAGE_MESSAGE = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/;

export function parseImageMessage(text: string): { prompt: string; url: string } | null {
  const match = IMAGE_MESSAGE.exec(text.trim());
  if (!match) return null;
  return { prompt: match[1] ?? "", url: match[2] ?? "" };
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

  const download = async () => {
    setDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `salman-ai-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("تم تحميل الصورة");
    } catch {
      toast.error("تعذّر تحميل الصورة.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <img
        src={url}
        alt={prompt || "صورة مولّدة بواسطة Salman AI"}
        loading="lazy"
        className="w-full rounded-2xl border border-border shadow-soft"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-xl text-xs font-bold"
          onClick={() => void download()}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Download className="size-3.5" />
          )}
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
            إعادة التوليد
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ImageGenerationLoader() {
  return (
    <div className="w-full max-w-sm">
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary">
        <div className="absolute inset-0 animate-pulse brand-gradient-bg opacity-15" />
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
      <p className="mt-2 text-xs font-bold text-muted-foreground">
        جاري رسم وتوليد صورتك بواسطة Salman AI...
      </p>
    </div>
  );
}
