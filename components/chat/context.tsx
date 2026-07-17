"use client";

import { createContext, PropsWithChildren, useContext } from "react";
import { useSocket } from "./use-booking-chat";
import { Socket } from "socket.io-client";

const SocketContext = createContext<{ socket: Socket | null }>({
  socket: null,
});

export const SocketProvider = ({ children }: PropsWithChildren) => {
  const { socket } = useSocket();

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context)
    // Don't throw error because it's not critical
    console.warn(
      "[useSocketContext]: socket instance not available, must be used within a SocketProvider",
    );
  return {
    socket: context.socket,
  };
}
