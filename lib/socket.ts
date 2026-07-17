import { io, Socket } from "socket.io-client";

declare global {
  var chatSocket: Socket | undefined;
}

export function getSocketConnection() {
  if (!globalThis.chatSocket) {
    const url =
      process.env.NEXT_PUBLIC_CHAT_SERVER_URL || "http://localhost:4000";
    const socket = io(url);
    // Handle auth, telemetry, logging here because they don't need cleanup and detach
    socket.on("connect", () =>
      console.info("[getSocketConnection]: socket connected"),
    );
    socket.on("disconnect", () => {
      console.info("[getSocketConnection]: socket disconnected");
    });

    globalThis.chatSocket = socket;
    return socket;
  } else {
    return globalThis.chatSocket;
  }
}
