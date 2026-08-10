import { WithId } from "mongodb";

export type MessageDocument = WithId<{
  chat_id: string;
  sender_id: string;
  timestamp: string;
  body: string;
}>;

export type SerializableMessageDocument = Omit<MessageDocument, "_id"> & {
  _id: string;
};

/**
 * Hasta cuándo un usuario dio por vistos sus mensajes. Es lo único que se
 * persiste del estado de lectura: los no leídos se cuentan como "mensajes
 * posteriores a esta marca que no mandé yo", en vez de guardar un flag por
 * mensaje.
 *
 * Uno por usuario, no por conversación: entrar a la bandeja los da por vistos
 * todos a la vez.
 */
export type MessageReadCursor = {
  user_id: string;
  last_seen_at: string;
};
