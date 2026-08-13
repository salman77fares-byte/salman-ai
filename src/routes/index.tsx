import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Send, Plus, Paperclip, X, Image as ImageIcon, Copy, Edit2, RotateCcw, PlusCircle, LogIn } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { BrandMark } from "@/components/salman/BrandMark";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { askSalmanAI } from "@/lib/aiService";

export const Route = createFileRoute("/")({
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
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center bg-background">
        <BrandMark size={56} className="shadow-glow animate-pulse" />
        <h1 className="text-xl font-extrabold">
          مرحباً بك، أنا <span className="brand-gradient-text">Salman AI</span> ✨
        </h1>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin text-[#2dd4bf]" />
          جارٍ التجهيز...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col justify-between bg-background text-foreground relative overflow-hidden" dir="rtl">
      
      {/* 1. هيدر نحيف ومضغوط بالكامل (Compact Header) */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-background/90 backdrop-blur-md h-[56px] z-10 shrink-0">
        <div className="flex items-center gap-2">
          <BrandMark size={32} />
          <span className="font-extrabold text-lg tracking-wide text-white">Salman AI</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="rounded-lg text-[11px] h-8 px-3 font-medium flex items-center gap-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
        >
          <LogIn className="size-3.5" />
          <span>تسجيل الدخول</span>
        </Button>
      </header>

      {/* 2. زر "محادثة جديدة" مضغوط وأنيق يتمركز يسار الشاشة تحت الهيدر مباشرة */}
      <div className="absolute top-[64px] left-3 z-20">
        <Button
          onClick={handleNewChat}
          size="sm"
          className="rounded-xl flex items-center gap-1.5 text-[11px] h-7 font-bold border border-emerald-500/30 bg-emerald-950/80 text-emerald-400 hover:bg-emerald-900 shadow-sm backdrop-blur-md px-2.5"
        >
          <PlusCircle className="size-3.5" />
          <span>محادثة جديدة</span>
        </Button>
      </div>

      {/* 3. منطقة الشات متناسقة المسافات */}
      <div className="flex-1 overflow-y-auto space-y-5 px-3 pt-9 pb-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center space-y-3 my-auto">
            <BrandMark size={68} className="shadow-lg shadow-emerald-500/10" />
            <div>
              <h2 className="text-xl font-bold text-white mb-1">مرحباً بك مع Salman AI ✨</h2>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
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
                className={`relative px-4 py-3 text-xs sm:text-sm leading-relaxed text-right whitespace-pre-wrap break-words cursor-pointer select-none transition-all ${
                  msg.role === "user"
                    ? "w-fit max-w-[85%] bg-[#2dd4bf] text-slate-950 font-semibold rounded-2xl rounded-tl-none shadow-sm self-start"
                    : "w-full max-w-[94%] bg-[#131f33] text-slate-100 rounded-2xl rounded-tr-none border border-slate-800 shadow-sm self-end"
                }`}
              >
                {msg.attachment && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg bg-black/20 p-1.5 text-[11px]">
                    {msg.attachment.type.startsWith("image/") ? (
                      <img
                        src={msg.attachment.url}
                        alt="attachment"
                        className="h-28 w-auto rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 font-bold">
                        <Paperclip className="size-3.5 text-emerald-400" />
                        <span className="truncate max-w-[180px]">{msg.attachment.name}</span>
                      </div>
                    )}
                  </div>
                )}

                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-xs max-w-none space-y-2 leading-relaxed text-slate-100">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>

              {activeActionIndex === idx && (
                <div className="flex items-center gap-1 mt-1.5 p-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg z-10 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => handleCopy(msg.content)}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md hover:bg-slate-800 text-slate-200"
                  >
                    <Copy className="size-3" />
                    نسخ
                  </button>
                  {msg.role === "user" && (
                    <>
                      <button
                        onClick={() => handleEdit(msg.content)}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md hover:bg-slate-800 text-slate-200"
                      >
                        <Edit2 className="size-3" />
                        تعديل
                      </button>
                      <button
                        onClick={() => handleRetry(idx)}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md hover:bg-slate-800 text-slate-200"
                      >
                        <RotateCcw className="size-3" />
                        إعادة المحاولة
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setActiveActionIndex(null)}
                    className="text-slate-500 hover:text-slate-300 px-1"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {isSending && messages[messages.length - 1]?.content === "" && (
          <div className="flex w-full justify-end">
            <div className="w-fit max-w-[90%] px-4 py-2.5 text-xs bg-[#131f33] text-[#2dd4bf] rounded-xl rounded-tr-none border border-slate-800 animate-pulse text-right font-medium shadow-sm">
              {activeStatuses[statusIndex]}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. حقل الإدخال السفلي المريح */}
      <footer className="p-2.5 border-t border-border bg-background/95 space-y-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {QUICK_SUGGESTIONS.map((item, i) => (
            <button
              key={i}
              onClick={() => setInput(item)}
              className="shrink-0 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              {item}
            </button>
          ))}
        </div>

        {selectedFile && (
          <div className="flex items-center justify-between rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs">
            <div className="flex items-center gap-2 truncate">
              {selectedFile.type.startsWith("image/") ? (
                <ImageIcon className="size-3.5 text-[#2dd4bf] shrink-0" />
              ) : (
                <Paperclip className="size-3.5 text-[#2dd4bf] shrink-0" />
              )}
              <span className="truncate max-w-[180px] font-bold text-[11px]">{selectedFile.name}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-5 rounded-full"
              onClick={() => setSelectedFile(null)}
            >
              <X className="size-3" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center rounded-xl border border-slate-700 bg-slate-900/90 focus-within:ring-1 focus-within:ring-[#2dd4bf]">
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
              className="absolute right-1.5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              title="إرفاق صورة أو ملف"
            >
              <Plus className="size-4" />
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب رسالتك لـ Salman AI..."
              rows={1}
              className="w-full resize-none bg-transparent py-2.5 pr-9 pl-3 text-xs text-right text-white focus:outline-none max-h-28 min-h-[38px]"
            />
          </div>

          <Button
            type="button"
            onClick={() => handleSend()}
            disabled={isSending || (!input.trim() && !selectedFile)}
            size="icon"
            className="rounded-xl shrink-0 bg-[#2dd4bf] hover:bg-[#26b8a5] text-slate-950 h-9 w-9"
          >
            <Send className="size-3.5 -rotate-90" />
          </Button>
        </div>
      </footer>
    </div>
  );
}

export default ChatIndexScreen;
