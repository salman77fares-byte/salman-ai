import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Send, Plus, Paperclip, Square, User } from "lucide-react";
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
}

function ChatIndexScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, isGuest } = useSession();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [slogan, setSlogan] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const slogans = [
    "مساعدك الذكي لإنجاز المهام، كتابة الأكواد، وتحليل البيانات بكفاءة.",
    "منصة الذكاء الاصطناعي المبتكرة لتطوير الأفكار وتسريع الإنتاجية.",
    "كيف يمكنني مساعدتك اليوم؟",
    "Salman AI | قوتك المعرفية والبرمجية في مكان واحد.",
    "تجربة ذكاء اصطناعي متطورة بتطوير المهندس سلمان فارس.",
  ];

  useEffect(() => {
    const random = slogans[Math.floor(Math.random() * slogans.length)];
    setSlogan(random);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (customText?: string) => {
    const text = customText || input;

    if (isLoading) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsLoading(false);
      return;
    }

    if (!text.trim()) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const responseText = await askSalmanAI(newMessages, controller.signal);
      setMessages((prev) => [...prev, { role: "assistant", content: responseText }]);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "تم إيقاف التوليد بطلب منك." },
        ]);
      } else {
        toast.error("حدث خطأ أثناء التواصل مع النموذج.");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "تعذّر الحصول على رد. يُرجى المحاولة لاحقًا." },
        ]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleNewChat = () => {
    if (isLoading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setInput("");
    setIsLoading(false);
    toast.success("تم بدء محادثة جديدة");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.info(`تم اختيار الملف: ${file.name}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground dir-rtl">
      {/* شريط الإجراءات العلوي السريع */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/50 backdrop-blur-sm">
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewChat}
          className="gap-1.5 rounded-xl text-xs font-bold"
        >
          <Plus className="size-3.5" />
          محادثة جديدة
        </Button>
      </div>

      {/* منطقة الرسائل */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center my-12 text-center space-y-3">
            <BrandMark size={64} />
            <h1 className="text-2xl font-extrabold text-foreground tracking-wide">
              Salman AI
            </h1>
            <p className="text-muted-foreground text-xs max-w-sm leading-relaxed px-4 min-h-[36px] flex items-center justify-center">
              {slogan}
            </p>
          </div>
        )}

        {messages.map((m, idx) => {
          if (!m.content) return null;
          const isUser = m.role === "user";
          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${
                isUser ? "justify-start" : "justify-end"
              }`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                  <BrandMark size={18} />
                </div>
              )}

              <div
                className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed break-words ${
                  isUser
                    ? "bg-primary text-primary-foreground font-medium rounded-tr-none whitespace-pre-wrap"
                    : "bg-secondary text-secondary-foreground border border-border rounded-tl-none"
                }`}
              >
                {isUser ? (
                  m.content
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose dark:prose-invert max-w-none text-xs space-y-2 [&_p]:leading-relaxed [&_pre]:bg-background/80 [&_pre]:p-3 [&_pre]:rounded-xl [&_code]:font-mono"
                  >
                    {m.content}
                  </ReactMarkdown>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground">
                  <User className="size-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-2.5 justify-end">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
              <Loader2 className="size-4 animate-spin text-primary" />
            </div>
            <div className="bg-secondary border border-border p-3.5 rounded-2xl rounded-tl-none text-primary text-xs font-medium animate-pulse">
              Salman يكتب الآن...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* منطقة الإدخال */}
      <footer className="p-3 bg-background border-t border-border space-y-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="flex items-center gap-2 bg-secondary border border-border rounded-2xl p-1.5 focus-within:border-primary transition-all">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="size-9 rounded-xl text-muted-foreground hover:text-foreground shrink-0"
            title="إرفاق ملف"
          >
            <Paperclip className="size-4" />
          </Button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب رسالتك لـ Salman AI..."
            rows={1}
            className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-xs border-none outline-none resize-none px-2 dir-rtl"
            autoComplete="on"
            autoCorrect="on"
            spellCheck={true}
            inputMode="text"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <Button
            type="button"
            onClick={() => handleSend()}
            size="icon"
            className={`size-9 rounded-xl transition-all shrink-0 ${
              isLoading
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
            title={isLoading ? "إيقاف الرد" : "إرسال"}
          >
            {isLoading ? (
              <Square className="size-4 fill-current" />
            ) : (
              <Send className="size-4 rotate-180" />
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}

export default ChatIndexScreen;
