import { createFileRoute } from "@tanstack/react-router";

type Body = { prompt?: unknown; conversationId?: unknown; save?: unknown };

const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // one year

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as Body;
        const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
        const conversationId =
          typeof body.conversationId === "string" ? body.conversationId : "";
        const save = body.save !== false;
        if (!prompt || !conversationId) return new Response("Bad request", { status: 400 });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return Response.json(
            { error: "مفتاح خدمة توليد الصور غير متوفر حالياً." },
            { status: 500 },
          );
        }

        const { createUserClient } = await import("@/lib/supabase-user.server");
        const supabase = createUserClient(token);

        const { data: conversation, error: convError } = await supabase
          .from("conversations")
          .select("id")
          .eq("id", conversationId)
          .maybeSingle();
        if (convError || !conversation) return new Response("Forbidden", { status: 403 });

        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) return new Response("Unauthorized", { status: 401 });

        let b64: string | undefined;
        try {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-pro-image",
              messages: [{ role: "user", content: prompt }],
              modalities: ["image", "text"],
            }),
          });
          if (!upstream.ok) {
            const detail = await upstream.text().catch(() => "");
            console.error("[generate-image] upstream error", upstream.status, detail);
            const message =
              upstream.status === 429
                ? "تم تجاوز حد الاستخدام، حاول بعد قليل."
                : upstream.status === 402
                  ? "انتهى رصيد الذكاء الاصطناعي، يلزم ترقية الخطة."
                  : "تعذّر توليد الصورة، حاول مرة أخرى.";
            return Response.json({ error: message }, { status: upstream.status });
          }
          const json = (await upstream.json()) as { data?: Array<{ b64_json?: string }> };
          b64 = json.data?.[0]?.b64_json;
        } catch (error) {
          console.error("[generate-image] request failed", error);
        }

        if (!b64) {
          return Response.json(
            { error: "تعذّر توليد الصورة، حاول مرة أخرى." },
            { status: 502 },
          );
        }

        const bytes = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));
        const path = `${userId}/${crypto.randomUUID()}.png`;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: uploadError } = await supabaseAdmin.storage
          .from("generated-images")
          .upload(path, bytes, { contentType: "image/png", upsert: false });
        if (uploadError) {
          console.error("[generate-image] upload failed", uploadError);
          return Response.json({ error: "تعذّر حفظ الصورة المولّدة." }, { status: 500 });
        }

        const { data: signed, error: signError } = await supabaseAdmin.storage
          .from("generated-images")
          .createSignedUrl(path, SIGNED_URL_TTL);
        if (signError || !signed?.signedUrl) {
          console.error("[generate-image] sign failed", signError);
          return Response.json({ error: "تعذّر تجهيز رابط الصورة." }, { status: 500 });
        }

        const url = signed.signedUrl;

        if (save) {
          const { error: insertError } = await supabase.from("messages").insert([
            { conversation_id: conversationId, sender: "user", content: prompt },
            { conversation_id: conversationId, sender: "assistant", content: `![${prompt}](${url})` },
          ]);
          if (insertError) console.error("[generate-image] failed to save messages", insertError);

          const { error: touchError } = await supabase
            .from("conversations")
            .update({ title: prompt.slice(0, 60), updated_at: new Date().toISOString() })
            .eq("id", conversationId)
            .eq("title", "محادثة جديدة");
          if (touchError) console.error("[generate-image] failed to touch conversation", touchError);
        }

        return Response.json({ url, prompt });
      },
    },
  },
});
