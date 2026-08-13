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
    <div className="flex h-screen w-full flex-col bg-[#0b101b] text-foreground" dir="rtl">
      {/* الهيدر الرئيسي المتوافق تماماً مع التصميم المطلوب */}
      <header className="flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-[#0b101b] px-4 shrink-0 z-20">
        
        {/* أقصى اليمين: أيقونة القائمة الجانبية وشعار Salman AI */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl hover:bg-slate-800/60 text-slate-200 p-0"
          >
            <Menu className="size-6" />
          </Button>

          <div 
            onClick={() => void navigate({ to: "/chat" })}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <span className="text-xl font-bold tracking-tight text-white font-sans">
              Salman AI
            </span>
            <BrandMark size={36} />
          </div>
        </div>

        {/* أقصى اليسار: زر تسجيل الدخول بالتدرج الذهبي الكبير */}
        <div>
          <Button
            onClick={() => void navigate({ to: "/auth" })}
            className="h-10 rounded-full bg-gradient-to-r from-[#5eead4] via-[#facc15] to-[#f59e0b] px-5 text-sm font-bold text-slate-950 shadow-md hover:opacity-95 transition-all flex items-center gap-2 border-0"
          >
            <LogIn className="size-4 rotate-180" />
            <span>تسجيل الدخول</span>
          </Button>
        </div>

      </header>

      {/* منطقة محتوى المحادثة */}
      <main className="flex-1 overflow-hidden relative flex flex-col bg-[#0b101b]">
        <Outlet />
      </main>
    </div>
  );
}
