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
  Plus,
  Send,
  Mic,
  ChevronDown
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

  // المشاريع
  const projects = [
    { title: "زاد الدعاة", desc: "منصة محتوى دعوي ومكتبة موارد", url: "https://zad-alduat.lovable.app", icon: BookOpen, color: "text-[#2dd4bf]" },
    { title: "متجر كنز", desc: "متجر إلكتروني للمنتجات المختارة", url: "https://kanzstore.lovable.app", icon: ShoppingBag, color: "text-[#facc15]" },
    { title: "متجر سلمان فارس", desc: "متجر تقني للأجهزة والملحقات", url: "https://salmanfares-ai.lovable.app", icon: Smartphone, color: "text-[#f59e0b]" },
  ];

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
      className="flex h-screen w-full flex-col bg-[#0b101b] text-slate-100 transition-all duration-200 overflow-hidden" 
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

          {/* روابط الصفحات القانونية في القائمة الجانبية */}
          <div className="space-y-1">
            <button 
              onClick={() => { setIsSidebarOpen(false); setActivePolicyModal("privacy"); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 text-xs font-medium transition"
            >
              <ShieldCheck className="size-4 text-slate-400" />
              <span>سياسة الخصوصية</span>
            </button>
            <button 
              onClick={() => { setIsSidebarOpen(false); setActivePolicyModal("terms"); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800/60 text-xs font-medium transition"
            >
              <FileText className="size-4 text-slate-400" />
              <span>شروط الاستخدام</span>
            </button>
            <button 
              onClick={() => { setIsSidebarOpen(false); setActivePolicyModal("delete"); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition"
            >
              <Trash2 className="size-4 text-rose-400" />
              <span>حذف الحساب</span>
            </button>
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

      {/* نافذة الإعدادات Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0d1424] border border-slate-800 rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">الإعدادات</h2>
                <p className="text-[10px] text-slate-400">تخصيص تجربتك في Salman AI.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(false)}><X className="size-4" /></Button>
            </div>

            {/* الحساب */}
            <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800/80 text-center">
              <p className="text-xs text-slate-300 leading-relaxed">
                أنت تستخدم التطبيق كزائر، سجّل الدخول لحفظ محادثاتك.
              </p>
            </div>

            {/* إعدادات الذكاء الاصطناعي */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-[#2dd4bf] flex items-center gap-1.5"><Sparkles className="size-3.5" /> إعدادات الذكاء الاصطناعي</h3>
              <div className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-800/60 text-xs">
                <span>نموذج الإجابة</span>
                <span className="text-slate-400 flex items-center gap-1">Salman AI Fast (سريع) <ChevronDown className="size-3" /></span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-800/60 text-xs">
                <span>نمط الرد</span>
                <span className="text-slate-400 flex items-center gap-1">متوازن <ChevronDown className="size-3" /></span>
              </div>
            </div>

            {/* التفضيلات والعرض */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-400">التفضيلات والعرض</h3>
              <div className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-800/60 text-xs">
                <span>لغة الردود</span>
                <span className="text-slate-400 flex items-center gap-1">تلقائي <ChevronDown className="size-3" /></span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-800/60 text-xs">
                <span>حجم الخط</span>
                <span className="text-slate-400 flex items-center gap-1">متوسط (15px) <ChevronDown className="size-3" /></span>
              </div>
            </div>

            {/* مشاريع سلمان */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">🌐 مشاريع وخدمات سلمان</h3>
              <div className="space-y-2">
                {projects.map((proj, i) => (
                  <div 
                    key={i} 
                    onClick={() => window.open(proj.url, '_blank')}
                    className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-800/60 cursor-pointer hover:bg-slate-800/50 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-slate-800 rounded-lg"><proj.icon className={`size-4 ${proj.color}`} /></div>
                      <div>
                        <h4 className="font-bold text-xs text-white">{proj.title}</h4>
                        <p className="text-[10px] text-slate-400">{proj.desc}</p>
                      </div>
                    </div>
                    <ExternalLink className="size-3.5 text-slate-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نوافذ السياسات Modals */}
      {activePolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0d1424] border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">
                {activePolicyModal === "privacy" && "سياسة الخصوصية"}
                {activePolicyModal === "terms" && "شروط الاستخدام"}
                {activePolicyModal === "delete" && "حذف الحساب"}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setActivePolicyModal(null)}><X className="size-4" /></Button>
            </div>
            <div className="text-xs text-slate-300 leading-relaxed max-h-60 overflow-y-auto space-y-2">
              {activePolicyModal === "privacy" && (
                <p>تلتزم منصة Salman AI بحماية خصوصيتك وبياناتك الشخصية. لا نقوم ببيع معلوماتك أو مشاركتها مع أي أطراف خارجية.</p>
              )}
              {activePolicyModal === "terms" && (
                <p>باستخدامك للتطبيق، فإنك توافق على الاستخدام العادل وعدم إرسال أي محتوى مخالف للقوانين والتعليمات العامة.</p>
              )}
              {activePolicyModal === "delete" && (
                <div className="space-y-3">
                  <p className="text-rose-400 font-semibold">هل أنت تأكد من رغبتك في حذف حسابك تماماً؟</p>
                  <p className="text-[11px] text-slate-400">سوف يتم مسح جميع محادثاتك وسجلاتك ولا يمكن استعادتها.</p>
                  <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 rounded-xl text-xs">
                    تأكيد حذف الحساب
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* الشاشة الرئيسية */}
      <main className="flex-1 overflow-hidden relative flex flex-col justify-between bg-[#0b101b] w-full">
        <div className="flex-1 overflow-y-auto w-full p-2 sm:p-4 flex flex-col justify-center items-center">
          
          {/* قسم الشعار والترحيب الرئيسي (فوق حقل الإرسال) */}
          <div className="flex flex-col items-center justify-center text-center space-y-3 my-auto max-w-sm">
            <div className="relative p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <BrandMark size={64} />
            </div>
            
            <h1 className="text-xl font-black text-white tracking-tight">
              مرحباً بك مع Salman AI
            </h1>

            <p className="text-xs text-slate-400 leading-relaxed px-4">
              أسألني أي شيء، أرفق صوراً، واستفد من خيارات النقر المطوّل على الرسائل.
            </p>
          </div>

          <Outlet />
        </div>

        {/* قسم الأسئلة السريعة ومربع الإدخال وشريط التنبيه */}
        <div className="w-full p-3 bg-[#0b101b] border-t border-slate-800/60 space-y-2.5 shrink-0">
          
          {/* زر محادثة جديدة والاقتراحات السريعة */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 text-white text-xs font-bold shrink-0 border border-slate-700/60">
              <Plus className="size-3.5 text-[#2dd4bf]" />
              <span>محادثة جديدة</span>
            </button>
            <button className="px-3 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 text-xs shrink-0 border border-slate-800/80">
              أحدث الأخبار الرياضية
            </button>
            <button className="px-3 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 text-xs shrink-0 border border-slate-800/80">
              اشرح لي فكرة مشروع
            </button>
            <button className="px-3 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 text-xs shrink-0 border border-slate-800/80">
              كتابة مقال
            </button>
          </div>

          {/* مربع حقل الإدخال */}
          <div className="bg-slate-900/90 rounded-2xl p-1.5 flex items-center gap-2 border border-slate-800 focus-within:border-[#2dd4bf] transition">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white size-8 rounded-xl shrink-0">
              <Mic className="size-4" />
            </Button>
            
            <input 
              placeholder="اكتب رسالتك لـ Salman AI..." 
              className="flex-1 bg-transparent outline-none text-xs text-white placeholder:text-slate-500 px-1" 
            />

            <Button className="bg-[#2dd4bf] text-black hover:bg-[#2dd4bf]/90 size-8 rounded-xl p-0 shrink-0">
              <Send className="size-3.5" />
            </Button>
          </div>

          {/* شريط التنبيه المتموضع في الأسفل */}
          {!isLoggedIn && (
            <div className="w-full py-1.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-[11px] text-amber-300/90">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="size-3.5 text-amber-400 shrink-0" />
                <span>تنبيه: محادثة كزائر — لن يتم حفظ السجل.</span>
              </div>
              <button
                onClick={() => void navigate({ to: "/auth" })}
                className="font-bold text-[#2dd4bf] hover:underline whitespace-nowrap"
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
