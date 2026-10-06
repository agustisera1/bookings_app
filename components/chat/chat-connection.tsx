"use client";

import { useEffect } from "react";
import { getChatSocket } from "@/lib/chat/socket";

// Mounted in the messages layout: the socket is connected exactly while that section is open,
// so leaving it, or signing out, disconnects the session that authenticated it.
export function ChatConnection() {
  useEffect(() => {
    const socket = getChatSocket();
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  return null;
}
