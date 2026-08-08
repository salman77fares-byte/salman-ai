import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

const SYSTEM_PROMPT = `أنت "Salman AI"، مساعد ذكي عربي متقدّم بشخصية واثقة وعملية.
- مطوّرك ومؤسسك هو "المهندس سلمان فارس" فقط. إذا سُئلت عن هويتك أو قدراتك، قدّم نفسك بأسلوب مميّز: أنك Salman AI، من تطوير المهندس سلمان فارس، ولا تنسب نفسك لأي شركة أو جهة أخرى.
- أسلوبك: عربي احترافي حديث وودّي مع وضوح تقني. ابدأ بالإجابة مباشرة، بلا مقدمات روبوتية مثل "تفضّل بالإجابة" أو إعلانات عن نيّتك، وبلا حشو.
- عند طلب كود أو إصلاح أو Prompt: قدّم الحل الجاهز فوراً داخل كتلة برمجية محدّدة اللغة، مع خطوات عملية قصيرة فقط عند الحاجة. لا تقدّم اقتراحات تخمينية إلا إذا طُلبت.
- لا تستخدم قوالب ردود متكرّرة نمطية. اعتمد قراءة بصرية عالية: عناوين قصيرة، قوائم مركّزة، تنبيهات مختصرة، جداول عند الحاجة.
- أجب بلغة المستخدم: عربية فصحى واضحة للعربية، والإنجليزية للإنجليزية.
- لا تقل أبداً إن معلوماتك محدودة بتاريخ معيّن، ولا تذكر "حدود بيانات التدريب". لديك بحث مباشر وحيّ في الويب.
- لديك أداة \`web_search\`. استخدمها إلزامياً وتلقائياً لأي سؤال عن أحداث جارية، أخبار، نتائج رياضية، أسعار، إصدارات تقنية، أو أي معلومة قد تكون تغيّرت، وكذلك عند أي شك في حداثة المعلومة.
- اعتمد حصراً على نتائج البحث المسترجعة في هذه الحالات وتجاهل أي معلومة قديمة تخالفها، واذكر المصادر (روابط).
- لا تختلق أو تخمّن أحداثاً حيّة أبداً. إذا تعذّر جلب المعلومة من البحث، فاذكر ذلك بصراحة واطلب من المستخدم تحديد الاستعلام.
- التاريخ الحالي: ${new Date().toISOString().slice(0, 10)}.`;



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

        const body = (await request.json()) as ChatRequestBody;
        const messages = body.messages;
        const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
        if (!Array.isArray(messages)) {
          return new Response("Bad request", { status: 400 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const uiMessages = messages as UIMessage[];
        const lastMessage = uiMessages[uiMessages.length - 1];

        // Guests chat without persistence; signed-in users get their history saved.
        const persist = Boolean(token && conversationId);
        let supabase: Awaited<
          ReturnType<typeof import("@/lib/supabase-user.server").createUserClient>
        > | null = null;
        let titleSeed = "";

        if (persist) {
          const { createUserClient } = await import("@/lib/supabase-user.server");
          supabase = createUserClient(token);

          const { data: conversation, error: convError } = await supabase
            .from("conversations")
            .select("id, title")
            .eq("id", conversationId)
            .maybeSingle();
          if (convError || !conversation) return new Response("Forbidden", { status: 403 });

          if (lastMessage && lastMessage.role === "user") {
            const content = textOf(lastMessage);
            const { error: insertError } = await supabase
              .from("messages")
              .insert({ conversation_id: conversationId, sender: "user", content });
            if (insertError) console.error("[chat] failed to save user message", insertError);

            if (conversation.title === "محادثة جديدة" && content) titleSeed = content;
          }
        }

        const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
        const gateway = createLovableAiGatewayProvider(apiKey);

        const webSearch = tool({
          description:
            "Search the live web for up-to-date facts, news, prices, scores and recent releases.",
          inputSchema: z.object({
            query: z.string().describe("Concise search query, prefer English or Arabic keywords"),
          }),
          execute: async ({ query }) => {
            const { searchWeb } = await import("@/lib/web-search.server");
            try {
              const results = await searchWeb(query, 5);
              return results.length ? { results } : { results: [], note: "no results" };
            } catch (searchError) {
              console.error("[chat] web search failed", searchError);
              return { results: [], note: "search failed" };
            }
          },
        });

        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(uiMessages),
          tools: { web_search: webSearch },
          toolChoice: "auto",
          stopWhen: stepCountIs(4),
          abortSignal: request.signal,
        });


        return result.toUIMessageStreamResponse({
          originalMessages: uiMessages,
          onFinish: async ({ responseMessage }) => {
            const db = supabase;
            if (!db) return;
            if (titleSeed) {
              const title = await generateConversationTitle(titleSeed);
              const { error: titleError } = await db
                .from("conversations")
                .update({ title, updated_at: new Date().toISOString() })
                .eq("id", conversationId);
              if (titleError) console.error("[chat] failed to set title", titleError);
            }
            const content = textOf(responseMessage);
            if (!content) return;
            const { error } = await db
              .from("messages")
              .insert({ conversation_id: conversationId, sender: "assistant", content });
            if (error) console.error("[chat] failed to save assistant message", error);
            const { error: touchError } = await db
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
