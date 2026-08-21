import { createAPIFileRoute } from "@tanstack/react-start/api";
import { askSalmanAI } from "@/lib/aiService";

export const APIRoute = createAPIFileRoute("/api/chat")({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const messages = body.messages ?? [];

      // استدعاء دالة المعالجة من aiService
      const replyText = await askSalmanAI(messages);

      return new Response(replyText, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    } catch (error) {
      console.error("Chat API Error:", error);
      return new Response("عذراً، تعذّر الاتصال بالخدمة حالياً.", {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }
  },
});
