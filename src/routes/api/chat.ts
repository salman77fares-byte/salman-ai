import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM_PROMPT = `أنت "Salman AI"، مساعد ذكي عربي متقدّم من سلمان للتقنية.
- أجب بلغة المستخدم: إذا كتب بالعربية أجب بعربية فصحى واضحة، وإذا كتب بالإنجليزية أجب بالإنجليزية.
- استخدم تنسيق Markdown (عناوين، قوائم، جداول، نص عريض) لتنظيم الإجابات.
- ضع الأكواد دائماً داخل كتل برمجية مع تحديد اللغة، مثل \`\`\`ts.
- كن دقيقاً وموجزاً، واطلب التوضيح إذا كان السؤال غامضاً.`;

type ChatRequestBody = {
  messages?: unknown;
  conversationId?: unknown;
};

function textOf(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

async function generateConversationTitle(firstMessage: string): Promise<string> {
  const fallback = firstMessage.replace(/\s+/g, " ").trim().slice(0, 50);
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return fallback;
  try {
    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const { text } = await generateText({
      model: gateway("google/gemini-3.1-flash-lite"),
      system:
        "اكتب عنواناً قصيراً جداً (٢ إلى ٥ كلمات) يصف موضوع رسالة المستخدم، بنفس لغة الرسالة. بدون علامات ترقيم في النهاية وبدون علامات تنصيص وبدون أي شرح.",
      prompt: firstMessage.slice(0, 500),
    });
    const title = text.replace(/^["'«»\s]+|["'«».\s]+$/g, "").replace(/\s+/g, " ").trim();
    return title ? title.slice(0, 60) : fallback;
  } catch (error) {
    console.error("[chat] title generation failed", error);
    return fallback;
  }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as ChatRequestBody;
        const messages = body.messages;
        const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
        if (!Array.isArray(messages) || !conversationId) {
          return new Response("Bad request", { status: 400 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const { createUserClient } = await import("@/lib/supabase-user.server");
        const supabase = createUserClient(token);

        const { data: conversation, error: convError } = await supabase
          .from("conversations")
          .select("id, title")
          .eq("id", conversationId)
          .maybeSingle();
        if (convError || !conversation) return new Response("Forbidden", { status: 403 });

        const uiMessages = messages as UIMessage[];
        const lastMessage = uiMessages[uiMessages.length - 1];

        let titleSeed = "";
        if (lastMessage && lastMessage.role === "user") {
          const content = textOf(lastMessage);
          const { error: insertError } = await supabase
            .from("messages")
            .insert({ conversation_id: conversationId, sender: "user", content });
          if (insertError) console.error("[chat] failed to save user message", insertError);

          if (conversation.title === "محادثة جديدة" && content) titleSeed = content;
        }

        const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
        const gateway = createLovableAiGatewayProvider(apiKey);

        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(uiMessages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: uiMessages,
          onFinish: async ({ responseMessage }) => {
            if (titleSeed) {
              const title = await generateConversationTitle(titleSeed);
              const { error: titleError } = await supabase
                .from("conversations")
                .update({ title, updated_at: new Date().toISOString() })
                .eq("id", conversationId);
              if (titleError) console.error("[chat] failed to set title", titleError);
            }
            const content = textOf(responseMessage);
            if (!content) return;
            const { error } = await supabase
              .from("messages")
              .insert({ conversation_id: conversationId, sender: "assistant", content });
            if (error) console.error("[chat] failed to save assistant message", error);
            const { error: touchError } = await supabase
              .from("conversations")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", conversationId);
            if (touchError) console.error("[chat] failed to touch conversation", touchError);
          },
        });

      },
    },
  },
});
