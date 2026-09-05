import { createContext, useContext, type ReactNode } from "react";

const SettingsContext = createContext<() => void>(() => {});

export function SettingsProvider({
  onOpenSettings,
  children,
}: {
  onOpenSettings: () => void;
  children: ReactNode;
}) {
  return <SettingsContext.Provider value={onOpenSettings}>{children}</SettingsContext.Provider>;
}

/** يفتح نافذة الإعدادات الموحّدة من أي مكان داخل الشات. */
export function useOpenSettings() {
  return useContext(SettingsContext);
}
