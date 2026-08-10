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
import { isUnreadNudge } from "./notifications-model";

type NotificationsContextValue = {
  count: number;
  messages: number;
  increment: () => void;
  decrement: () => void;
  clearMessages: () => void;
};

// Live unread counters — notifications and messages — over one SSE connection.
// Both are seeded from the server on mount and bumped as frames arrive. They
// live in context because the sidebar badges and the notifications list sit in
// different subtrees than the EventSource, yet all of them read/write these.
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

// Read-only: unread messages, for the badge on the Messages nav item.
export function useUnreadMessagesCount(): number {
  return useNotificationsContext().messages;
}

// Zeroes the messages badge. Its server-side counterpart is `markMessagesAsSeen`
// — this only moves the number the user is looking at.
export function useClearUnreadMessages(): () => void {
  return useNotificationsContext().clearMessages;
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
  initialMessages,
  children,
}: PropsWithChildren<{ initialCount: number; initialMessages: number }>) {
  const [count, setCount] = useState(initialCount);
  const [messages, setMessages] = useState(initialMessages);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);
  const clearMessages = useCallback(() => setMessages(0), []);

  useEffect(() => {
    const es = new EventSource("/api/subscribe");
    es.onmessage = (event) => {
      // A nudge means one unread message; anything else is a freshly-created
      // notification. Each bumps its own badge.
      if (isUnreadNudge(event.data)) setMessages((m) => m + 1);
      else setCount((c) => c + 1);
    };
    return () => es.close(); // baja del lado cliente al desmontar el shell
  }, []);

  const value = useMemo(
    () => ({ count, messages, increment, decrement, clearMessages }),
    [count, messages, increment, decrement, clearMessages],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
