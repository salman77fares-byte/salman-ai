import { createFileRoute } from '@tanstack/react-router';
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
  Paperclip,
  X
} from "lucide-react";
import { askSalmanAI } from "../../lib/aiService";
import { toast } from "sonner";

// تعريف مسار TanStack Router
export const Route = createFileRoute('/chat/')({
  component: ChatPage,
});

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachment?: { name: string; type: string; url: string };
}

const SUGGESTIONS = [
  "أحدث الأخبار الرياضية ⚽",
  "اشرح لي فكرة مشروع 💡",
  "كتابة كود برمجي 💻",
  "تصميم واجهة مستخدم 🎨"
];

function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ name: string; type: string; url: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages, isSending]);

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setAttachment(null);
    toast.success("تم بدء محادثة جديدة ✨");
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
      const apiMessages = [...messages, userMessage].map((m) => ({ role: m.role, content: m.content }));
      const responseText = await askSalmanAI(apiMessages);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: responseText }]);
    } catch (error) {
      toast.error("حدث خطأ أثناء التواصل مع الخادم");
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("تم النسخ 📋");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b1320] text-white dir-rtl font-sans antialiased overflow-hidden">
      
      {/* الهيدر */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800/80 shadow-md z-20 min-h-[72px]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="font-bold text-xl text-white">Salman AI</span>
          <button onClick={handleNewChat} className="mr-3 px-3.5 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full transition hover:bg-emerald-500/20">
            <Plus className="w-3.5 h-3.5 inline ml-1" />
            <span>محادثة جديدة</span>
          </button>
        </div>
      </header>

      {/* منطقة المحادثة */}
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-4xl w-full mx-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white">أهلاً بك في Salman AI</h2>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 items-start ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${msg.role === "user" ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-emerald-400"}`}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>
              <div className="group relative max-w-[85%]">
                <div className={`px-5 py-4 text-sm leading-relaxed ${msg.role === "user" ? "bg-emerald-500 text-slate-950 rounded-2xl rounded-tl-none" : "bg-[#131f33] text-slate-100 rounded-2xl rounded-tr-none border border-slate-800"}`}>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
        {isSending && <div className="text-emerald-400 text-sm animate-pulse">جاري الصياغة...</div>}
        <div ref={messagesEndRef} />
      </main>

      {/* الفوتر */}
      <footer className="p-4 bg-[#0f172a]/90 border-t border-slate-800/80">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="اكتب رسالتك لـ Salman AI..."
            className="flex-1 bg-[#162235] text-white rounded-2xl p-3.5 border border-slate-700 focus:outline-none focus:border-emerald-500"
          />
          <button onClick={() => handleSend()} className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center">
            <Send className="w-5 h-5 text-slate-950 rotate-180" />
          </button>
        </div>
      </footer>
    </div>
  );
}
