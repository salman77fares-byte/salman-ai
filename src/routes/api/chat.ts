import { createFileRoute } from "@tanstack/react-router";
import { askSalmanAI } from "@/lib/aiService";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = (await request.json()) as { messages?: unknown[] };
          const messages = body.messages ?? [];

          const replyText = await askSalmanAI(messages);

          return new Response(replyText, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        } catch (error) {
          console.error("Chat API Error:", error);
          return new Response("عذراً، تعذّر الاتصال بالخدمة حالياً.", {
            status: 500,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      },
    },
  },
});
