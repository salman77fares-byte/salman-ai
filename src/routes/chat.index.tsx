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
  "جاري صياغة الإجابة..."
];

const CHAT_STATUSES = [
  "Salman يكتب الآن...",
  "جاري التفكير في الرد...",
  "جاري تجهيز الإجابة..."
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
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center bg-[#0b101b] text-slate-100">
        <BrandMark size={64} className="shadow-glow" />
        <h1 className="text-xl font-extrabold">
          مرحباً بك، أنا <span className="brand-gradient-text">Salman AI</span>
        </h1>
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" />
          جارٍ التجهيز...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between bg-[#0b101b] text-slate-100" dir="rtl">
      
      {/* الهيدر العلوي */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-[#0b101b] min-h-[64px] shrink-0">
        <Button
          onClick={handleNewChat}
          variant="outline"
          size="sm"
          className="rounded-xl flex items-center gap-1.5 text-xs border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200 px-3 py-1.5"
        >
          <PlusCircle className="size-4 text-[#2dd4bf]" />
          محادثة جديدة
        </Button>

        <Button
          onClick={() => void navigate({ to: "/auth" })}
          variant="secondary"
          size="sm"
          className="rounded-lg text-[11px] h-8 px-2.5 font-medium flex items-center gap-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
        >
          <LogIn className="size-3" />
          تسجيل الدخول
        </Button>
      </div>

      {/* منطقة المحتوى والرسائل */}
      <div className="flex-1 overflow-y-auto space-y-5 px-4 py-4 flex flex-col justify-between">
        
        {/* الشعار والنصوص الثابتة في منتصف الشاشة */}
        <div className="flex flex-col items-center justify-center text-center space-y-3 my-auto py-6">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <BrandMark size={64} />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">مرحباً بك مع Salman AI</h2>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            أسألني أي شيء، أرفق صوراً، واستفد من خيارات النقر المطوّل على الرسائل.
          </p>
        </div>

        {/* قائمة الرسائل في حال وجود محادثات */}
        {messages.length > 0 && (
          <div className="space-y-4 w-full">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col w-full ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-start gap-2.5 max-w-[88%]">
                  {msg.role === "assistant" && (
                    <div className="shrink-0 mt-1">
                      <BrandMark size={32} />
                    </div>
                  )}

                  <div
                    onTouchStart={() => handleTouchStart(idx)}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={() => handleTouchStart(idx)}
                    onMouseUp={handleTouchEnd}
                    className={`relative w-fit px-4 py-3 text-sm leading-relaxed text-right whitespace-pre-wrap break-words cursor-pointer select-none ${
                      msg.role === "user"
                        ? "bg-[#2dd4bf] text-slate-950 font-medium rounded-2xl rounded-br-none shadow-sm"
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
                      <div className="prose prose-invert prose-sm max-w-none space-y-3 leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>

                {activeActionIndex === idx && (
                  <div className="flex items-center gap-1 mt-1.5 p-1 bg-slate-900 border border-slate-700 rounded-xl shadow-lg z-10 animate-in fade-in">
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
            ))}
          </div>
        )}

        {/* حالة الانتظار */}
        {isSending && messages[messages.length - 1]?.content === "" && (
          <div className="flex w-full justify-start items-center gap-2.5">
            <div className="shrink-0">
              <BrandMark size={32} />
            </div>
            <div className="w-fit max-w-[85%] px-4 py-3 text-sm bg-slate-800/90 text-[#2dd4bf] rounded-2xl rounded-tl-none border border-slate-700/60 animate-pulse text-right font-medium">
              {activeStatuses[statusIndex]}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* الشريط السفلي للإدخال والاقتراحات */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0b101b] space-y-2.5 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_SUGGESTIONS.map((item, i) => (
            <button
              key={i}
              onClick={() => setInput(item)}
              className="shrink-0 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              {item}
            </button>
          ))}
        </div>

        {selectedFile && (
          <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              {selectedFile.type.startsWith("image/") ? (
                <ImageIcon className="size-4 text-[#2dd4bf] shrink-0" />
              ) : (
                <Paperclip className="size-4 text-[#2dd4bf] shrink-0" />
              )}
              <span className="truncate max-w-[200px] font-bold text-white">{selectedFile.name}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 rounded-full text-slate-400 hover:text-white"
              onClick={() => setSelectedFile(null)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center rounded-2xl border border-slate-800 bg-slate-900/90 focus-within:border-[#2dd4bf] transition">
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
              className="w-full resize-none bg-transparent py-3 pr-11 pl-4 text-xs text-right text-white placeholder:text-slate-500 focus:outline-none max-h-32 min-h-[44px]"
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
