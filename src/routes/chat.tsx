import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import {
  LogIn,
  Menu,
  Settings,
  Sun,
  Moon,
  ExternalLink,
  X,
  BookOpen,
  ShoppingBag,
  Smartphone,
} from "lucide-react";
import { useState } from "react";

import { BrandMark } from "@/components/salman/BrandMark";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/chat")({
  component: ChatLayout,
});

function ChatLayout() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  return (
    <div className="flex h-screen w-full flex-col bg-[#0b101b] text-foreground" dir="rtl">
      {/* الهيدر الرئيسي */}
      <header className="flex h-14 w-full items-center justify-between border-b border-slate-800/80 bg-[#0b101b] px-3 shrink-0 z-20">
        
        {/* الطرف الأيمن */}
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

        {/* الطرف الأيسر */}
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

          <div className="text-center py-10 px-2 space-y-2">
            <p className="text-sm font-semibold text-slate-300">
              سجّل الدخول لحفظ محادثاتك وعرض سجّلك هنا.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 text-sm font-medium transition"
          >
            {isDarkMode ? <Sun className="size-5 text-amber-400" /> : <Moon className="size-5 text-indigo-400" />}
            <span>{isDarkMode ? "الوضع النهاري" : "الوضع الليلي"}</span>
          </button>

          <button
            onClick={() => {
              setIsSidebarOpen(false);
              setIsSettingsOpen(true);
            }}
            className="w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 text-sm font-medium transition"
          >
            <Settings className="size-5 text-slate-400" />
            <span>الإعدادات</span>
          </button>

          <Button
            onClick={() => void navigate({ to: "/auth" })}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-[#5eead4] via-[#facc15] to-[#f59e0b] text-slate-950 font-bold text-sm shadow-md hover:opacity-95 transition flex items-center justify-center gap-2 border-0"
          >
            <span>تسجيل الدخول</span>
            <LogIn className="size-4 rotate-180" />
          </Button>
        </div>
      </aside>

      {/* نافذة الإعدادات */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#0d1424] border border-slate-800 rounded-3xl p-5 text-slate-100 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            
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

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400">الحساب</span>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                أنت تستخدم التطبيق كزائر، سجّل الدخول لحفظ محادثاتك.
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400">التفضيلات</span>
              
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-sm font-semibold">الوضع الليلي</span>
                <input
                  type="checkbox"
                  checked={isDarkMode}
                  onChange={(e) => setIsDarkMode(e.target.checked)}
                  className="toggle toggle-accent cursor-pointer accent-[#2dd4bf] h-5 w-9"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-sm font-semibold">لغة الردود</span>
                <select className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-1.5 focus:outline-none">
                  <option>تلقائي</option>
                  <option>العربية</option>
                  <option>English</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-sm font-semibold">حجم الخط</span>
                <select className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-1.5 focus:outline-none">
                  <option>متوسط</option>
                  <option>صغير</option>
                  <option>كبير</option>
                </select>
              </div>
            </div>

            {/* مشاريع وخدمات سلمان - الروابط المحدثة */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                🌐 مشاريع وخدمات سلمان
              </span>

              {/* زاد الدعاة */}
              <a
                href="https://zad-alduat.lovable.app"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-blue-400">
                    <BookOpen className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">زاد الدعاة</h4>
                    <p className="text-[11px] text-slate-400">منصة محتوى دعوي ومكتبة موارد</p>
                  </div>
                </div>
                <ExternalLink className="size-4 text-slate-500" />
              </a>

              {/* متجر كنز */}
              <a
                href="https://kanzstore.lovable.app/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-cyan-400">
                    <ShoppingBag className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">متجر كنز</h4>
                    <p className="text-[11px] text-slate-400">متجر إلكتروني للمنتجات المختارة</p>
                  </div>
                </div>
                <ExternalLink className="size-4 text-slate-500" />
              </a>

              {/* متجر سلمان فارس */}
              <a
                href="https://salmanfares-ai.lovable.app"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-amber-400">
                    <Smartphone className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">متجر سلمان فارس</h4>
                    <p className="text-[11px] text-slate-400">متجر تقني للأجهزة والملحقات</p>
                  </div>
                </div>
                <ExternalLink className="size-4 text-slate-500" />
              </a>
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-400">عن التطبيق</span>
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-3">
                <p>Salman AI — الإصدار 1.0. تطوير: سلمان فارس.</p>
                <div className="flex items-center gap-3 text-[#2dd4bf] font-medium pt-1">
                  <button className="hover:underline">سياسة الخصوصية</button>
                  <button className="hover:underline">شروط الاستخدام</button>
                  <button className="hover:underline text-rose-400">حذف الحساب</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* منطقة المحادثة */}
      <main className="flex-1 overflow-hidden relative flex flex-col bg-[#0b101b]">
        <Outlet />
      </main>
    </div>
  );
}
