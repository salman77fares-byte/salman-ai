import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

import { BrandMark } from "@/components/salman/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — Salman AI" },
      { name: "description", content: "سجّل الدخول أو أنشئ حساباً لبدء المحادثة مع Salman AI." },
      { property: "og:title", content: "تسجيل الدخول — Salman AI" },
      { property: "og:description", content: "سجّل الدخول لبدء المحادثة مع Salman AI." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/chat", replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("أدخل بريداً صحيحاً وكلمة مرور من ٦ أحرف على الأقل.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setSentEmail(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      void navigate({ to: "/chat", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر إكمال العملية.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("تعذّر تسجيل الدخول عبر Google.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/chat", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-soft">
        <div className="flex flex-col items-center text-center">
          <BrandMark size={54} className="shadow-glow" />
          <h1 className="mt-4 text-2xl font-extrabold">
            {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            للوصول إلى محادثاتك مع <span className="font-bold text-primary">Salman AI</span>
          </p>
        </div>

        {sentEmail ? (
          <div className="mt-6 rounded-2xl bg-secondary p-5 text-center">
            <Mail className="mx-auto size-6 text-primary" />
            <p className="mt-3 text-sm font-bold">تحقّق من بريدك الإلكتروني</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              أرسلنا رابط تأكيد إلى {email}. افتح الرابط لتأكيد حسابك ثم عد لتسجيل الدخول.
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  dir="ltr"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded-xl"
                  required
                  minLength={6}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl brand-gradient-bg font-extrabold text-primary-foreground hover:opacity-90"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === "login" ? "دخول" : "إنشاء الحساب"}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              أو
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button
              variant="outline"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full gap-2 rounded-xl font-bold"
            >
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 11v2.8h6.6c-.3 1.7-2 5-6.6 5A6.8 6.8 0 0 1 12 5.2c2 0 3.3.8 4.1 1.6l2.1-2A9.6 9.6 0 0 0 12 2a10 10 0 0 0 0 20c5.8 0 9.6-4 9.6-9.8 0-.7-.1-1.2-.2-1.7z"
                />
              </svg>
              المتابعة عبر Google
            </Button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "login" ? "لا تملك حساباً؟" : "لديك حساب بالفعل؟"}{" "}
              <button
                type="button"
                className="font-bold text-primary hover:underline"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
              >
                {mode === "login" ? "أنشئ حساباً" : "سجّل الدخول"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
