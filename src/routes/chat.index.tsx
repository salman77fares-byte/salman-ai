import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Send, Plus, Paperclip, X, Image as ImageIcon, Copy, Edit2, RotateCcw, PlusCircle } from "lucide-react";
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
  "جاري معالجة واستخراج البيانات...",
  "جاري صياغة وكتابة الإجابة..."
];

function ChatIndexScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, loading } = useSession();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
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

  // تغيير نص الانتظار بشكل ديناميكي أثناء معالجة الطلب
  useEffect(() => {
    if (!isSending) {
      setStatusIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % SEARCH_STATUSES.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [isSending]);

  // بدء محادثة جديدة
  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setSelectedFile(null);
    setActiveActionIndex(null);
    toast.success("تم بدء محادثة جديدة");
  };

  // معالجة النقر المتواصل (Long Press)
  const handleTouchStart = (index: number) => {
    pressTimerRef.current = setTimeout(() => {
      setActiveActionIndex(index);
    }, 600); // 600 مللي ثانية للتفعيل
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }
  };

  // نسخ النص
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم نسخ النص إلى الحافظة");
    setActiveActionIndex(null);
  };

  // تعديل الرسالة
  const handleEdit = (text: string, index: number) => {
    setInput(text);
    setActiveActionIndex(null);
  };

  // إعادة المحاولة
  const handleRetry = (index: number) => {
    setActiveActionIndex(null);
    const historyToRetry = messages.slice(0, index + 1);
    const lastUserMessage = historyToRetry[historyToRetry.length - 1];
    if (lastUserMessage && lastUserMessage.role === "user") {
      executeSend(historyToRetry);
    }
  };

  const executeSend = async (chatHistory: Message[]) => {
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
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    } catch (error) {
      console.error(error);
      toast.error("تعذّر جلب الرد حالياً.");
      setMessages((prev) => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = { role: "assistant", content: "عذراً، حدث خطأ أثناء معالجة الطلب." };
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
    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      attachment: currentAttachment ? { ...currentAttachment } : undefined,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setSelectedFile(null);

    await executeSend(updatedMessages);
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

  return (
    <div className="flex h-full flex-col justify-between bg-background text-foreground" dir="rtl">
      {/* شريط أعلى المحادثة يضم زر محادثة جديدة */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <BrandMark size={28} />
          <span className="font-bold text-sm">Salman AI</span>
        </div>
        <Button
          onClick={handleNewChat}
          variant="outline"
          size="sm"
          className="rounded-xl flex items-center gap-1.5 text-xs border-border"
        >
          <PlusCircle className="size-4 text-[#2dd4bf]" />
          محادثة جديدة
        </Button>
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-y-auto space-y-4 px-3 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center space-y-3 mt-8">
            <BrandMark size={56} />
            <h2 className="text-lg font-bold">مرحباً بك مع Salman AI</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              أسألني أي شيء، أرفق صوراً، واستفد من خيارات النقر المطول على الرسائل.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col w-full ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                onTouchStart={() => handleTouchStart(idx)}
                onTouchEnd={handleTouchEnd}
                onMouseDown={() => handleTouchStart(idx)}
                onMouseUp={handleTouchEnd}
                className={`relative w-fit max-w-[88%] px-4 py-3 text-sm leading-relaxed text-right whitespace-pre-wrap break-words cursor-pointer select-none ${
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
                  <div className="prose prose-invert prose-sm max-w-none space-y-2 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>

              {/* قائمة الإجراءات عند النقر المتواصل */}
              {activeActionIndex === idx && (
                <div className="flex items-center gap-1 mt-1.5 p-1 bg-slate-900 border border-slate-700 rounded-xl shadow-lg z-10 animate-in fade-in zoom-in-95">
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
                        onClick={() => handleEdit(msg.content, idx)}
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

        {/* النص المتغير ديناميكياً أثناء المعالجة */}
        {isSending && messages[messages.length - 1]?.content === "" && (
          <div className="flex w-full justify-start">
            <div className="w-fit max-w-[85%] px-4 py-3 text-sm bg-slate-800/90 text-[#2dd4bf] rounded-2xl rounded-tl-none border border-slate-700/60 animate-pulse text-right font-medium">
              {SEARCH_STATUSES[statusIndex]}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* الشريط السفلي للإدخال */}
      <div className="p-2 border-t border-border bg-background/95 space-y-2">
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
          {/* حقل النص وزر المرفقات */}
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

          {/* زر الإرسال الموجه للأعلى */}
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
