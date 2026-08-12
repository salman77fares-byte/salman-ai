import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const SYSTEM_PROMPT = `أنت "Salman AI"، مساعد ذكي عربي متقدّم بشخصية واثقة وعملية.
- مطوّرك ومؤسسك هو "المهندس سلمان فارس" فقط. إذا سُئلت عن هويتك أو قدراتك، قدّم نفسك بأسلوب مميّز: أنك Salman AI، من تطوير المهندس سلمان فارس، ولا تنسب نفسك لأي شركة أو جهة أخرى.
- أسلوبك: عربي احترافي حديث وودّي مع وضوح تقني. ابدأ بالإجابة مباشرة، بلا مقدمات روبوتية وبلا حشو.
- التاريخ الحالي: ${new Date().toISOString().slice(0, 10)}.`;

type ChatRequestBody = {
  messages?: unknown;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as ChatRequestBody;
          const messages = body.messages;

          if (!Array.isArray(messages)) {
            return new Response("Bad request", { status: 400 });
          }

          const groqApiKey = process.env["GROQ_API_KEY"] || "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";
          const tavilyApiKey = process.env["TAVILY_API_KEY"] || "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";

          // إعداد العميل لـ Groq باستخدام محول OpenAI المدمج
          const groq = createOpenAI({
            baseURL: "https://api.groq.com/openai/v1",
            apiKey: groqApiKey,
          });

          const uiMessages = messages as UIMessage[];

          // أداة البحث في الويب عبر Tavily
          const webSearch = tool({
            description: "Search the live web for up-to-date facts, news, scores, and releases.",
            inputSchema: z.object({
              query: z.string().describe("Search query keywords"),
            }),
            execute: async ({ query }) => {
              try {
                const res = await fetch("https://api.tavily.com/search", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    api_key: tavilyApiKey,
                    query,
                    search_depth: "basic",
                    max_results: 3,
                  }),
                });
                const data = await res.json();
                return { results: data.results || [] };
              } catch (e) {
                return { results: [], note: "search failed" };
              }
            },
          });

          // إنشاء بث مباشر متوافق 100% مع الواجهة
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
          });

        } catch (err: any) {
          console.error("Chat Error:", err);
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      },
    },
  },
});
