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
  AlertCircle,
  ChevronRight,
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
  const [settingsView, setSettingsView] = useState<'main' | 'privacy' | 'terms' | 'delete'>('main');

  const handleAuthAction = () => {
    if (isLoggedIn) setIsLoggedIn(false);
    else void navigate({ to: "/auth" });
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#0b101b] text-slate-100" dir="rtl">
      
      {/* الهيدر */}
      <header className="flex h-14 w-full items-center justify-between border-b border-slate-800/80 bg-[#0b101b] px-3 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="size-8 rounded-lg hover:bg-slate-800/60 p-0">
            <Menu className="size-5" />
          </Button>
          <div onClick={() => void navigate({ to: "/chat" })} className="flex items-center gap-2 cursor-pointer">
            <BrandMark size={30} />
            <span className="text-base font-black text-white">Salman AI</span>
          </div>
        </div>
        <Button onClick={() => setIsSettingsOpen(true)} variant="ghost" size="icon" className="size-8 rounded-lg text-slate-400 hover:text-white">
          <Settings className="size-5" />
        </Button>
      </header>

      {/* نافذة الإعدادات المتكاملة */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#0d1424] border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col">
            
            {/* الهيدر داخل النافذة */}
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#0d1424] pb-2">
              <h2 className="text-lg font-black text-white">
                {settingsView === 'main' ? 'الإعدادات' : 
                 settingsView === 'privacy' ? 'سياسة الخصوصية' :
                 settingsView === 'terms' ? 'شروط الاستخدام' : 'حذف الحساب'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => { setIsSettingsOpen(false); setSettingsView('main'); }} className="rounded-full">
                <X className="size-5" />
              </Button>
            </div>

            {/* محتوى الإعدادات بناءً على الحالة (View) */}
            {settingsView === 'main' ? (
              <>
                {/* قسم التحكم */}
                <div className="space-y-4 mb-8">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 mr-1">لغة الردود</label>
                    <select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white">
                      <option>تلقائي</option>
                      <option>العربية</option>
                      <option>English</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 mr-1">حجم الخط</label>
                    <select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white">
                      <option>متوسط</option>
                      <option>صغير</option>
                      <option>كبير</option>
                    </select>
                  </div>
                </div>

                {/* قسم المشاريع */}
                <div className="space-y-4 mb-8">
                  <div className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">🌐 مشاريع وخدمات سلمان</div>
                  {[
                    { title: "زاد الدعاة", desc: "منصة محتوى دعوي ومكتبة موارد", icon: BookOpen, color: "text-[#2dd4bf]" },
                    { title: "متجر كنز", desc: "متجر إلكتروني للمنتجات المختارة", icon: ShoppingBag, color: "text-[#facc15]" },
                    { title: "متجر سلمان فارس", desc: "متجر تقني للأجهزة والملحقات", icon: Smartphone, color: "text-[#f59e0b]" },
                  ].map((proj, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800 cursor-pointer hover:bg-slate-900 transition">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-xl"><proj.icon className={`size-5 ${proj.color}`} /></div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{proj.title}</h4>
                          <p className="text-[10px] text-slate-500">{proj.desc}</p>
                        </div>
                      </div>
                      <ExternalLink className="size-4 text-slate-600" />
                    </div>
                  ))}
                </div>

                {/* قسم حول التطبيق والتذييل */}
                <div className="mt-auto border-t border-slate-800 pt-6">
                  <h4 className="text-xs font-bold text-slate-400 mb-3">عن التطبيق</h4>
                  <p className="text-xs text-slate-500 mb-6">Salman AI الإصدار 1.0 . تطوير: سلمان فارس</p>
                  <div className="flex justify-between items-center text-xs px-2">
                    <button onClick={() => setSettingsView('privacy')} className="text-[#2dd4bf] hover:underline">سياسة الخصوصية</button>
                    <button onClick={() => setSettingsView('terms')} className="text-[#2dd4bf] hover:underline">شروط الاستخدام</button>
                    <button onClick={() => setSettingsView('delete')} className="text-rose-500 hover:underline">حذف الحساب</button>
                  </div>
                </div>
              </>
            ) : (
              /* صفحات داخلية (سياسة/شروط/حذف) */
              <div className="flex-1 space-y-6">
                <Button variant="ghost" size="sm" onClick={() => setSettingsView('main')} className="mb-4 text-slate-400 p-0 h-auto gap-1">
                  <ChevronRight className="size-4" /> العودة للإعدادات
                </Button>
                
                {settingsView === 'privacy' && (
                  <p className="text-sm text-slate-300 leading-relaxed text-justify">
                    ميثاق خصوصيتك: نحن في Salman AI نلتزم بحماية بياناتك بأعلى معايير التشفير. لا نطلع على محادثاتك الخاصة، ولا نستخدمها لأغراض إعلانية. بياناتك محفوظة في بيئة آمنة ومصممة خصيصاً لضمان سرية معلوماتك.
                  </p>
                )}
                {settingsView === 'terms' && (
                  <p className="text-sm text-slate-300 leading-relaxed text-justify">
                    شروط الاستخدام: باستخدامك لـ Salman AI، أنت توافق على الالتزام بالاستخدام الأخلاقي والمهني. يُمنع استغلال المنصة في أي نشاط غير قانوني. نحن نعمل دائماً لنقدم لك تجربة متميزة ونحتفظ بحق تعديل الخدمة لضمان جودتها.
                  </p>
                )}
                {settingsView === 'delete' && (
                  <div className="space-y-4">
                    <p className="text-sm text-rose-300">هذا الإجراء سيقوم بحذف كافة بياناتك وسجلك بشكل نهائي. هل أنت متأكد؟</p>
                    <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-12 rounded-xl">حذف الحساب نهائياً</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* المحتوى الرئيسي */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
