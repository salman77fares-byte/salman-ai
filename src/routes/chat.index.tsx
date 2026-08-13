import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  Send,
  Plus,
  Paperclip,
  X,
  Image as ImageIcon,
  Copy,
  Edit2,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
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
  "أحدث الأخبار الرياضية",
  "اشرح لي فكرة مشروع",
  "كتابة كود برمجي",
  "تلخيص نص مطول",
];

const SEARCH_STATUSES = [
  "جاري البحث في المصادر المحدثة...",
  "جاري تحليل البيانات...",
  "جاري صياغة الإجابة...",
];

const CHAT_STATUSES = [
  "Salman يكتب الآن...",
  "جاري التفكير في الرد...",
  "جاري تجهيز الإجابة...",
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
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: string;
    url: string;
    base64: string;
  } | null>(null);

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
    toast.success("تم بدء محادثة جديدة");
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
    toast.success("تم نسخ النص إلى الحافظة");
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

    try {
      const formattedHistory = chatHistory.map((m) => {
        let textContent = m.content;
        if (m.attachment) {
          textContent += `\n[مرفق ملف: ${m.attachment.name}]`;
        }
        return {
          role: m.role,
          content: textContent,
        };
      });

      const fullResponse = await askSalmanAI(formattedHistory);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: fullResponse },
      ]);
    } catch (error) {
      console.error("Execute Send Error:", error);
      toast.error("تعذّر جلب الرد حالياً.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "عذراً، حدث خطأ أثناء معالجة الطلب.",
        },
      ]);
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
        <BrandMark size={64} className="shadow-glow" />
        <h1 className="text-xl font-extrabold">
          مرحباً بك، أنا <span className="brand-gradient-text">Salman AI</span>
        </h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          جارٍ التجهيز...
        </p>
      </div>
    );
  }

  // نعتبر المستخدم زاراً إذا لم توجد جلسة نشطة
  const isVisitor = !session;

  return (
    <div className="flex h-full flex-col justify-between bg-background text-foreground" dir="rtl">
      {/* شريط الإجراء العلوي للبدء بمحادثة جديدة (زر واحد غير مكرر) */}
      <div className="flex items-center justify-start px-4 py-2 shrink-0">
        <Button
          onClick={handleNewChat}
          variant="outline"
          size="sm"
          className="rounded-2xl border border-slate-700/80 bg-slate-900/60 text-slate-200 hover:bg-slate-800 gap-2 text-xs font-bold px-4 py-2"
        >
          <Plus className="size-4 text-[#2dd4bf]" />
          محادثة جديدة
        </Button>
      </div>

      {/* منطقة المحادثة والرسائل */}
      <div className="flex-1 overflow-y-auto space-y-5 px-4 py-2">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center space-y-3">
            <BrandMark size={72} />
            <h2 className="text-2xl font-black">مرحباً بك مع Salman AI</h2>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              أسألني أي شيء، أرفق صوراً، واستفد من خيارات النقر المطول على الرسائل.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col w-full ${
                msg.role === "user" ? "items-start" : "items-end"
              }`}
            >
              <div className="flex items-start gap-2.5 max-w-[88%]">
                <div
                  onTouchStart={() => handleTouchStart(idx)}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={() => handleTouchStart(idx)}
                  onMouseUp={handleTouchEnd}
                  className={`relative w-fit px-4 py-3 text-sm leading-relaxed text-right whitespace-pre-wrap break-words cursor-pointer select-none ${
                    msg.role === "user"
                      ? "bg-[#2dd4bf] text-slate-950 font-medium rounded-2xl rounded-tr-none shadow-sm"
                      : "bg-slate-800/90 text-slate-100 rounded-2xl rounded-tl-none border border-slate-700/60 shadow-sm"
                  }`}
                >
                  {msg.attachment && (
                    <div className="mb-2 flex items-center gap-2 rounded-xl bg-black/10 p-2 text-xs">
                      {msg.attachment.type.startsWith("image/") ? (
                        <img
                          src={msg.attachment.url}
                          alt="attachment"
                          className="h-24 w-auto rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5 font-bold">
                          <Paperclip className="size-4" />
                          <span className="truncate max-w-[180px]">{msg.attachment.name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.role === "assistant" ? (
                    <div className="prose prose-invert prose-sm max-w-none space-y-3 leading-relaxed prose-p:my-1.5 prose-ul:my-2 prose-li:my-0.5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>

              {/* قائمة الخيارات عند الضغط المطول */}
              {activeActionIndex === idx && (
                <div className="flex items-center gap-1 mt-1.5 p-1 bg-slate-900 border border-slate-700 rounded-xl shadow-lg z-10">
                  <button
                    onClick={() => handleCopy(msg.content)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-200"
                  >
                    <Copy className="size-3.5" />
                    نسخ
                  </button>
                  {msg.role === "user" && (
                    <>
                      <button
                        onClick={() => handleEdit(msg.content)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-200"
                      >
                        <Edit2 className="size-3.5" />
                        تعديل
                      </button>
                      <button
                        onClick={() => handleRetry(idx)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-200"
                      >
                        <RotateCcw className="size-3.5" />
                        إعادة المحاولة
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setActiveActionIndex(null)}
                    className="text-slate-500 hover:text-slate-300 px-1"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {/* مؤشر الانتظار */}
        {isSending && (
          <div className="flex w-full justify-end items-center gap-2.5">
            <div className="w-fit max-w-[85%] px-4 py-3 text-sm bg-slate-800/90 text-[#2dd4bf] rounded-2xl rounded-tl-none border border-slate-700/60 animate-pulse text-right font-medium">
              {activeStatuses[statusIndex]}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* الشريط السفلي للإدخال والاقتراحات وتنبيه الزائر فوقها تماماً */}
      <div className="p-2 border-t border-border bg-background/95 space-y-2 shrink-0">
        
        {/* إشعار الزائر: تم نقله ليصبح هنا فوق الاقتراحات ومربع الإرسال تماماً */}
        {isVisitor && (
          <div className="w-full py-1.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-[11px] text-amber-300/90 shadow-sm">
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

        {/* اقتراحات الذكاء الاصطناعي */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_SUGGESTIONS.map((item, i) => (
            <button
              key={i}
              onClick={() => setInput(item)}
              className="shrink-0 rounded-full border border-border bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            >
              {item}
            </button>
          ))}
        </div>

        {selectedFile && (
          <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              {selectedFile.type.startsWith("image/") ? (
                <ImageIcon className="size-4 text-primary shrink-0" />
              ) : (
                <Paperclip className="size-4 text-primary shrink-0" />
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
          <div className="relative flex-1 flex items-center rounded-2xl border border-border bg-background focus-within:ring-2 focus-within:ring-[#2dd4bf]">
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
              className="absolute right-2 text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-secondary transition"
              title="إرفاق صورة أو ملف"
            >
              <Plus className="size-5" />
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب رسالتك لـ Salman AI..."
              rows={1}
              className="w-full resize-none bg-transparent py-3 pr-11 pl-4 text-sm text-right focus:outline-none max-h-32 min-h-[44px]"
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
      </div>
    </div>
  );
}
