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
  AlertCircle,
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

      {/* القائمة الجانبية (بدون زر الوضع النهاري) */}
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

        {/* الأسفل: الإعدادات + تسجيل الدخول */}
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

      {/* نافذة الإعدادات العودة كاملة بكل الخيارات */}
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

            {/* الحساب */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400">الحساب</span>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {isLoggedIn
                  ? "أنت مسجل الدخول حالياً. يتم حفظ جميع المحادثات وتفضيلات الحساب تلقائياً."
                  : "أنت تستخدم التطبيق كزائر، سجّل الدخول لحفظ محادثاتك."}
              </div>
            </div>

            {/* إعدادات الذكاء الاصطناعي */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <Sparkles className="size-3.5 text-amber-400" /> إعدادات الذكاء الاصطناعي
              </span>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs font-semibold">نموذج الإجابة</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-1.5 focus:outline-none text-slate-200"
                >
                  <option value="fast">Salman AI Fast (سريع)</option>
                  <option value="pro">Salman AI Pro (دقيق)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs font-semibold">نمط الرد</span>
                <select
                  value={creativity}
                  onChange={(e) => setCreativity(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-1.5 focus:outline-none text-slate-200"
                >
                  <option value="precise">دقيق ومباشر</option>
                  <option value="balanced">متوازن</option>
                  <option value="creative">مبدع وموسع</option>
                </select>
              </div>
            </div>

            {/* التفضيلات والعرض */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400">التفضيلات والعرض</span>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs font-semibold">لغة الردود</span>
                <select
                  value={responseLang}
                  onChange={(e) => setResponseLang(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-1.5 focus:outline-none text-slate-200"
                >
                  <option value="auto">تلقائي</option>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* حجم الخط الجاهز للعمل */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs font-semibold">حجم الخط</span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value as "small" | "medium" | "large")}
                  className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-1.5 focus:outline-none text-slate-200 cursor-pointer"
                >
                  <option value="small">صغير (13px)</option>
                  <option value="medium">متوسط (15px)</option>
                  <option value="large">كبير (18px)</option>
                </select>
              </div>
            </div>

            {/* مشاريع وخدمات سلمان */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                🌐 مشاريع وخدمات سلمان
              </span>

              <a
                href="https://zad-alduat.lovable.app"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-blue-400">
                    <BookOpen className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">زاد الدعاة</h4>
                    <p className="text-[10px] text-slate-400">منصة محتوى دعوي ومكتبة موارد</p>
                  </div>
                </div>
                <ExternalLink className="size-3.5 text-slate-500" />
              </a>

              <a
                href="https://kanzstore.lovable.app/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-cyan-400">
                    <ShoppingBag className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">متجر كنز</h4>
                    <p className="text-[10px] text-slate-400">متجر إلكتروني للمنتجات المختارة</p>
                  </div>
                </div>
                <ExternalLink className="size-3.5 text-slate-500" />
              </a>

              <a
                href="https://salmanfares-ai.lovable.app"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-amber-400">
                    <Smartphone className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">متجر سلمان فارس</h4>
                    <p className="text-[10px] text-slate-400">متجر تقني للأجهزة والملحقات</p>
                  </div>
                </div>
                <ExternalLink className="size-3.5 text-slate-500" />
              </a>
            </div>

            {/* عن التطبيق */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-400">عن التطبيق</span>
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-3">
                <p>Salman AI — الإصدار 1.0. تطوير: سلمان فارس.</p>
                <div className="flex items-center justify-between text-[#2dd4bf] font-medium pt-1 text-[11px]">
                  <button onClick={() => setActivePolicyModal("privacy")} className="hover:underline flex items-center gap-1">
                    <ShieldCheck className="size-3.5" /> سياسة الخصوصية
                  </button>
                  <button onClick={() => setActivePolicyModal("terms")} className="hover:underline flex items-center gap-1">
                    <FileText className="size-3.5" /> شروط الاستخدام
                  </button>
                  <button onClick={() => setActivePolicyModal("delete")} className="hover:underline text-rose-400 flex items-center gap-1">
                    <Trash2 className="size-3.5" /> حذف الحساب
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* مودال النوافذ المنسدلة */}
      {activePolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0d1424] border border-slate-800 rounded-3xl p-5 text-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-bold text-sm text-white">
                {activePolicyModal === "privacy" && "سياسة الخصوصية"}
                {activePolicyModal === "terms" && "شروط الاستخدام"}
                {activePolicyModal === "delete" && "حذف الحساب"}
              </h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActivePolicyModal(null)}
                className="size-7 rounded-full text-slate-400"
              >
                <X className="size-4" />
              </Button>
            </div>
            
            <div className="text-xs text-slate-300 leading-relaxed space-y-2">
              {activePolicyModal === "privacy" && (
                <p>نحن نحترم خصوصيتك بالكامل. جميع بيانات محادثاتك تشفر وتخزن بشكل آمن فقط عند تسجيل دخولك بحسابك الشخصي.</p>
              )}
              {activePolicyModal === "terms" && (
                <p>استخدامك لتطبيق Salman AI يعني موافقتك على عدم إساءة استخدام المنصة وتوليد المحتوى المخالف للقوانين العامة.</p>
              )}
              {activePolicyModal === "delete" && (
                <div className="space-y-3">
                  <p className="text-rose-400 font-semibold">هل أنت تأكد من رغبتك في حذف الحساب؟ سيؤدي ذلك إلى حذف كافة المحادثات نهائياً.</p>
                  <Button
                    onClick={() => {
                      setIsLoggedIn(false);
                      setActivePolicyModal(null);
                      setIsSettingsOpen(false);
                    }}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 rounded-xl text-xs"
                  >
                    تأكيد حذف الحساب
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* منطقة المحادثة */}
      <main className="flex-1 overflow-hidden relative flex flex-col bg-[#0b101b]">
        
        {/* شاشة العرض والأجوبة */}
        <div className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </div>

        {/* الشريط المدمج السفلي: يحتوي على شريط التنبيه المدمج المصغر + حقل الإدخال الأصلي */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0b101b]/95 backdrop-blur shrink-0 space-y-2">
          
          {/* التنبيه المصغر في المنطقة المحددة بالأحمر فوق حقل الرسالة */}
          {!isLoggedIn && (
            <div className="max-w-4xl mx-auto py-1 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-[11px] text-amber-300/90">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="size-3.5 text-amber-400 shrink-0" />
                <span>تنبيه: محادثة كزائر — لن يتم حفظ السجل.</span>
              </div>
              <button
                onClick={() => void navigate({ to: "/auth" })}
                className="font-bold text-[#2dd4bf] hover:underline"
              >
                تسجيل الدخول
              </button>
            </div>
          )}

        </div>

      </main>
    </div>
  );
}
