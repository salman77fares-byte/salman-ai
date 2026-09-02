import { createFileRoute } from "@tanstack/react-router";
import { searchWeb } from "@/lib/web-search.server";

/** نقطة بحث حية عامة تُستخدم لتغذية الإجابات بمعلومات محدّثة. */
export const Route = createFileRoute("/api/public/search")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = (await request.json()) as { query?: unknown; limit?: unknown };
          const query = typeof body.query === "string" ? body.query : "";
          const limit = typeof body.limit === "number" ? Math.min(Math.max(body.limit, 1), 8) : 6;
          if (!query.trim()) {
            return Response.json({ results: [] }, { status: 200 });
          }
          const results = await searchWeb(query, limit);
          return Response.json(
            { results, fetchedAt: new Date().toISOString() },
            { status: 200, headers: { "Cache-Control": "no-store" } },
          );
        } catch {
          return Response.json({ results: [] }, { status: 200 });
        }
      },
    },
  },
});
