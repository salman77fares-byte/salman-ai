import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/salman/BrandMark";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { NATIVE_AUTH_SCHEME } from "@/lib/native-auth";

export const Route = createFileRoute("/auth_/native")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول عبر Google — Salman AI" },
      { name: "description", content: "إكمال تسجيل الدخول بحساب Google إلى تطبيق Salman AI." },
      { property: "og:title", content: "تسجيل الدخول عبر Google — Salman AI" },
      { property: "og:description", content: "إكمال تسجيل الدخول إلى تطبيق Salman AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NativeAuthPage,
});

/** Runs inside the Custom Tab: signs in with Google, then hands the session back to the app. */
function NativeAuthPage() {
  const [failed, setFailed] = useState(false);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const handBack = (s: { access_token: string; refresh_token: string }) => {
      const hash = new URLSearchParams({ access_token: s.access_token, refresh_token: s.refresh_token });
      const url = `${NATIVE_AUTH_SCHEME}://auth#${hash.toString()}`;
      setReturnUrl(url);
      window.location.replace(url);
    };
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) handBack(s);
    });
    void (async () => {
      const { data: current } = await supabase.auth.getSession();
      if (current.session) return handBack(current.session);
      // Wait briefly in case we just returned from Google and the session is being set.
      await new Promise((r) => setTimeout(r, 1200));
      const { data: again } = await supabase.auth.getSession();
      if (again.session) return handBack(again.session);
      if (started.current) return;
      started.current = true;
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth/native`,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) setFailed(true);
    })();
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <BrandMark size={56} />
      {returnUrl ? (
        <>
          <p className="text-sm font-bold">تم تسجيل الدخول بنجاح.</p>
          <a href={returnUrl} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            العودة إلى التطبيق
          </a>
        </>
      ) : failed ? (
        <>
          <p className="text-sm font-bold">تعذّر تسجيل الدخول عبر Google.</p>
          <a href={`${NATIVE_AUTH_SCHEME}://auth#error=failed`} className="text-sm font-bold text-primary">
            العودة إلى التطبيق
          </a>
        </>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> جارِ تسجيل الدخول عبر Google...
        </p>
      )}
    </div>
  );
}
