import { createFileRoute } from "@tanstack/react-router";
import { askSalmanAI } from "@/lib/aiService";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: corsHeaders,
        });
      },

      POST: async ({ request }: { request: Request }) => {
        try {
          const body = (await request.json()) as {
            messages?: unknown[];
            conversationId?: string;
          };

          const messages = body.messages ?? [];

          if (!Array.isArray(messages)) {
            return new Response(
              JSON.stringify({
                error: "صيغة الرسائل غير صحيحة.",
              }),
              {
                status: 400,
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json; charset=utf-8",
                },
              },
            );
          }

          const replyText = await askSalmanAI(messages);

          return new Response(replyText, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache",
            },
          });
        } catch (error) {
          console.error("Chat API Error:", error);

          return new Response(
            "عذراً، تعذّر الاتصال بالخدمة حالياً.",
            {
              status: 500,
              headers: {
                ...corsHeaders,
                "Content-Type":
                  "text/plain; charset=utf-8",
              },
            },
          );
        }
      },
    },
  },
});
