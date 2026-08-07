import { useNavigate } from "@tanstack/react-router";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { clearAllConversations } from "@/lib/chat.functions";

export const Route = createFileRoute("/delete-account")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "حذف الحساب — Salman AI" },
      {
        name: "description",
        content: "اطلب حذف حسابك وكل محادثاتك من Salman AI بشكل نهائي.",
      },
      { property: "og:title", content: "حذف الحساب — Salman AI" },
      { property: "og:description", content: "حذف بيانات حسابك ومحادثاتك من Salman AI." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeleteAccountScreen,
});

function DeleteAccountScreen() {
  const navigate = useNavigate();
  const { user, isGuest } = useSession();
  const clearFn = useServerFn(clearAllConversations);
  const [busy, setBusy] = useState(false);

  const wipe = async () => {
    setBusy(true);
    try {
      await clearFn();
      await supabase.auth.signOut();
      toast.success("تم حذف كل محادثاتك وتسجيل الخروج.");
      void navigate({ to: "/chat", replace: true });
    } catch {
      toast.error("تعذّر حذف البيانات، حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <Link to="/chat" className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-primary">
        <ArrowRight className="size-3.5" />
        رجوع إلى المحادثة
      </Link>
      <h1 className="text-2xl font-extrabold">حذف الحساب</h1>
      <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
        <p>
          حذف الحساب إجراء نهائي: تُحذف جميع محادثاتك ورسائلك ولا يمكن استرجاعها. يمكنك أولاً حذف
          كل بياناتك من هنا، ثم إرسال طلب إغلاق الحساب.
        </p>
        {isGuest ? (
          <p className="rounded-2xl bg-secondary px-4 py-3 text-xs">
            أنت تستخدم التطبيق كزائر، ولا توجد بيانات محفوظة لحسابك.
          </p>
        ) : (
          <div className="rounded-2xl bg-secondary px-4 py-3 text-xs" dir="ltr">
            {user?.email}
          </div>
        )}
        <Button
          variant="destructive"
          className="gap-2 rounded-xl font-extrabold"
          disabled={isGuest || busy}
          onClick={() => void wipe()}
        >
          <Trash2 className="size-4" />
          حذف كل بياناتي وتسجيل الخروج
        </Button>
        <p className="text-xs">
          لإغلاق الحساب نهائياً أرسل طلباً إلى المطوّر سلمان فارس مع البريد المسجّل.
        </p>
      </div>
    </main>
  );
}
