import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { askSalmanAI } from "@/lib/aiService";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Salman AI" },
      {
        name: "description",
        content:
          "Salman AI | منصتك الذكية المتكاملة لتوليد الصور، برمجة الأكواد، كتابة النصوص، وغيرها من الخدمات المتطورة بسرعة ودقة متناهية. ابدأ الآن!",
      },
      { property: "og:title", content: "Salman AI" },
      {
        property: "og:description",
        content:
          "Salman AI | منصتك الذكية المتكاملة لتوليد الصور، برمجة الأكواد، كتابة النصوص، وغيرها من الخدمات المتطورة بسرعة ودقة متناهية. ابدأ الآن!",
      },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const result = await askSalmanAI(updatedMessages);
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      for await (const textPart of result.textStream) {
        assistantText += textPart;
        setMessages((prev) => {
          const newMsg = [...prev];
          newMsg[newMsg.length - 1] = { role: "assistant", content: assistantText };
          return newMsg;
        });
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "عذراً، حدث خطأ أثناء الاتصال بالخدمة." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4 rtl">
      <header className="py-4 border-b text-center font-bold text-2xl text-blue-600">
        Salman AI
      </header>

      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 my-auto pt-20">
            مرحباً بك في Salman AI! كيف يمكنني مساعدتك اليوم؟
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl max-w-[85%] text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-blue-600 text-white font-medium mr-auto"
                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 ml-auto border border-gray-200 dark:border-gray-700"
            }`}
          >
            {msg.content || (loading && idx === messages.length - 1 ? "جاري التفكير..." : "")}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 pt-3 border-t">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب رسالتك لـ Salman AI..."
          className="flex-1 p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl disabled:bg-gray-400 hover:bg-blue-700 transition"
        >
          إرسال
        </button>
      </form>
    </div>
  );
}
