import { createFileRoute } from "@tanstack/react-router";
import { proImageBody, proImageSchema } from "@/lib/pro-image";

export const Route = createFileRoute("/api/images")({
  server: { handlers: { POST: async ({ request }) => {
    const headers = { "Cache-Control": "no-store" };
    const origin = request.headers.get("Origin");
    if (origin && origin !== new URL(request.url).origin) {
      return Response.json({ error: "طلب غير مسموح." }, { status: 403, headers });
    }
    try {
      const input = proImageSchema.safeParse(await request.json());
      if (!input.success) return Response.json({ error: "تحقق من الوصف ومفتاح OpenAI." }, { status: 400, headers });
      // Fixed provider endpoint; the user's key is used once and is never logged or persisted.
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${input.data.apiKey}` },
        body: JSON.stringify(proImageBody(input.data.prompt)),
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) {
        const error = response.status === 401 ? "مفتاح OpenAI غير صالح. تحقق منه وأعد المحاولة."
          : response.status === 403 ? "حساب OpenAI لا يسمح بهذا النموذج؛ تحقق من صلاحيات الحساب."
          : response.status === 429 ? "تجاوزت حد الطلبات أو الرصيد لدى OpenAI."
          : "رفضت خدمة OpenAI الطلب؛ تحقق من الوصف وصلاحيات الحساب ثم أعد المحاولة.";
        return Response.json({ error }, { status: 502, headers });
      }
      const data = await response.json() as { data?: { b64_json?: string }[] };
      const image = data.data?.[0]?.b64_json;
      if (!image) return Response.json({ error: "لم تُرجع الخدمة صورة؛ حاول مرة أخرى." }, { status: 502, headers });
      return Response.json({ image: `data:image/png;base64,${image}` }, { headers });
    } catch {
      return Response.json({ error: "تعذّر الاتصال بخدمة الصور أو انتهت مهلة الطلب." }, { status: 502, headers });
    }
  } } },
});