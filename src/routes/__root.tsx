import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider } from "../lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0b1220" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Salman AI" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
      { title: "Salman AI" },
      {
        name: "description",
        content: "Salman AI | منصتك الذكية المتكاملة",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" },
      { rel: "icon", type: "image/png", href: "./favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&family=JetBrains+Mono:wght@400;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className="dark">
      <head>
        <HeadContent />
        <style>{`
          #gptengineer-badge,
          gptengineer-badge,
          lovable-badge,
          [id*="gptengineer"],
          [class*="lovable"],
          [id*="lovable"],
          iframe[src*="gptengineer"],
          iframe[src*="lovable"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            width: 0 !important;
            height: 0 !important;
          }

          .katex, .katex-display, .katex-html, [class*="math"] {
            direction: ltr !important;
            unicode-bidi: isolate !important;
            text-align: left;
          }
        `}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('salman-theme')||'dark';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}`,
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/* شاشة عدم وجود اتصال بالإنترنت */
function OfflineScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b1220] px-4 text-center">
      <div className="flex flex-col items-center">
        {/* شعار التطبيق داخل مربع منحني الزوايا */}
        <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-3xl bg-slate-900/90 p-4 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
          <img
            src="/favicon.png"
            alt="Salman AI Logo"
            className="h-full w-full object-contain rounded-2xl"
          />
        </div>

        {/* نص طلب الاتصال بالإنترنت */}
        <h2 className="text-xl font-bold tracking-wide text-white">
          يرجى الاتصال بالإنترنت
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          تأكد من وجود اتصال فعّال بالشبكة لاستخدام Salman AI
        </p>

        {/* مؤشر جاري انتظار الاتصال */}
        <div className="mt-8 flex items-center gap-2 rounded-full bg-slate-800/60 px-4 py-1.5 text-xs text-slate-300 ring-1 ring-white/5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
          </span>
          بانتظار الاتصال...
        </div>
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // فحص حالة الاتصال بالإنترنت بشكل ديناميكي
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof window !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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

  // إذا لم يكن هناك إنترنت، يتم عرض شاشة الشعار والنص
  if (!isOnline) {
    return <OfflineScreen />;
  }

  // عند توفر الإنترنت، يتم فتح التطبيق كالمعتاد
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Outlet />
        <Toaster position="top-center" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
