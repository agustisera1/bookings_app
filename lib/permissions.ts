/**
 * Permission catalog for RBAC, derived from the functional requirements in
 * proyecto-b-marketplace.md. RBAC enforcement isn't implemented yet — this
 * is the source of truth both the UI and the future authorization layer
 * (RNF-05) should read from, so the two never drift apart.
 */
export type Role = "guest" | "host" | "admin";

export type Permission = {
  key: string;
  label: string;
  description: string;
  /** Requirement this permission traces back to, e.g. "RF-08". */
  ref: string;
  /** Set when the permission only applies from a later project phase. */
  phase?: string;
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  guest: [
    {
      key: "listings:search",
      label: "Buscar y filtrar alojamientos",
      description: "Buscar listados por ubicación, rango de fechas y precio.",
      ref: "RF-07",
    },
    {
      key: "listings:view",
      label: "Ver detalle de un listado",
      description:
        "Consultar descripción, fotos y calendario de disponibilidad.",
      ref: "RF-06",
    },
    {
      key: "bookings:create",
      label: "Reservar un listado",
      description: "Crear una reserva para un rango de fechas disponible.",
      ref: "RF-08",
    },
    {
      key: "bookings:cancel-own",
      label: "Cancelar su propia reserva",
      description:
        "Cancelar una reserva propia según la política de cancelación del listado.",
      ref: "RF-11",
    },
    {
      key: "reviews:create",
      label: "Dejar una reseña",
      description: "Calificar (1-5) y comentar una estadía ya finalizada.",
      ref: "RF-12",
    },
    {
      key: "reviews:list",
      label: "Ver las reseñas de un listing",
      description: "Recuperar el listado de reseñas de un alojamiento o evento",
      ref: "RF-XX",
    },
  ],
  host: [
    {
      key: "reviews:list",
      label: "Ver las reseñas de un listing",
      description: "Recuperar el listado de reseñas de un alojamiento o evento",
      ref: "RF-XX",
    },
    {
      key: "listings:create",
      label: "Crear listados",
      description:
        "Publicar un nuevo alojamiento: título, precio, ubicación, capacidad, fotos.",
      ref: "RF-04",
    },
    {
      key: "listings:manage-own",
      label: "Editar o eliminar sus propios listados",
      description:
        "Modificar o eliminar únicamente los listados de su propiedad.",
      ref: "RF-05",
    },
    {
      key: "bookings:view-own-listings",
      label: "Ver reservas de sus listados",
      description:
        "Consultar las reservas recibidas sobre los alojamientos que administra.",
      ref: "RF-10",
    },
    {
      key: "reviews:reply",
      label: "Responder reseñas",
      description:
        "Responder públicamente a una reseña recibida en sus listados.",
      ref: "RF-13",
    },
    {
      key: "listings:create-extended",
      label: "Crear listados de experiencia o equipamiento",
      description:
        "Publicar listados con atributos propios (duración, idioma, depósito, etc).",
      ref: "RF-14",
      phase: "Fase 2+",
    },
  ],
  admin: [
    {
      key: "admin:panel",
      label: "Acceder al panel de administración",
      description:
        "Entrar a la sección administrativa, restringida al rol admin.",
      ref: "RF-03",
    },
    {
      key: "admin:moderate-content",
      label: "Moderar contenido",
      description:
        "Revisar, ocultar o eliminar listados y reseñas que infrinjan las normas.",
      ref: "RNF-05",
    },
    {
      key: "admin:manage-disputes",
      label: "Gestionar disputas",
      description:
        "Mediar y resolver disputas entre guests y hosts sobre una reserva.",
      ref: "RNF-05",
    },
    {
      key: "admin:global-metrics",
      label: "Acceder a métricas globales",
      description:
        "Ver indicadores agregados de toda la plataforma (reservas, listados, usuarios).",
      ref: "RF-03",
    },
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  guest: "Guest",
  host: "Host",
  admin: "Admin",
};

/**
 * Guest is the baseline for every account (RF-02: host/admin stack on top
 * of it rather than replacing it), so it's always included.
 */
export function getUserRoles(user: {
  is_host: boolean;
  is_admin: boolean;
}): Role[] {
  const roles: Role[] = ["guest"];
  if (user.is_host) roles.push("host");
  if (user.is_admin) roles.push("admin");
  return roles;
}

export function getPermissionsForRoles(roles: Role[]): Permission[] {
  return roles.flatMap((role) => ROLE_PERMISSIONS[role]);
}
