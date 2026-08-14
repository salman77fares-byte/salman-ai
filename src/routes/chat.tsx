import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Menu,
  Settings,
  X,
  User,
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
  ExternalLink
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

  // قائمة المشاريع
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

            {/* زر تسجيل الدخول */}
            <Button 
              onClick={() => setIsLoggedIn(!isLoggedIn)} 
              className={`w-full justify-start gap-3 mb-8 h-12 rounded-xl transition ${isLoggedIn ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" : "bg-[#2dd4bf]/10 text-[#2dd4bf] hover:bg-[#2dd4bf]/20"}`}
            >
              {isLoggedIn ? <LogOut className="size-5" /> : <LogIn className="size-5" />}
              {isLoggedIn ? "تسجيل الخروج" : "تسجيل الدخول"}
            </Button>

            {/* الروابط القانونية في القائمة الجانبية */}
            <div className="space-y-2 mt-auto border-t border-slate-800 pt-6">
              <button className="flex items-center gap-3 w-full p-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition"><Shield className="size-5" /> سياسة الخصوصية</button>
              <button className="flex items-center gap-3 w-full p-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition"><FileText className="size-5" /> شروط الاستخدام</button>
              <button className="flex items-center gap-3 w-full p-3 text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition"><Trash2 className="size-5" /> حذف الحساب</button>
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
              {/* قسم التحكم */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                   <div className="flex items-center gap-2"><Moon className="size-4 text-slate-400" /> <span className="text-sm">الوضع الليلي</span></div>
                   <div className="w-10 h-6 bg-teal-500 rounded-full relative cursor-pointer"><div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                   <div className="flex items-center gap-2"><Languages className="size-4 text-slate-400" /> <span className="text-sm">اللغة</span></div>
                   <span className="text-xs text-slate-500">العربية</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                   <div className="flex items-center gap-2"><Type className="size-4 text-slate-400" /> <span className="text-sm">حجم الخط</span></div>
                   <span className="text-xs text-slate-500">متوسط</span>
                </div>
              </div>

              {/* قسم المشاريع */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-400 px-1">🌐 مشاريع سلمان</h3>
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
           <div className="px-4 py-3 bg-[#2dd4bf]/5 border-t border-[#2dd4bf]/20 text-center mx-2 rounded-t-xl">
             <p className="text-xs text-[#2dd4bf] flex items-center justify-center gap-2 font-bold">
               <AlertTriangle className="size-4" />
               أنت تستخدم التطبيق كزائر، سجل الدخول لحفظ محادثاتك.
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
