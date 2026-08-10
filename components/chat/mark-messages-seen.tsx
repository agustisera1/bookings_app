"use client";

import { useEffect } from "react";
import { markMessagesAsSeen } from "@/lib/services/chat";
import { useClearUnreadMessages } from "@/components/notifications/provider";

/**
 * Da por vistos los mensajes al entrar a la bandeja: baja el badge en el acto y
 * corre el cursor del lado server para que el próximo load cuente desde acá.
 *
 * Va montado en el layout, no en una página: así switchear entre conversaciones
 * no lo vuelve a disparar — una visita, un reset. No renderiza nada.
 */
export function MarkMessagesSeen() {
  const clearUnreadMessages = useClearUnreadMessages();

  useEffect(() => {
    clearUnreadMessages();
    void markMessagesAsSeen();
  }, [clearUnreadMessages]);

  return null;
}
