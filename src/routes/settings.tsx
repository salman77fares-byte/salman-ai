import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Brain,
  ChevronDown,
  ExternalLink,
  Info,
  Settings2,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { MemorySettings } from "@/components/salman/MemorySettings";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/hooks/useSession";
import { clearAllConversations } from "@/lib/chat.functions";
import { ENGINE_OPTIONS, ENGINE_STORAGE_KEY, type EngineId } from "@/lib/engines";
import { SALMAN_PROJECTS } from "@/lib/projects";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "الإعدادات — Salman AI" },
      { name: "description", content: "إعدادات Salman AI: المظهر، الذاكرة، الحساب، ومشاريع سلمان فارس." },
      { property: "og:title", content: "الإعدادات — Salman AI" },
      { property: "og:description", content: "خصّص تجربتك في Salman AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const FONT_SIZES: Record<string, string> = { small: "15px", medium: "16px", large: "18px" };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-secondary px-4 py-3">
      <span className="text-sm font-bold">{label}</span>
      {children}
    </div>
  );
}

function Category({
  icon,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-4 text-start transition hover:bg-secondary/50"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        </span>
        <ChevronDown className={`size-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="space-y-2 border-t border-border p-4">{children}</div> : null}
    </section>
  );
}

const selectCls = "rounded-xl border border-border bg-background px-2 py-1 text-xs font-bold";

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const { user, isGuest } = useSession();
  const [open, setOpen] = useState<string | null>("general");
  const [engine, setEngine] = useState<EngineId>("gemini");
  const [replyLang, setReplyLang] = useState("auto");
  const [fontScale, setFontScale] = useState("medium");
  const clearFn = useServerFn(clearAllConversations);

  useEffect(() => {
    const e = localStorage.getItem(ENGINE_STORAGE_KEY) as EngineId | null;
    if (e && ENGINE_OPTIONS.some((o) => o.id === e)) setEngine(e);
    setReplyLang(localStorage.getItem("salman-reply-lang") ?? "auto");
    setFontScale(localStorage.getItem("salman-font-scale") ?? "medium");
  }, []);

  const toggle = (id: string) => setOpen((cur) => (cur === id ? null : id));

  const clearAll = useMutation({
    mutationFn: () => clearFn(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("تم حذف كل المحادثات");
    },
    onError: () => toast.error("تعذّر حذف المحادثات."),
  });

  return (
    <div className="min-h-screen bg-background">
      <header
        className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/80 px-3 pb-3 backdrop-blur"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="رجوع إلى المحادثة"
          onClick={() => void navigate({ to: "/chat" })}
        >
          <ArrowRight className="size-5" />
        </Button>
        <h1 className="text-base font-extrabold">الإعدادات</h1>
      </header>

      <main className="mx-auto max-w-xl space-y-3 px-3 py-4 pb-12">
        <Category
          icon={<Settings2 className="size-5" />}
          title="عام"
          subtitle="المظهر، نموذج الرد، اللغة وحجم الخط"
          open={open === "general"}
          onToggle={() => toggle("general")}
        >
          <Row label="🌙 الوضع الليلي">
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </Row>
          <Row label="🤖 نموذج الرد">
            <select
              value={engine}
              onChange={(ev) => {
                const v = ev.currentTarget.value as EngineId;
                setEngine(v);
                localStorage.setItem(ENGINE_STORAGE_KEY, v);
                toast.success("تم حفظ نموذج الرد المفضّل");
              }}
              className={selectCls}
            >
              {ENGINE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="🌐 لغة الردود">
            <select
              value={replyLang}
              onChange={(ev) => {
                setReplyLang(ev.currentTarget.value);
                localStorage.setItem("salman-reply-lang", ev.currentTarget.value);
              }}
              className={selectCls}
            >
              <option value="auto">تلقائي</option>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </Row>
          <Row label="🔠 حجم الخط">
            <select
              value={fontScale}
              onChange={(ev) => {
                const v = ev.currentTarget.value;
                setFontScale(v);
                localStorage.setItem("salman-font-scale", v);
                document.documentElement.style.fontSize = FONT_SIZES[v] ?? "16px";
              }}
              className={selectCls}
            >
              <option value="small">صغير</option>
              <option value="medium">متوسط</option>
              <option value="large">كبير</option>
            </select>
          </Row>
        </Category>

        <Category
          icon={<Brain className="size-5" />}
          title="الذاكرة"
          subtitle="وضع الذاكرة وإدارة ما يتذكره Salman AI عنك"
          open={open === "memory"}
          onToggle={() => toggle("memory")}
        >
          <MemorySettings />
        </Category>

        <Category
          icon={<UserRound className="size-5" />}
          title="الحساب والبيانات"
          subtitle="بريدك الإلكتروني وإدارة المحادثات"
          open={open === "account"}
          onToggle={() => toggle("account")}
        >
          <div className="rounded-2xl bg-secondary px-4 py-3 text-xs leading-6">
            {isGuest ? (
              <span className="text-muted-foreground">
                أنت تستخدم التطبيق كزائر.{" "}
                <Link to="/auth" className="font-bold text-primary">
                  سجّل الدخول
                </Link>{" "}
                لحفظ محادثاتك.
              </span>
            ) : (
              <>
                <span className="block text-muted-foreground">البريد الإلكتروني</span>
                <span dir="ltr" className="block truncate font-bold">
                  {user?.email}
                </span>
              </>
            )}
          </div>
          {!isGuest ? (
            <Button
              variant="outline"
              disabled={clearAll.isPending}
              className="w-full justify-start gap-2 rounded-2xl text-xs font-bold text-destructive"
              onClick={() => {
                if (window.confirm("هل تريد حذف كل المحادثات نهائياً؟")) clearAll.mutate();
              }}
            >
              <Trash2 className="size-4" />
              حذف كل المحادثات
            </Button>
          ) : null}
        </Category>

        <Category
          icon={<Info className="size-5" />}
          title="مشاريع سلمان وعن التطبيق"
          subtitle="روابط سريعة، الإصدار، والسياسات"
          open={open === "about"}
          onToggle={() => toggle("about")}
        >
          <ul className="space-y-1.5">
            {SALMAN_PROJECTS.map((p) => (
              <li key={p.name}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3 transition hover:bg-secondary/70"
                >
                  <span className="text-lg">{p.emoji}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-extrabold">{p.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {p.description}
                    </span>
                  </span>
                  <ExternalLink className="ms-auto size-3.5 shrink-0 text-primary" />
                </a>
              </li>
            ))}
          </ul>
          <Row label="📦 إصدار التطبيق">
            <span className="text-xs font-bold text-muted-foreground">1.0</span>
          </Row>
          <Row label="👨‍💻 المطوّر">
            <span className="text-xs font-bold text-muted-foreground">المهندس سلمان فارس</span>
          </Row>
          <div className="grid gap-1.5 text-xs font-bold">
            <Link to="/privacy" className="rounded-2xl bg-secondary px-4 py-3 text-primary">
              سياسة الخصوصية
            </Link>
            <Link to="/terms" className="rounded-2xl bg-secondary px-4 py-3 text-primary">
              شروط الاستخدام
            </Link>
            <Link to="/delete-account" className="rounded-2xl bg-secondary px-4 py-3 text-destructive">
              حذف الحساب
            </Link>
          </div>
        </Category>
      </main>
    </div>
  );
}
