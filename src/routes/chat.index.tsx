import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Send } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

import { BrandMark } from "@/components/salman/BrandMark";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { askSalmanAI } from "@/lib/aiService";

export const Route = createFileRoute("/chat/")({
  component: ChatIndexScreen,
});

function ChatIndexScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, loading } = useSession();
  
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userMessage = { role: "user" as const, content: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setIsSending(true);

    try {
      const response = await askSalmanAI(updatedMessages);
      setMessages([...updatedMessages, { role: "assistant", content: response }]);
    } catch (error) {
      console.error(error);
      toast.error("تعذّر جلب الرد حالياً.");
    } finally {
      setIsSending(false);
    }
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
    <div className="flex h-full flex-col justify-between p-4">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center space-y-3 mt-12">
            <BrandMark size={56} />
            <h2 className="text-lg font-bold">مرحباً بك مع Salman AI</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              كيف يمكن للذكاء الاصطناعي مساعدتك اليوم؟ اكتب سؤالك وابدأ المحادثة.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground ms-auto"
                  : "bg-secondary text-secondary-foreground me-auto border border-border"
              }`}
            >
              {msg.content}
            </div>
          ))
        )}
        {isSending && (
          <div className="p-4 rounded-2xl max-w-[85%] text-sm bg-secondary text-muted-foreground me-auto animate-pulse">
            جاري التفكير والأجابة...
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2 pt-3 border-t border-border mt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب رسالتك لـ Salman AI..."
          className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isSending}
        />
        <Button type="submit" disabled={isSending || !input.trim()} size="icon" className="rounded-2xl shrink-0">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
