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
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);


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
      window.open(url, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
  };

  if (failed) {
    return (
      <p className="text-xs font-bold text-destructive">
        تعذّر توليد الصورة، حاول مرة أخرى.
      </p>
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
        <img
          key={attempt}
          src={attempt === 0 ? url : `${url}&retry=${attempt}`}
          alt={prompt || "صورة مولّدة بواسطة Salman AI"}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (attempt < 2) setAttempt((value) => value + 1);
            else setFailed(true);
          }}
          className="block aspect-square w-full object-cover"
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-xl text-xs font-bold"
          onClick={() => void download()}
          disabled={downloading || !loaded}
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
            إعادة توليد
          </Button>
        ) : null}
      </div>
    </div>
  );
}
