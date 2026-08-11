import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
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

async function generateConversationTitle(firstMessage: string, groqClient: any): Promise<string> {
  const fallback = firstMessage.replace(/\s+/g, " ").trim().slice(0, 50);
  try {
    const { generateText } = await import("ai");
    const { text } = await generateText({
      model: groqClient("llama-3.3-70b-versatile"),
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

        const groqApiKey = process.env["GROQ_API_KEY"] || "ضع_مفتاح_GROQ_هنا";
        const tavilyApiKey = process.env["TAVILY_API_KEY"] || "ضع_مفتاح_TAVILY_هنا";

        if (!groqApiKey || groqApiKey === "ضع_مفتاح_GROQ_هنا") {
          return new Response("Missing GROQ_API_KEY", { status: 500 });
        }

        // إنشاء عميل Groq باستخدام محول OpenAI المتوافق
        const groq = createOpenAI({
          baseURL: "https://api.groq.com/openai/v1",
          apiKey: groqApiKey,
        });

        const uiMessages = messages as UIMessage[];
        const lastMessage = uiMessages[uiMessages.length - 1];

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

        // أداة البحث الحي في الويب عبر Tavily API
        const webSearch = tool({
          description:
            "Search the live web for up-to-date facts, news, prices, scores and recent releases.",
          inputSchema: z.object({
            query: z.string().describe("Concise search query, prefer English or Arabic keywords"),
          }),
          execute: async ({ query }) => {
            try {
              if (!tavilyApiKey || tavilyApiKey === "ضع_مفتاح_TAVILY_هنا") {
                return { results: [], note: "Tavily API key not configured" };
              }
              const response = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  api_key: tavilyApiKey,
                  query: query,
                  search_depth: "basic",
                  max_results: 5,
                }),
              });
              const data = await response.json();
              const results = data.results || [];
              return results.length ? { results } : { results: [], note: "no results" };
            } catch (searchError) {
              console.error("[chat] web search failed", searchError);
              return { results: [], note: "search failed" };
            }
          },
        });

        const result = streamText({
          model: groq("llama-3.3-70b-versatile"),
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
              const title = await generateConversationTitle(titleSeed, groq);
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
