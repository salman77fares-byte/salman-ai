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
      {/* الهيدر الرئيسي المنسق بالكامل */}
      <header className="flex h-14 w-full items-center justify-between border-b border-slate-800/80 bg-[#0b101b] px-3 shrink-0 z-20">
        
        {/* الطرف الأيمن: القائمة ثم الشعار والاسم بجانب بعضهما تماماً */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg hover:bg-slate-800/60 text-slate-200 p-0 shrink-0"
          >
            <Menu className="size-5" />
          </Button>

          <div 
            onClick={() => void navigate({ to: "/chat" })}
            className="flex items-center gap-2 cursor-pointer select-none shrink-0"
          >
            <BrandMark size={30} />
            <span className="text-base font-black tracking-tight text-white whitespace-nowrap">
              Salman AI
            </span>
          </div>
        </div>

        {/* الطرف الأيسر: زر تسجيل الدخول المدمج والأنيق */}
        <div className="shrink-0">
          <Button
            onClick={() => void navigate({ to: "/auth" })}
            className="h-8 rounded-full bg-gradient-to-r from-[#5eead4] via-[#facc15] to-[#f59e0b] px-3.5 text-xs font-extrabold text-slate-950 shadow-sm hover:opacity-95 transition-all flex items-center gap-1.5 border-0 whitespace-nowrap"
          >
            <span>تسجيل الدخول</span>
            <LogIn className="size-3.5 rotate-180" />
          </Button>
        </div>

      </header>

      {/* منطقة المحادثة */}
      <main className="flex-1 overflow-hidden relative flex flex-col bg-[#0b101b]">
        <Outlet />
      </main>
    </div>
  );
}
