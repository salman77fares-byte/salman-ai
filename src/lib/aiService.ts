import React, { useState, useRef, useEffect } from "react";
import { 
  Plus, 
  Send, 
  Sparkles, 
  User, 
  LogIn, 
  Menu, 
  Copy, 
  Check, 
  Edit3, 
  Paperclip,
  X
} from "lucide-react";
import { askSalmanAI } from "../../lib/aiService";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachment?: {
    name: string;
    type: string;
    url: string;
  };
}

const SUGGESTIONS = [
  "أحدث الأخبار الرياضية",
  "اشرح لي فكرة مشروع",
  "كتابة كود برمجي",
  "تصميم واجهة مستخدم"
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; type: string; url: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setAttachment(null);
    toast.success("تم بدء محادثة جديدة");
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query && !attachment) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      attachment: attachment || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachment(null);
    setIsSending(true);

    try {
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const responseText = await askSalmanAI(apiMessages);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseText,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      toast.error("حدث خطأ أثناء التواصل مع الخادم");
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("تم نسخ النص");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setAttachment({
      name: file.name,
      type: file.type,
      url: url,
    });
    toast.success("تم إرفاق الملف");
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b1320] text-white dir-rtl font-sans antialiased overflow-hidden">
      
      {/* 1. الهيدر الرئيسي المطور والأكبر مع زر محادثة جديدة في الزاوية */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800/80 shadow-md z-20 min-h-[72px]">
        {/* جهة اليمين: الشعار واسم التطبيق وزر محادثة جديدة جانييه */}
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition md:hidden">
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-inner">
              <img src="/logo.svg" alt="Salman AI" className="w-6 h-6 object-contain" onError={(e) => {
                // Fallback icon in case logo path isn't loaded
                e.currentTarget.style.display = 'none';
              }} />
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="font-bold text-xl tracking-wide bg-gradient-to-l from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
              Salman AI
            </span>
          </div>

          {/* زر محادثة جديدة بجانب الهيدر مباشرة */}
          <button
            onClick={handleNewChat}
            className="mr-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-full transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>محادثة جديدة</span>
          </button>
        </div>

        {/* جهة اليسار: زر تسجيل الدخول */}
        <div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 rounded-xl transition shadow-sm">
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول</span>
          </button>
        </div>
      </header>

      {/* 2. منطقة المحادثة والرسائل */}
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-4xl w-full mx-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 my-auto">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5">
              <Sparkles className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">أهلاً بك في Salman AI</h2>
              <p className="text-slate-400 text-sm max-w-md">كيف يمكنني مساعدتك اليوم في مشاريعك أو أفكارك؟</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 items-start ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* رمز المستلم/المستخدم بجانب الفقاعة فقط */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
                  isUser ? "bg-emerald-500 text-slate-950 font-bold" : "bg-slate-800 border border-slate-700 text-emerald-400"
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>

                {/* فقاعة الرسالة - مع تعديل اتجاه الزاوية الحادة تناسباً مع RTL */}
                <div className="group relative max-w-[82%]">
                  <div
                    className={`px-4 py-3 text-sm leading-relaxed shadow-sm transition-all ${
                      isUser
                        ? "bg-emerald-500 text-slate-950 font-medium rounded-2xl rounded-tr-none" // الزاوية الحادة للمستخدم في الأعلى اليمين
                        : "bg-[#162235] text-slate-100 border border-slate-800/80 rounded-2xl rounded-tl-none" // الزاوية الحادة للمساعد في الأعلى اليسار
                    }`}
                  >
                    {/* المرفقات إذا وجدت */}
                    {msg.attachment && (
                      <div className="mb-2 p-2 bg-black/20 rounded-lg text-xs flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[200px]">{msg.attachment.name}</span>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>

                  {/* أدوات التحكم بالرسالة (نسخ) عند التمرير */}
                  <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isUser ? "-right-10" : "-left-10"
                  }`}>
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 rounded-md border border-slate-700/50"
                      title="نسخ النص"
                    >
                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* حالة الانتظار وجاري الصياغة (بدون أي صورة علوية مكررة) */}
        {isSending && (
          <div className="flex gap-3 items-start flex-row">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center shrink-0 mt-1">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="px-4 py-3 bg-[#162235] text-emerald-400 border border-emerald-500/20 rounded-2xl rounded-tl-none text-sm flex items-center gap-2 animate-pulse">
              <span>جاري صياغة الإجابة...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* 3. صندوق الإدخال واقتراحات الأسئلة في الأسفل */}
      <footer className="p-4 bg-[#0f172a]/90 border-t border-slate-800/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto space-y-3">
          
          {/* اقتراحات الأسئلة السريعة */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(item)}
                className="px-3.5 py-1.5 text-xs text-slate-300 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 rounded-xl whitespace-nowrap transition"
              >
                {item}
              </button>
            ))}
          </div>

          {/* معاينة المرفق إن وجد */}
          {attachment && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-emerald-400">
              <div className="flex items-center gap-2 truncate">
                <Paperclip className="w-3.5 h-3.5" />
                <span className="truncate">{attachment.name}</span>
              </div>
              <button onClick={() => setAttachment(null)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* حقل إدخال الرسالة */}
          <div className="relative flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="اكتب رسالتك لـ Salman AI..."
                className="w-full bg-[#162235] text-white placeholder-slate-400 text-sm rounded-2xl pl-10 pr-12 py-3.5 border border-slate-700/60 focus:outline-none focus:border-emerald-500/50 transition"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 p-1.5 transition"
                title="إرفاق ملف"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => handleSend()}
              disabled={isSending || (!input.trim() && !attachment)}
              className="w-11 h-11 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-slate-950 rounded-2xl flex items-center justify-center transition shrink-0 shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-5 h-5 rotate-180" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
