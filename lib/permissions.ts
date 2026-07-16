/**
 * Permission catalog for RBAC, derived from the functional requirements in
 * docs/PROYECTO_B_MARKETPLACE.md. RBAC enforcement isn't implemented yet — this
 * is the source of truth both the UI and the future authorization layer
 * (RNF-05) should read from, so the two never drift apart.
 */
export type Role = "guest" | "host";

export type Permission = {
  key: string;
  label: string;
  description: string;
  /** Set when the permission only applies from a later project phase. */
  phase?: string;
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  guest: [
    {
      key: "notifications:view",
      label: "Recuperar las notificaciones del usuario",
      description:
        "Obtiene las notificaciones asociadas al usuario actual que está logueado en la app",
    },
    {
      key: "listings:search",
      label: "Buscar y filtrar alojamientos",
      description: "Buscar listados por ubicación, rango de fechas y precio.",
    },
    {
      key: "listings:view",
      label: "Ver detalle de un listado",
      description:
        "Consultar descripción, fotos y calendario de disponibilidad.",
    },
    {
      key: "bookings:create",
      label: "Reservar un listado",
      description: "Crear una reserva para un rango de fechas disponible.",
    },
    {
      key: "bookings:cancel-own",
      label: "Cancelar su propia reserva",
      description:
        "Cancelar una reserva propia según la política de cancelación del listado.",
    },
    {
      key: "reviews:create",
      label: "Dejar una reseña",
      description: "Calificar (1-5) y comentar una estadía ya finalizada.",
    },
    {
      key: "reviews:list",
      label: "Ver las reseñas de un listing",
      description: "Recuperar el listado de reseñas de un alojamiento o evento",
    },
    {
      key: "bookings:view-own-listings",
      label: "Ver el listado de bookings realizados por el usuario",
      description:
        "Recupera el listado de reservas hechos por el guest, junto con la información de cada listing",
    },
  ],
  host: [
    {
      key: "notifications:view",
      label: "Recuperar las notificaciones del usuario",
      description:
        "Obtiene las notificaciones asociadas al usuario actual que está logueado en la app",
    },
    {
      key: "bookings:manage",
      label: "Acepta o rechaza bookings",
      description:
        "Acepta o rechaza las solicitudes creadas por guests a una de sus listings",
    },
    {
      key: "reviews:list",
      label: "Ver las reseñas de un listing",
      description: "Recuperar el listado de reseñas de un alojamiento o evento",
    },
    {
      key: "listings:create",
      label: "Crear listados",
      description:
        "Publicar un nuevo alojamiento: título, precio, ubicación, capacidad, fotos.",
    },
    {
      key: "listings:manage-own",
      label: "Editar o eliminar sus propios listados",
      description:
        "Modificar o eliminar únicamente los listados de su propiedad.",
    },
    {
      key: "bookings:view-own-listings",
      label: "Ver reservas de sus listados",
      description:
        "Consultar las reservas recibidas sobre los alojamientos que administra.",
    },
    {
      key: "reviews:reply",
      label: "Responder reseñas",
      description:
        "Responder públicamente a una reseña recibida en sus listados.",
    },
    {
      key: "listings:create-extended",
      label: "Crear listados de experiencia o equipamiento",
      description:
        "Publicar listados con atributos propios (duración, idioma, depósito, etc).",
      phase: "Fase 2+",
    },
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  guest: "Guest",
  host: "Host",
};

/**
 * Guest is the baseline for every account (RF-02: host stacks on top of it
 * rather than replacing it), so it's always included.
 */
export function getUserRoles(user: { is_host: boolean }): Role[] {
  const roles: Role[] = ["guest"];
  if (user.is_host) roles.push("host");
  return roles;
}

export function getPermissionsForRoles(roles: Role[]): Permission[] {
  return roles.flatMap((role) => ROLE_PERMISSIONS[role]);
}
