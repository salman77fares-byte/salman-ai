import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "../lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { OfflineBanner } from "@/components/OfflineBanner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-black brand-gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-bold text-foreground">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الرابط الذي تحاول الوصول إليه غير متوفر أو تم نقله.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          حدث خطأ أثناء تحميل الصفحة
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          يمكنك المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const purgeBadge = () => {
      const selectors = [
        "#gptengineer-badge",
        "gptengineer-badge",
        "lovable-badge",
        '[id*="gptengineer"]',
        '[class*="lovable"]',
        '[id*="lovable"]',
        'iframe[src*="gptengineer"]',
        'iframe[src*="lovable"]',
      ];
      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      });

      document.querySelectorAll("*").forEach((el) => {
        const name = el.tagName.toLowerCase();
        if (name.includes("lovable") || name.includes("gptengineer")) {
          el.remove();
        } else if (el.shadowRoot) {
          const shadowBadge = el.shadowRoot.querySelector(
            '#gptengineer-badge, [class*="badge"], [id*="badge"], a[href*="lovable"]'
          );
          if (shadowBadge) el.remove();
        }
      });
    };

    purgeBadge();

    const observer = new MutationObserver(purgeBadge);
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    const interval = setInterval(purgeBadge, 200);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <OfflineBanner />
        <Outlet />
        <Toaster position="top-center" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
