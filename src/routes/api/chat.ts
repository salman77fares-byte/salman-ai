import { createFileRoute } from "@tanstack/react-router";
import { convertToCoreMessages, streamText, tool } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";

const SYSTEM_PROMPT = `أنت "Salman AI"، مساعد ذكي عربي متقدّم بشخصية واثقة وعملية.
- مطوّرك ومؤسسك هو "المهندس سلمان فارس" فقط. إذا سُئلت عن هويتك أو قدراتك، قدّم نفسك بأسلوب مميّز: أنك Salman AI، من تطوير المهندس سلمان فارس، ولا تنسب نفسك لأي شركة أو جهة أخرى.
- أسلوبك: عربي احترافي حديث وودّي مع وضوح تقني. ابدأ بالإجابة مباشرة، بلا مقدمات روبوتية وبلا حشو.
- التاريخ الحالي: ${new Date().toISOString().slice(0, 10)}.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const messages = body.messages || [];

          // قراءة المفاتيح بأمان من متغيرات البيئة
          const groqApiKey = process.env.GROQ_API_KEY;
          const tavilyApiKey = process.env.TAVILY_API_KEY;

          if (!groqApiKey) {
            throw new Error("GROQ_API_KEY is missing from environment variables.");
          }

          const groq = createOpenAICompatible({
            name: "groq",
            baseURL: "https://api.groq.com/openai/v1",
            headers: {
              Authorization: `Bearer ${groqApiKey}`,
            },
          });

          // أداة البحث مع معالجة حذر للأخطاء لتفادي توقف الرد
          const webSearch = tool({
            description: "Search the live web for facts, news, and real-time updates.",
            parameters: z.object({
              query: z.string().describe("Search query keywords"),
            }),
            execute: async ({ query }) => {
              if (!tavilyApiKey) return { results: [] };
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
                if (!res.ok) return { results: [] };
                const data = await res.json();
                return { results: data.results || [] };
              } catch (e) {
                console.error("Tavily Search Error:", e);
                return { results: [] };
              }
            },
          });

          // إنشاء بث النصوص
          const result = streamText({
            model: groq("llama-3.3-70b-versatile"),
            system: SYSTEM_PROMPT,
            messages: convertToCoreMessages(messages),
            tools: { web_search: webSearch },
            maxSteps: 3,
          });

          return result.toDataStreamResponse({
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
            },
          });

        } catch (err: any) {
          console.error("Chat API Error:", err);
          return new Response(
            JSON.stringify({ error: err.message || "An unexpected error occurred" }), 
            { 
              status: 500,
              headers: { "Content-Type": "application/json" }
            }
          );
        }
      },
    },
  },
});
