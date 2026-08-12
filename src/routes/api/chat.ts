import { createFileRoute } from "@tanstack/react-router";

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

          const groqApiKey = process.env["GROQ_API_KEY"] || "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";
          const tavilyApiKey = process.env["TAVILY_API_KEY"] || "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";

          if (!groqApiKey) {
            return new Response(JSON.stringify({ error: "Missing GROQ_API_KEY" }), { status: 500 });
          }

          const formattedMessages = messages.map((m: any) => {
            if (typeof m.content === "string") return { role: m.role, content: m.content };
            const textPart = m.parts?.find((p: any) => p.type === "text");
            return { role: m.role, content: textPart ? textPart.text : "" };
          });

          const lastUserMessage = formattedMessages.filter((m: any) => m.role === "user").pop()?.content || "";

          let searchContext = "";
          if (tavilyApiKey && lastUserMessage) {
            try {
              const searchRes = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  api_key: tavilyApiKey,
                  query: lastUserMessage,
                  search_depth: "basic",
                  max_results: 3
                })
              });
              const searchData = await searchRes.json();
              if (searchData.results?.length > 0) {
                searchContext = "\n\nReal-time Web Results:\n" + 
                  searchData.results.map((r: any) => `- ${r.title}: ${r.content}`).join("\n");
              }
            } catch (e) {
              console.warn("Tavily search skipped:", e);
            }
          }

          formattedMessages.unshift({
            role: "system",
            content: SYSTEM_PROMPT + searchContext
          });

          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: formattedMessages
            })
          });

          if (!groqRes.ok) {
            const errText = await groqRes.text();
            return new Response(JSON.stringify({ error: `Groq Error: ${errText}` }), { status: 500 });
          }

          const groqData = await groqRes.json();
          const replyText = groqData.choices[0]?.message?.content || "لم يتم استلام رد.";

          // تنسيق الرد كـ Text Stream متوافق مع Vercel AI SDK / TanStack
          const streamData = `0:${JSON.stringify(replyText)}\n`;

          return new Response(streamData, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "x-vercel-ai-ui-stream": "1"
            }
          });

        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
    }
  }
});
