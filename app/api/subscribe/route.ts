import { authorize } from "@/lib/authorize";
import { getSubscriber } from "@/lib/subscriber";
import { NextResponse } from "next/server";

// SSE necesita el runtime Node (node-redis abre sockets TCP; Edge no puede).
export const runtime = "nodejs";
// Nunca cachear ni bufferear un stream.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // 1. Identidad desde la cookie httpOnly (same-origin → viaja sola en el GET).
  const auth = await authorize("notifications:view");
  if (!auth.ok) {
    const status = auth.code === "UNAUTHORIZED" ? 401 : 403;
    return new NextResponse(auth.error, { status });
  }
  const channel = `notifications:${auth.data.id}`;

  // 2. El subscriber compartido de todo el proceso (una sola conexión a Redis).
  //    Si Redis no responde, devolvemos 503 antes de abrir el stream — el
  //    EventSource reintenta solo.
  let subscriber: Awaited<ReturnType<typeof getSubscriber>>;
  try {
    subscriber = await getSubscriber();
  } catch (error) {
    console.error(
      "[subscribe]: could not reach the notifications broker",
      error,
    );
    return new NextResponse("Notifications channel unavailable", {
      status: 503,
    });
  }

  // 3. Un stream SSE atado a ESTE request (esta pestaña).
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      // Listener scopeado al canal de este usuario. Cada mensaje publicado por
      // el worker en `notifications:<id>` se reenvía como un frame `data:`.
      const onMessage = (message: string) => {
        if (closed) return; // no escribir en un controller ya cerrado
        controller.enqueue(encoder.encode(`data: ${message}\n\n`));
      };

      // Baja: cuando el browser cierra la pestaña / navega, se aborta el
      // request. El runtime ya cierra el controller al cancelar el stream, así
      // que acá SOLO desuscribimos el listener de Redis (nada de close()).
      const cleanup = () => {
        if (closed) return;
        closed = true;
        subscriber.unsubscribe(channel, onMessage).catch(() => {});
      };

      // Frame de apertura / keep-alive (un comentario SSE: línea con ":").
      controller.enqueue(encoder.encode(": connected\n\n"));
      try {
        await subscriber.subscribe(channel, onMessage);
      } catch (error) {
        // Se cayó entre getSubscriber() y el subscribe: cerramos el stream y el
        // browser reintenta.
        console.error("[subscribe]: could not subscribe to the channel", error);
        controller.close();
        return;
      }

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
