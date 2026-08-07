import { cn } from "@/lib/utils";

export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl overflow-hidden p-0 ring-1 ring-border",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src="/logo.png"
        alt="شعار Salman AI"
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
