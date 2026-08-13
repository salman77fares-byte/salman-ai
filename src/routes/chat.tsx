import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import {
  LogIn,
  LogOut,
  Menu,
  Settings,
  ExternalLink,
  X,
  BookOpen,
  ShoppingBag,
  Smartphone,
  ShieldCheck,
  FileText,
  Trash2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { BrandMark } from "@/components/salman/BrandMark";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/chat")({
  component: ChatLayout,
});

function ChatLayout() {
  const navigate = useNavigate();
  
  // حالات التحكم
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // إعدادات العرض والتخصيص
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [responseLang, setResponseLang] = useState("auto");
  const [selectedModel, setSelectedModel] = useState("fast");
  const [creativity, setCreativity] = useState("balanced");

  // نوافذ الشروط والسياسات
  const [activePolicyModal, setActivePolicyModal] = useState<"privacy" | "terms" | "delete" | null>(null);

  const handleAuthAction = () => {
    if (isLoggedIn) {
      setIsLoggedIn(false);
    } else {
      void navigate({ to: "/auth" });
    }
  };

  const getFontSizeValue = () => {
    switch (fontSize) {
      case "small": return "13px";
      case "large": return "18px";
      default: return "15px";
    }
  };

  return (
    <div 
      className="flex h-screen w-full flex-col bg-[#0b101b] text-slate-100 transition-all duration-200" 
      style={{ fontSize: getFontSizeValue() }}
      dir="rtl"
    >
      {/* الهيدر الرئيسي */}
      <header className="flex h-14 w-full items-center justify-between border-b border-slate-800/80 bg-[#0b101b] px-3 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
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

        <div className="shrink-0">
          <Button
            onClick={handleAuthAction}
            className={`h-8 rounded-full px-3.5 text-xs font-extrabold shadow-sm hover:opacity-95 transition-all flex items-center gap-1.5 border-0 whitespace-nowrap ${
              isLoggedIn
                ? "bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30"
                : "bg-gradient-to-r from-[#5eead4] via-[#facc15] to-[#f59e0b] text-slate-950"
            }`}
          >
            <span>{isLoggedIn ? "تسجيل الخروج" : "تسجيل الدخول"}</span>
            {isLoggedIn ? <LogOut className="size-3.5" /> : <LogIn className="size-3.5 rotate-180" />}
          </Button>
        </div>
      </header>

      {/* خلفية القائمة الجانبية */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* القائمة الجانبية */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-[#0d1424] border-l border-slate-800/80 flex flex-col justify-between p-4 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <BrandMark size={32} />
              <span className="text-lg font-bold text-white">Salman AI</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className="size-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="size-5" />
            </Button>
          </div>

          <div className="text-center py-6 px-2 space-y-2">
            <p className="text-xs font-semibold text-slate-300">
              {isLoggedIn
                ? "مرحباً بك مجدداً! محادثاتك وسجّلك محفوظ بنجاح."
                : "سجّل الدخول لحفظ محادثاتك وعرض سجّلك هنا."}
            </p>
          </div>
        </div>

        <div className="space-y-2.5 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => {
              setIsSidebarOpen(false);
              setIsSettingsOpen(true);
            }}
            className="w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 text-xs font-medium transition"
          >
            <Settings className="size-4 text-slate-400" />
            <span>الإعدادات</span>
          </button>

          <Button
            onClick={() => {
              setIsSidebarOpen(false);
              handleAuthAction();
            }}
            className={`w-full h-10 rounded-2xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 border-0 ${
              isLoggedIn
                ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30"
                : "bg-gradient-to-r from-[#5eead4] via-[#facc15] to-[#f59e0b] text-slate-950"
            }`}
          >
            <span>{isLoggedIn ? "تسجيل الخروج" : "تسجيل الدخول"}</span>
            {isLoggedIn ? <LogOut className="size-4" /> : <LogIn className="size-4 rotate-180" />}
          </Button>
        </div>
      </aside>

      {/* نافذة الإعدادات */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#0d1424] border border-slate-800 rounded-3xl p-5 text-slate-100 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">الإعدادات</h3>
                <p className="text-xs text-slate-400">تخصيص تجربتك في Salman AI.</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSettingsOpen(false)}
                className="size-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="size-5" />
              </Button>
            </div>
            {/* باقي خيارات الإعدادات كما هي */}
          </div>
        </div>
      )}

      {/* الشاشة الرئيسية تحتوي فقط على الـ Outlet لنقل تحكم الاقتراحات والإشعار للملف الداخلي */}
      <main className="flex-1 overflow-hidden relative flex flex-col bg-[#0b101b] w-full">
        <div className="flex-1 overflow-y-auto w-full p-2 sm:p-4 flex flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
