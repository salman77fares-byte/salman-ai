import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type GuestChatContextValue = {
  /** Changes whenever a guest starts a fresh conversation. */
  resetKey: number;
  resetGuestChat: () => void;
};

const GuestChatContext = createContext<GuestChatContextValue>({
  resetKey: 0,
  resetGuestChat: () => {},
});

export function GuestChatProvider({ children }: { children: ReactNode }) {
  const [resetKey, setResetKey] = useState(0);
  const resetGuestChat = useCallback(() => setResetKey((value) => value + 1), []);
  const value = useMemo(() => ({ resetKey, resetGuestChat }), [resetKey, resetGuestChat]);
  return <GuestChatContext.Provider value={value}>{children}</GuestChatContext.Provider>;
}

export function useGuestChat() {
  return useContext(GuestChatContext);
}

const NewChatContext = createContext<() => void>(() => {});

/** Exposes the layout's "new chat" action to nested chat screens. */
export function NewChatProvider({
  onNewChat,
  children,
}: {
  onNewChat: () => void;
  children: ReactNode;
}) {
  return <NewChatContext.Provider value={onNewChat}>{children}</NewChatContext.Provider>;
}

export function useNewChat() {
  return useContext(NewChatContext);
}
