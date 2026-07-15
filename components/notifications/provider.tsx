"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

type NotificationsContextValue = {
  count: number;
  increment: () => void;
  decrement: () => void;
};

// Live unread-notifications count. Seeded from the server on mount, bumped as
// SSE events arrive and dropped as the user reads them. It lives in context
// because the sidebar badge and the notifications list sit in different
// subtrees than the EventSource, yet all three read/write the same value.
const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

function useNotificationsContext(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "Notifications hooks must be used within a NotificationsProvider",
    );
  }
  return ctx;
}

// Read-only: the live unread count for the sidebar badge.
export function useNotificationsCount(): number {
  return useNotificationsContext().count;
}

// Mutators for callers that change the unread count (reading a notification).
// Stable across renders, so they're safe in handlers/effects without churn.
export function useNotificationsActions(): Pick<
  NotificationsContextValue,
  "increment" | "decrement"
> {
  const { increment, decrement } = useNotificationsContext();
  return { increment, decrement };
}

export function NotificationsProvider({
  initialCount,
  children,
}: PropsWithChildren<{ initialCount: number }>) {
  const [count, setCount] = useState(initialCount);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);

  useEffect(() => {
    const es = new EventSource("/api/subscribe");
    // Each SSE frame is one freshly-created (unread) notification → bump by one.
    es.onmessage = () => setCount((c) => c + 1);
    return () => es.close(); // baja del lado cliente al desmontar el shell
  }, []);

  const value = useMemo(
    () => ({ count, increment, decrement }),
    [count, increment, decrement],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
