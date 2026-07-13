// Seed script for notifications collection
// Run with: mongosh mongodb://127.0.0.1:27017 scripts/seed_notifications.js
//
// Loads 20 unread notifications for a single target user.

const DB_NAME = "notificationsdb";
const COLLECTION = "notifications";

const TARGET_ID = "d6ea7318-3f09-49df-80df-bd07b5b9ad9a";
const COUNT = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fakeUUID(seed) {
  const hosts = [
    "a1b2c3d4-0001-0000-0000-000000000001",
    "a1b2c3d4-0002-0000-0000-000000000002",
    "a1b2c3d4-0003-0000-0000-000000000003",
    "a1b2c3d4-0004-0000-0000-000000000004",
    "a1b2c3d4-0005-0000-0000-000000000005",
  ];
  return hosts[seed % hosts.length];
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const TEMPLATES = [
  {
    title: "Reserva confirmada",
    body: "Tu reserva fue confirmada por el anfitrión. ¡Prepará las valijas!",
  },
  {
    title: "Nueva solicitud de reserva",
    body: "Un huésped solicitó reservar tu alojamiento. Revisá los detalles.",
  },
  {
    title: "Reserva cancelada",
    body: "Una de tus reservas fue cancelada. Consultá el detalle en tu panel.",
  },
  {
    title: "Pago recibido",
    body: "Registramos el pago de tu próxima estadía. ¡Gracias!",
  },
  {
    title: "Recordatorio de check-in",
    body: "Tu check-in es en 48 horas. Coordiná el ingreso con el anfitrión.",
  },
  {
    title: "Nueva reseña",
    body: "Recibiste una nueva reseña. Mirá qué opinó tu huésped.",
  },
  {
    title: "Mensaje del anfitrión",
    body: "El anfitrión te envió un mensaje sobre tu próxima reserva.",
  },
  {
    title: "Reserva por vencer",
    body: "Tu estadía termina mañana. No olvides el check-out a horario.",
  },
];

// ---------------------------------------------------------------------------
// Build dataset
// ---------------------------------------------------------------------------

const notifications = Array.from({ length: COUNT }, (_, i) => {
  const t = pick(TEMPLATES);
  return {
    listing_id: `l1000000-0000-0000-0000-00000000${String(randomInt(10, 99))}`,
    host_id: fakeUUID(i),
    guest_id: TARGET_ID,
    booking_id: `b2000000-0000-0000-0000-00000000${String(randomInt(10, 99))}`,
    target_id: TARGET_ID,
    title: t.title,
    body: t.body,
    is_read: false,
  };
});

// ---------------------------------------------------------------------------
// Insert
// ---------------------------------------------------------------------------

const db = db.getSiblingDB(DB_NAME);
db.createCollection(COLLECTION);
db[COLLECTION].createIndex({ target_id: 1, is_read: 1 });

const result = db[COLLECTION].insertMany(notifications);

print(
  `\n✓ Inserted ${result.insertedIds ? Object.keys(result.insertedIds).length : "?"} notifications for target ${TARGET_ID}\n`,
);
