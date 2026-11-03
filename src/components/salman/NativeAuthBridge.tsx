import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { isNativeApp, parseNativeAuthUrl } from "@/lib/native-auth";

/** In the Android app, receives the session handed back from the Google sign-in sheet. */
export function NativeAuthBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeApp()) return;
    let remove: (() => void) | undefined;
    void (async () => {
      const { App } = await import("@capacitor/app");
      const { Browser } = await import("@capacitor/browser");
      const handle = await App.addListener("appUrlOpen", async ({ url }) => {
        const parsed = parseNativeAuthUrl(url);
        if (!parsed) return;
        void Browser.close().catch(() => undefined);
        if ("error" in parsed) {
          toast.error("تعذّر تسجيل الدخول عبر Google، حاول مرة أخرى.");
          return;
        }
        const { error } = await supabase.auth.setSession(parsed);
        if (error) {
          toast.error("تعذّر تسجيل الدخول عبر Google، حاول مرة أخرى.");
          return;
        }
        void navigate({ to: "/chat", replace: true });
      });
      remove = () => void handle.remove();
    })();
    return () => remove?.();
  }, [navigate]);

  return null;
}
