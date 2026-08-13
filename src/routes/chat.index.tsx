import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Send, Plus, Paperclip, X, Image as ImageIcon, Copy, Edit2, RotateCcw, PlusCircle, LogIn, Sparkles } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { BrandMark } from "@/components/salman/BrandMark";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { askSalmanAI } from "@/lib/aiService";

export const Route = createFileRoute("/chat/")({
  component: ChatIndexScreen,
});

interface Message {
  role: "user" | "assistant";
  content: string;
  attachment?: { name: string; type: string; url: string; base64?: string };
}

const QUICK_SUGGESTIONS = [
  "أحدث الأخبار الرياضية ⚽",
  "اشرح لي فكرة مشروع 💡",
  "كتابة كود برمجي 💻",
  "تلخيص نص مطول 📝",
];

const SEARCH_STATUSES = [
  "جاري البحث في المصادر المحدثة... 🔍",
  "جاري تحليل البيانات... 📊",
  "جاري صياغة الإجابة... ✍️"
];

const CHAT_STATUSES = [
  "Salman يكتب الآن... 💬",
  "جاري التفكير في الرد... 🧠",
  "جاري تجهيز الإجابة... ✨"
];

function ChatIndexScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, loading } = useSession();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [activeStatuses, setActiveStatuses] = useState<string[]>(CHAT_STATUSES);
  const [activeActionIndex, setActiveActionIndex] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; url: string; base64: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  useEffect(() => {
    if (!isSending) {
      setStatusIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % activeStatuses.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [isSending, activeStatuses]);

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setSelectedFile(null);
    setActiveActionIndex(null);
    toast.success("تم بدء محادثة جديدة ✨");
  };

  const handleTouchStart = (index: number) => {
    pressTimerRef.current = setTimeout(() => {
      setActiveActionIndex(index);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم نسخ النص إلى الحافظة 📋");
    setActiveActionIndex(null);
  };

  const handleEdit = (text: string) => {
    setInput(text);
    setActiveActionIndex(null);
  };

  const handleRetry = (index: number) => {
    setActiveActionIndex(null);
    const historyToRetry = messages.slice(0, index + 1);
    const lastUserMessage = historyToRetry[historyToRetry.length - 1];
    if (lastUserMessage && lastUserMessage.role === "user") {
      executeSend(historyToRetry, lastUserMessage.content);
    }
  };

  const executeSend = async (chatHistory: Message[], userQuery: string) => {
    const isSearchQuery = /بحث|أخبار|أحدث|ابحث|معلومات|مصادر/i.test(userQuery);
    setActiveStatuses(isSearchQuery ? SEARCH_STATUSES : CHAT_STATUSES);

    setIsSending(true);
    setMessages([...chatHistory, { role: "assistant", content: "" }]);

    try {
      const formattedHistory = chatHistory.map((m) => {
        if (m.attachment?.base64 && m.attachment.type.startsWith("image/")) {
          return {
            role: m.role,
            content: [
              { type: "text", text: m.content || "حلل هذه الصورة واستخرج النص منها أو أجب بناءً عليها." },
              { type: "image_url", image_url: { url: m.attachment.base64 } }
            ]
          };
        }
        return { role: m.role, content: m.content };
      });

      const fullResponse = await askSalmanAI(formattedHistory);

      let currentText = "";
      const words = fullResponse.split(" ");
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i === 0 ? "" : " ") + words[i];
        const textToUpdate = currentText;
        setMessages((prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { role: "assistant", content: textToUpdate };
          return newMsgs;
        });
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
    } catch (error) {
      console.error(error);
      toast.error("تعذّر جلب الرد حالياً.");
      setMessages((prev) => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = { role: "assistant", content: "عذراً، حدث خطأ أثناء معالجة الطلب. ⚠️" };
        return newMsgs;
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !selectedFile) || isSending) return;

    const currentAttachment = selectedFile;
    const userText = input.trim();
    const userMessage: Message = {
      role: "user",
      content: userText,
      attachment: currentAttachment ? { ...currentAttachment } : undefined,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setSelectedFile(null);

    await executeSend(updatedMessages, userText);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error("حجم الملف يجب ألا يتجاوز 8 ميجابايت");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file),
        base64: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <BrandMark size={72} className="shadow-glow animate-pulse" />
        <h1 className="text-2xl font-extrabold">
          مرحباً بك، أنا <span className="brand-gradient-text">Salman AI</span> ✨
        </h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-[#2dd4bf]" />
          جارٍ التجهيز...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between bg-background text-foreground" dir="rtl">
      
      {/* 1. الهيدر الأصلي الأكبر مع زر محادثة جديدة في الزاوية بدون صف إضافي */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-border/60 bg-background/90 backdrop-blur-md min-h-[76px] shadow-sm z-10">
        <div className="flex items-center gap-3">
          <BrandMark size={40} />
          <span className="font-bold text-2xl tracking-tight text-white">Salman AI</span>
        </div>

        <div className="flex items-center gap-2">
          {/* زر محادثة جديدة في زاوية الهيدر */}
          <Button
            onClick={handleNewChat}
            variant="outline"
            size="sm"
            className="rounded-xl flex items-center gap-1.5 text-xs font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3.5 py-2"
          >
            <PlusCircle className="size-4" />
            <span>محادثة جديدة</span>
          </Button>

          {/* زر تسجيل الدخول المتناسق */}
          <Button
            variant="secondary"
            size="sm"
            className="rounded-xl text-xs h-9 px-3 font-medium flex items-center gap-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
          >
            <LogIn className="size-3.5" />
            <span>تسجيل الدخول</span>
          </Button>
        </div>
      </header>

      {/* 2. منطقة المحادثة والرسائل */}
      <div className="flex-1 overflow-y-auto space-y-6 px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center space-y-4 my-auto">
            <BrandMark size={80} className="shadow-lg shadow-emerald-500/10" />
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">مرحباً بك مع Salman AI ✨</h2>
              <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
                مساعدك الذكي لإنجاز مشاريعك، كتابة الأكواد، وتحليل الأفكار بكفاءة 🚀
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col w-full ${
                msg.role === "user" ? "items-start" : "items-end"
              }`}
            >
              <div
                onTouchStart={() => handleTouchStart(idx)}
                onTouchEnd={handleTouchEnd}
                onMouseDown={() => handleTouchStart(idx)}
                onMouseUp={handleTouchEnd}
                className={`relative px-5 py-4 text-sm leading-relaxed text-right whitespace-pre-wrap break-words cursor-pointer select-none transition-all ${
                  msg.role === "user"
                    ? "w-fit max-w-[85%] bg-[#2dd4bf] text-slate-950 font-medium rounded-2xl rounded-tl-none shadow-md self-start"
                    : "w-full max-w-[92%] bg-[#131f33] text-slate-100 rounded-2xl rounded-tr-none border border-slate-800 shadow-md self-end"
                }`}
              >
                {/* مرفقات الصور إن وجدت */}
                {msg.attachment && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl bg-black/20 p-2 text-xs">
                    {msg.attachment.type.startsWith("image/") ? (
                      <img
                        src={msg.attachment.url}
                        alt="attachment"
                        className="h-32 w-auto rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex items-center gap-2 font-bold">
                        <Paperclip className="size-4 text-emerald-400" />
                        <span className="truncate max-w-[200px]">{msg.attachment.name}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* نص الرسالة */}
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none space-y-3 leading-relaxed prose-p:my-1.5 prose-ul:my-2 prose-li:my-0.5 text-slate-100">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>

              {/* قائمة الإجراءات عند النقر المطول */}
              {activeActionIndex === idx && (
                <div className="flex items-center gap-1 mt-2 p-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-10 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => handleCopy(msg.content)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200"
                  >
                    <Copy className="size-3.5" />
                    نسخ
                  </button>
                  {msg.role === "user" && (
                    <>
                      <button
                        onClick={() => handleEdit(msg.content)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200"
                      >
                        <Edit2 className="size-3.5" />
                        تعديل
                      </button>
                      <button
                        onClick={() => handleRetry(idx)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200"
                      >
                        <RotateCcw className="size-3.5" />
                        إعادة المحاولة
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setActiveActionIndex(null)}
                    className="text-slate-500 hover:text-slate-300 px-1.5"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {/* مؤشر جاري الصياغة بدون صورة فوق الرد */}
        {isSending && messages[messages.length - 1]?.content === "" && (
          <div className="flex w-full justify-end">
            <div className="w-fit max-w-[90%] px-5 py-3.5 text-sm bg-[#131f33] text-[#2dd4bf] rounded-2xl rounded-tr-none border border-slate-800 animate-pulse text-right font-medium shadow-md">
              {activeStatuses[statusIndex]}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. الشريط السفلي للإدخال */}
      <footer className="p-3 border-t border-border bg-background/95 space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_SUGGESTIONS.map((item, i) => (
            <button
              key={i}
              onClick={() => setInput(item)}
              className="shrink-0 rounded-full border border-slate-800 bg-slate-900/80 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              {item}
            </button>
          ))}
        </div>

        {selectedFile && (
          <div className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              {selectedFile.type.startsWith("image/") ? (
                <ImageIcon className="size-4 text-[#2dd4bf] shrink-0" />
              ) : (
                <Paperclip className="size-4 text-[#2dd4bf] shrink-0" />
              )}
              <span className="truncate max-w-[200px] font-bold">{selectedFile.name}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 rounded-full"
              onClick={() => setSelectedFile(null)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center rounded-2xl border border-slate-700 bg-slate-900/90 focus-within:ring-2 focus-within:ring-[#2dd4bf]">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-2 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              title="إرفاق صورة أو ملف"
            >
              <Plus className="size-5" />
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب رسالتك لـ Salman AI..."
              rows={1}
              className="w-full resize-none bg-transparent py-3 pr-11 pl-4 text-sm text-right text-white focus:outline-none max-h-32 min-h-[44px]"
            />
          </div>

          <Button
            type="button"
            onClick={() => handleSend()}
            disabled={isSending || (!input.trim() && !selectedFile)}
            size="icon"
            className="rounded-2xl shrink-0 bg-[#2dd4bf] hover:bg-[#26b8a5] text-slate-950 h-11 w-11"
          >
            <Send className="size-4 -rotate-90" />
          </Button>
        </div>
      </footer>
    </div>
  );
}

export default ChatIndexScreen;
