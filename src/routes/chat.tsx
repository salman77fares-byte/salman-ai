import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { LogIn, Menu } from "lucide-react";

import { BrandMark } from "@/components/salman/BrandMark";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/chat")({
  component: ChatLayout,
});

function ChatLayout() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground" dir="rtl">
      {/* الهيدر الرئيسي الموحد للدردشة */}
      <header className="relative flex h-16 w-full items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur shrink-0 z-20">
        
        {/* الطرف الأيسر: زر تسجيل الدخول المميز */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void navigate({ to: "/auth" })}
            className="h-9 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition-all"
          >
            <LogIn className="ml-1.5 size-4" />
            تسجيل الدخول
          </Button>
        </div>

        {/* المنتصف: الشعار مع الاسم */}
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 cursor-pointer" onClick={() => void navigate({ to: "/chat" })}>
          <BrandMark size={32} />
          <span className="text-lg font-black tracking-tight text-foreground">
            Salman AI
          </span>
        </div>

        {/* الطرف الأيمن: زر القائمة الجانبية */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-xl hover:bg-secondary text-foreground"
          >
            <Menu className="size-5" />
          </Button>
        </div>

      </header>

      {/* محتوى المحادثة */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
