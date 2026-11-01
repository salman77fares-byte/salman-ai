import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

// شريط ذكي يظهر عند انقطاع الإنترنت ويختفي تلقائياً عند عودته
export function NetworkBanner() {
  const [online, setOnline] = useState(true);
  const [justBack, setJustBack] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    let t: ReturnType<typeof setTimeout> | undefined;
    const on = () => {
      setOnline(true);
      setJustBack(true);
      t = setTimeout(() => setJustBack(false), 2500);
    };
    const off = () => {
      setOnline(false);
      setJustBack(false);
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      if (t) clearTimeout(t);
    };
  }, []);

  if (online && !justBack) return null;
  return (
    <div
      role="status"
      className={`fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 px-3 pb-1.5 pt-[calc(env(safe-area-inset-top)+6px)] text-xs font-bold ${
        online ? "bg-emerald-600 text-white" : "bg-amber-500 text-slate-950"
      }`}
    >
      {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      {online ? "عاد الاتصال بالإنترنت" : "لا يوجد اتصال بالإنترنت"}
    </div>
  );
}
