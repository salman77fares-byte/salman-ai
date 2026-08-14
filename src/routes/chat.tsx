import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Menu,
  Settings,
  X,
  LogOut,
  AlertTriangle,
  LogIn,
  Shield,
  FileText,
  Trash2,
  Moon,
  Languages,
  Type,
  Send,
  Mic,
  BookOpen,
  ShoppingBag,
  Smartphone,
  ExternalLink,
  Sparkles,
  User,
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const projects = [
    { title: "زاد الدعاة", desc: "منصة محتوى دعوي ومكتبة موارد", url: "https://zad-alduat.lovable.app", icon: BookOpen, color: "text-[#2dd4bf]" },
    { title: "متجر كنز", desc: "متجر إلكتروني للمنتجات المختارة", url: "https://kanzstore.lovable.app", icon: ShoppingBag, color: "text-[#facc15]" },
    { title: "متجر سلمان فارس", desc: "متجر تقني للأجهزة والملحقات", url: "https://salmanfares-ai.lovable.app", icon: Smartphone, color: "text-[#f59e0b]" },
  ];

  return (
    <div className="flex h-screen w-full flex-col bg-[#0b101b] text-slate-100 overflow-hidden" dir="rtl">
      
      {/* الهيدر العلوي */}
      <header className="flex h-14 w-full items-center justify-between border-b border-slate-800/80 bg-[#0b101b] px-3 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="size-8 rounded-lg hover:bg-slate-800/60 p-0">
            <Menu className="size-5" />
          </Button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => void navigate({ to: "/chat" })}>
            <BrandMark size={30} />
            <span className="text-base font-black text-white">Salman AI</span>
          </div>
        </div>
        <Button onClick={() => setIsSettingsOpen(true)} variant="ghost" size="icon" className="size-8 rounded-lg text-slate-400 hover:text-white">
          <Settings className="size-5" />
        </Button>
      </header>

      {/* القائمة الجانبية (Sidebar) */}
      {isSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-[280px] bg-[#0d1424] border-l border-slate-800 z-50 p-5 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <span className="font-bold text-lg">القائمة</span>
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}><X className="size-5" /></Button>
            </div>

            {/* الروابط القانونية في الأعلى */}
            <div className="space-y-2 flex-1">
              <button className="flex items-center gap-3 w-full p-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition"><Shield className="size-5" /> سياسة الخصوصية</button>
              <button className="flex items-center gap-3 w-full p-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition"><FileText className="size-5" /> شروط الاستخدام</button>
              <button className="flex items-center gap-3 w-full p-3 text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition"><Trash2 className="size-5" /> حذف الحساب</button>
            </div>

            {/* زر تسجيل الدخول في الأسفل */}
            <div className="pt-6 border-t border-slate-800">
                <Button 
                    onClick={() => void navigate({ to: "/auth" })}
                    className="w-full justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white h-12 rounded-xl transition"
                >
                    <LogIn className="size-5" />
                    تسجيل الدخول
                </Button>
            </div>
          </div>
        </>
      )}

      {/* نافذة الإعدادات (Settings Modal) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0d1424] border border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">الإعدادات</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(false)}><X className="size-5" /></Button>
            </div>
            
            <div className="space-y-6">
              {/* قسم الحساب (الزائر) */}
              <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 text-center">
                <p className="text-xs text-slate-400 leading-relaxed">
                    أنت تستخدم التطبيق كزائر، سجل الدخول لحفظ محادثاتك.
                </p>
              </div>

              {/* إعدادات الذكاء الاصطناعي */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#2dd4bf] flex items-center gap-1"><Sparkles className="size-3" /> إعدادات الذكاء الاصطناعي</h3>
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                   <span className="text-sm">نموذج الإجابة</span>
                   <div className="flex items-center gap-1 text-slate-400 text-xs">Salman AI Fast <ChevronDown className="size-3" /></div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                   <span className="text-sm">نمط الرد</span>
                   <div className="flex items-center gap-1 text-slate-400 text-xs">متوازن <ChevronDown className="size-3" /></div>
                </div>
              </div>

              {/* التفضيلات والعرض */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400">التفضيلات والعرض</h3>
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                   <span className="text-sm">لغة الردود</span>
                   <div className="flex items-center gap-1 text-slate-400 text-xs">تلقائي <ChevronDown className="size-3" /></div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                   <span className="text-sm">حجم الخط</span>
                   <div className="flex items-center gap-1 text-slate-400 text-xs">متوسط (15px) <ChevronDown className="size-3" /></div>
                </div>
              </div>

              {/* قسم المشاريع */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 px-1">🌐 مشاريع سلمان</h3>
                {projects.map((proj, i) => (
                  <div 
                    key={i} 
                    onClick={() => window.open(proj.url, '_blank')}
                    className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800 cursor-pointer hover:bg-slate-900 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-800 rounded-lg"><proj.icon className={`size-5 ${proj.color}`} /></div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{proj.title}</h4>
                        <p className="text-[10px] text-slate-500">{proj.desc}</p>
                      </div>
                    </div>
                    <ExternalLink className="size-4 text-slate-600" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* المحتوى الرئيسي */}
      <main className="flex-1 relative flex flex-col bg-[#0b101b]">
        <div className="flex-1 overflow-y-auto">
          {/* محتوى المحادثة */}
        </div>

        {/* التنبيه فوق مربع الإدخال */}
        {!isLoggedIn && (
           <div className="px-4 py-3 bg-[#2dd4bf]/5 border-t border-[#2dd4bf]/20 text-center mx-2 rounded-t-xl cursor-pointer hover:bg-[#2dd4bf]/10 transition" onClick={() => void navigate({ to: "/auth" })}>
             <p className="text-xs text-[#2dd4bf] flex items-center justify-center gap-2 font-bold">
               <AlertTriangle className="size-4" />
               أنت تستخدم التطبيق كزائر، <span className="underline">انقر لتسجيل الدخول</span> لحفظ محادثاتك.
             </p>
           </div>
        )}

        {/* مربع الإدخال */}
        <div className="p-4 bg-[#0b101b] border-t border-slate-800">
           <div className="bg-slate-900 rounded-2xl p-2 flex items-center gap-2 shadow-inner border border-slate-800 focus-within:border-[#2dd4bf] transition">
             <Button variant="ghost" size="icon" className="text-slate-400"><Mic className="size-5" /></Button>
             <input 
               placeholder="اكتب رسالتك لـ Salman AI..." 
               className="flex-1 bg-transparent outline-none text-sm p-2 text-white placeholder:text-slate-600" 
             />
             <Button className="bg-[#2dd4bf] text-black hover:bg-[#2dd4bf]/90 size-9 rounded-xl p-0">
               <Send className="size-4" />
             </Button>
           </div>
        </div>
      </main>
    </div>
  );
}
