import { createFileRoute } from "@tanstack/react-router";

const MAX_BYTES = 20 * 1024 * 1024;

// تحويل تسجيل صوتي كامل إلى نص (يعمل في المتصفح وتطبيق أندرويد)
export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const len = Number(request.headers.get("content-length") || 0);
        if (len > MAX_BYTES) return Response.json({ error: "التسجيل طويل جداً" }, { status: 413 });
        let file: File | null = null;
        try {
          const form = await request.formData();
          const f = form.get("file");
          if (f instanceof File) file = f;
        } catch {
          file = null;
        }
        if (!file || file.size < 500) {
          return Response.json({ error: "لم يُلتقط صوت واضح، حاول مجدداً" }, { status: 400 });
        }
        if (file.size > MAX_BYTES) return Response.json({ error: "التسجيل طويل جداً" }, { status: 413 });
        try {
          const { transcribeAudio, GatewayError } = await import("@lovable.dev/ai-gateway");
          try {
            const result = await transcribeAudio({ model: "openai/gpt-transcribe", file });
            const text = String((result as { text?: unknown }).text ?? "").trim();
            return Response.json({ text });
          } catch (err) {
            if (err instanceof GatewayError) {
              console.error("[transcribe]", err.code, err.httpStatus);
              const status = err.httpStatus && err.httpStatus >= 400 ? err.httpStatus : 502;
              const msg =
                status === 402 ? "رصيد الذكاء الاصطناعي غير كافٍ حالياً" :
                status === 429 ? "طلبات كثيرة، حاول بعد قليل" :
                "تعذّر تحويل الصوت إلى نص";
              return Response.json({ error: msg }, { status });
            }
            throw err;
          }
        } catch (err) {
          console.error("[transcribe]", err);
          return Response.json({ error: "تعذّر تحويل الصوت إلى نص" }, { status: 500 });
        }
      },
    },
  },
});
