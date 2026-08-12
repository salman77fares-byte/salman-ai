import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Send, Plus, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { useEffect, useState, useRef } from "react";
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
  attachment?: { name: string; type: string; url: string };
}

const QUICK_SUGGESTIONS = [
  "أحدث الأخبار الرياضية",
  "اشرح لي فكرة مشروع",
  "كتابة كود برمجي",
  "تلخيص نص مطول",
];

function ChatIndexScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, loading } = useSession();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; url: string; base64?: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // إرسال الرسالة ومعالجة تأثير الكتابة التدريجية
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && !selectedFile) || isSending) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      attachment: selectedFile ? { name: selectedFile.name, type: selectedFile.type, url: selectedFile.url } : undefined,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    const currentAttachment = selectedFile;
    setSelectedFile(null);
    setIsSending(true);

    // إضافة رسالة المساعد فارغة لبدء تأثير التأثير التدريجي
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      // إعداد المطالبة مع تفاصيل الملف إن وجد
      let fullPrompt = userMessage.content;
      if (currentAttachment) {
        fullPrompt = `[تم إرفاق ملف/صورة: ${currentAttachment.name}]\n${fullPrompt}`;
      }

      const formattedHistory = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // جلب الرد الكامل من الخدمة (مع دعم البحث والتحديثات)
      const fullResponse = await askSalmanAI(formattedHistory);

      // تطبيق تأثير الكتابة التدريجية (Typewriter Effect)
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
        await new Promise((resolve) => setTimeout(resolve, 35)); // سرعة الظهور التدريجي
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

  // معالجة اختيار الملفات والصور
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)");
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
    <div className="flex h-full flex-col justify-between bg-background text-foreground dir-rtl">
      {/* منطقة المحادثة */}
      <div className="flex-1 overflow-y-auto space-y-4 px-3 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center space-y-3 mt-8">
            <BrandMark size={56} />
            <h2 className="text-lg font-bold">مرحباً بك مع Salman AI</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              أسألني أي شيء، أرفق صوراً أو مستندات، وسأساعدك فوراً.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex w-full ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`w-fit max-w-[85%] px-4 py-3 text-sm leading-relaxed text-right whitespace-pre-wrap break-words ${
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
                        className="h-20 w-auto rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 font-bold">
                        <Paperclip className="size-4" />
                        <span className="truncate max-w-[180px]">{msg.attachment.name}</span>
                      </div>
                    )}
                  </div>
                )}
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isSending && messages[messages.length - 1]?.content === "" && (
          <div className="flex w-full justify-start">
            <div className="w-fit max-w-[85%] px-4 py-3 text-sm bg-slate-800/90 text-slate-400 rounded-2xl rounded-tl-none border border-slate-700/60 animate-pulse text-right">
              جاري التفكير وتحليل البيانات...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* الجزء السفلي: الاقتراحات وصندوق الإدخال */}
      <div className="p-2 border-t border-border bg-background/95 space-y-2">
        {/* شريط الاقتراحات السريعة فوق الكيبورد */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_SUGGESTIONS.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                setInput(item);
              }}
              className="shrink-0 rounded-full border border-border bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            >
              {item}
            </button>
          ))}
        </div>

        {/* معاينة الملف المرفق قبل الإرسال */}
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

        {/* نموذج الإدخال مع الأزرار */}
        <form onSubmit={handleSend} className="flex items-end gap-2">
          {/* زر الإرسال */}
          <Button
            type="submit"
            disabled={isSending || (!input.trim() && !selectedFile)}
            size="icon"
            className="rounded-2xl shrink-0 bg-[#2dd4bf] hover:bg-[#26b8a5] text-slate-950 h-11 w-11"
          >
            <Send className="size-4 rotate-180" />
          </Button>

          {/* صندوق النص وزر الإرفاق */}
          <div className="relative flex-1 flex items-center rounded-2xl border border-border bg-background focus-within:ring-2 focus-within:ring-[#2dd4bf]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب رسالتك لـ Salman AI..."
              rows={1}
              className="w-full resize-none bg-transparent py-3 pr-4 pl-10 text-sm text-right focus:outline-none max-h-32 min-h-[44px]"
            />

            {/* زر الـ + للإرفاق على الجهة اليسرى داخل الإدخال */}
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
              className="absolute left-2 text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-secondary transition"
              title="إرفاق صورة أو ملف"
            >
              <Plus className="size-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
