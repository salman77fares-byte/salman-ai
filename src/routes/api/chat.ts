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

          if (!groqApiKey) {
            return new Response("Missing GROQ_API_KEY", { status: 500 });
          }

          const formattedMessages = messages.map((m: any) => {
            if (typeof m.content === "string") return { role: m.role, content: m.content };
            const textPart = m.parts?.find((p: any) => p.type === "text");
            return { role: m.role, content: textPart ? textPart.text : "" };
          });

          formattedMessages.unshift({
            role: "system",
            content: SYSTEM_PROMPT
          });

          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: formattedMessages,
              temperature: 0.7
            })
          });

          if (!groqRes.ok) {
            const errText = await groqRes.text();
            return new Response(`Groq Error: ${errText}`, { status: 500 });
          }

          const groqData = await groqRes.json();
          const replyText = groqData.choices[0]?.message?.content || "أهلاً بك! كيف يمكنني مساعدتك؟";

          // صيغة البث المعتمدة لـ Vercel AI SDK v3/v4 (Text Stream Format)
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              // إرسال كتل النصوص وفق بروتوكول AI SDK (0:"نص")
              controller.enqueue(encoder.encode(`0:${JSON.stringify(replyText)}\n`));
              controller.close();
            }
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "x-vercel-ai-ui-stream": "1"
            }
          });

        } catch (err: any) {
          return new Response(err.message || "حدث خطأ غير متوقع", { status: 500 });
        }
      }
    }
  }
});
