import { createFileRoute } from "@tanstack/react-router";
import { askSalmanAI, EngineError } from "@/lib/aiService.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = (await request.json()) as { messages?: unknown[]; engine?: string | null };
          const messages = Array.isArray(body.messages) ? body.messages : [];

          const replyText = await askSalmanAI(messages, {
            engine: typeof body.engine === "string" ? body.engine : null,
            origin: new URL(request.url).origin,
          });

          return new Response(replyText, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        } catch (error) {
          console.error("Chat API Error:", error);
          if (error instanceof EngineError) {
            return new Response(error.message, {
              status: 502,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
          }
          return new Response("عذراً، تعذّر الاتصال بالخدمة حالياً.", {
            status: 500,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      },
    },
  },
});
