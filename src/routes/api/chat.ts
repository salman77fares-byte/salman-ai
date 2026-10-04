import { createFileRoute } from "@tanstack/react-router";
import { askSalmanAI, EngineError } from "@/lib/aiService.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = (await request.json()) as { messages?: unknown[]; engine?: string | null; memoryEnabled?: boolean; memories?: unknown[] };
          const messages = Array.isArray(body.messages) ? body.messages : [];

          // سياق المستخدم المسجّل: الذاكرة + ملخص المحادثات السابقة (من قاعدة البيانات)
          let memories = Array.isArray(body.memories) ? body.memories.map(String) : [];
          let pastHistory = "";
          const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
          if (token) {
            try {
              const { createUserClient } = await import("@/lib/supabase-user.server");
              const sb = createUserClient(token);
              const { data: u } = await sb.auth.getUser(token);
              if (u.user) {
                if (body.memoryEnabled === true) {
                  const { data: mems } = await sb
                    .from("user_memories")
                    .select("content")
                    .order("created_at", { ascending: true })
                    .limit(50);
                  if (mems?.length) memories = mems.map((m) => m.content);
                }
                const { data: convs } = await sb
                  .from("conversations")
                  .select("id, title, updated_at")
                  .order("updated_at", { ascending: false })
                  .limit(6);
                const parts: string[] = [];
                for (const c of convs ?? []) {
                  const { data: msgs } = await sb
                    .from("messages")
                    .select("sender, content, created_at")
                    .eq("conversation_id", c.id)
                    .order("created_at", { ascending: false })
                    .limit(6);
                  if (!msgs?.length) continue;
                  const lines = msgs
                    .reverse()
                    .map((m) => `  ${m.sender === "user" ? "المستخدم" : "المساعد"}: ${m.content.replace(/\s+/g, " ").slice(0, 220)}`)
                    .join("\n");
                  parts.push(`• محادثة "${c.title}" (${c.updated_at.slice(0, 10)}):\n${lines}`);
                }
                pastHistory = parts.join("\n").slice(0, 6000);
              }
            } catch (e) {
              console.error("context fetch failed", e);
            }
          }

          const replyText = await askSalmanAI(messages, {
            pastHistory,
            engine: typeof body.engine === "string" ? body.engine : null,
            origin: new URL(request.url).origin,
            memoryEnabled: body.memoryEnabled === true,
            memories,
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
