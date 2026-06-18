// Seed script for listings collection
// Run with: mongosh mongodb://127.0.0.1:27017 scripts/seed_listings.js
//
// To target a different database, change DB_NAME below.

const DB_NAME = "listingsdb";
const COLLECTION = "listings";
const IMAGE_URL = "https://dummyimage.com/1200x800/000/fff.png&text=This+is+a+mock+image";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function fakeUUID(seed) {
  // Deterministic fake UUIDs for host references (ties back to PostgreSQL users)
  const hosts = [
    "a1b2c3d4-0001-0000-0000-000000000001",
    "a1b2c3d4-0002-0000-0000-000000000002",
    "a1b2c3d4-0003-0000-0000-000000000003",
    "a1b2c3d4-0004-0000-0000-000000000004",
    "a1b2c3d4-0005-0000-0000-000000000005",
  ];
  return hosts[seed % hosts.length];
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function photos(n) {
  return Array.from({ length: n }, () => IMAGE_URL);
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

const CITIES = [
  { city: "Buenos Aires",  country: "Argentina", lat: -34.6037,  lng: -58.3816  },
  { city: "Córdoba",       country: "Argentina", lat: -31.4201,  lng: -64.1888  },
  { city: "Rosario",       country: "Argentina", lat: -32.9442,  lng: -60.6505  },
  { city: "Mendoza",       country: "Argentina", lat: -32.8908,  lng: -68.8272  },
  { city: "Bariloche",     country: "Argentina", lat: -41.1335,  lng: -71.3103  },
  { city: "Salta",         country: "Argentina", lat: -24.7859,  lng: -65.4116  },
  { city: "Ushuaia",       country: "Argentina", lat: -54.8019,  lng: -68.3030  },
  { city: "Mar del Plata", country: "Argentina", lat: -38.0055,  lng: -57.5426  },
  { city: "Puerto Madryn", country: "Argentina", lat: -42.7692,  lng: -65.0385  },
  { city: "Tucumán",       country: "Argentina", lat: -26.8083,  lng: -65.2176  },
];

const ACCOMMODATION_TITLES = [
  "Departamento luminoso en el centro",
  "Casa con jardín y piscina",
  "Cabaña en el bosque",
  "Loft moderno cerca del río",
  "Suite de lujo con vista panorámica",
  "Estudio acogedor en barrio histórico",
  "Casa de campo con montaña",
  "Apartamento minimalista",
  "Bungalow frente al lago",
  "Penthouse con terraza privada",
  "Casa tradicional restaurada",
  "Habitación privada en casa compartida",
  "Apartamento boutique con diseño de autor",
  "Refugio de montaña",
  "Villa con vineyard propio",
];

const ACCOMMODATION_DESCRIPTIONS = [
  "Espacio ideal para descansar y desconectar. Totalmente equipado y con acceso a todas las comodidades.",
  "Lugar tranquilo rodeado de naturaleza, perfecto para parejas o familias que buscan una escapada.",
  "Diseño contemporáneo con materiales nobles. A minutos de los principales puntos de interés.",
  "Propiedad única con historia. Cada rincón cuenta una historia diferente.",
  "Moderno y funcional, ideal para trabajo remoto o turismo de corta estadía.",
  "Amplio y luminoso, con cocina totalmente equipada y espacio de trabajo.",
  "Vistas impresionantes y acceso directo a senderos y actividades al aire libre.",
];

const AMENITIES = [
  "wifi", "aire_acondicionado", "calefaccion", "cocina", "lavarropas",
  "estacionamiento", "piscina", "parrilla", "jacuzzi", "gimnasio",
  "tv_smart", "balcon", "terraza", "jardín", "mascotas_permitidas",
];

const CHECK_IN_TIMES  = ["12:00", "13:00", "14:00", "15:00", "16:00"];
const CHECK_OUT_TIMES = ["09:00", "10:00", "11:00", "12:00"];

const EXPERIENCE_TITLES = [
  "Tour gastronómico por el mercado local",
  "Trekking guiado en la cordillera",
  "Clase de cocina argentina tradicional",
  "City tour histórico a pie",
  "Avistamiento de fauna patagónica",
  "Clase de tango para principiantes",
  "Paseo en kayak por el lago",
  "Visita a bodega con degustación",
  "Fotografía urbana con guía local",
  "Noche de astronomía en el desierto",
];

const EXPERIENCE_DESCRIPTIONS = [
  "Una experiencia única que combina cultura local, historia y los mejores sabores de la región.",
  "Recorrido guiado por los rincones más auténticos que los turistas habituales no conocen.",
  "Aprende de mano de expertos locales con años de experiencia en su oficio.",
  "Ideal para viajeros curiosos que quieren ir más allá de los circuitos turísticos convencionales.",
];

const LANGUAGES = ["Español", "Inglés", "Portugués", "Español e Inglés"];

const EQUIPMENT_TITLES = [
  "Kit completo de camping",
  "Bicicleta de montaña",
  "Kayak doble con equipamiento",
  "Set de esquí completo",
  "Equipo de snorkel",
  "Tabla de surf con leash",
  "Mochila de trekking 60L",
  "Carpa 4 personas con bolsas de dormir",
  "Equipo de pesca completo",
  "Bicicleta eléctrica urbana",
];

const EQUIPMENT_DESCRIPTIONS = [
  "Equipamiento en excelente estado, revisado y limpio antes de cada alquiler.",
  "Ideal para aventureros que viajan liviano y necesitan equipamiento de calidad.",
  "Incluye instrucciones de uso y guía de seguridad. Depósito reembolsable al devolver.",
  "Perfecto para explorar la región sin necesidad de invertir en equipamiento propio.",
];

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

function makeAccommodation(index) {
  const loc    = pick(CITIES);
  const beds   = randomInt(1, 6);
  const baths  = randomInt(1, 3);
  const guests = beds * 2;

  return {
    type: "accommodation",
    host_id: fakeUUID(index),
    title: pick(ACCOMMODATION_TITLES) + " — " + loc.city,
    description: pick(ACCOMMODATION_DESCRIPTIONS),
    price: randomInt(40, 350),
    location: {
      type: "Point",
      coordinates: [
        loc.lng + (Math.random() - 0.5) * 0.1,
        loc.lat + (Math.random() - 0.5) * 0.1,
      ],
      city: loc.city,
      country: loc.country,
      address: `Calle Falsa ${randomInt(100, 9999)}`,
    },
    attributes: {
      beds,
      bathrooms: baths,
      max_guests: guests,
      check_in_time:  pick(CHECK_IN_TIMES),
      check_out_time: pick(CHECK_OUT_TIMES),
      amenities: pickN(AMENITIES, randomInt(3, 8)),
      minimum_nights: pick([1, 2, 3]),
      property_type: pick(["apartment", "house", "cabin", "loft", "villa"]),
    },
    photos: photos(randomInt(3, 6)),
    rating_avg: null,
    created_at: daysAgo(randomInt(1, 365)),
    updated_at: daysAgo(randomInt(0, 30)),
  };
}

function makeExperience(index) {
  const loc = pick(CITIES);

  return {
    type: "experience",
    host_id: fakeUUID(index),
    title: pick(EXPERIENCE_TITLES) + " en " + loc.city,
    description: pick(EXPERIENCE_DESCRIPTIONS),
    price: randomInt(15, 120),
    location: {
      type: "Point",
      coordinates: [
        loc.lng + (Math.random() - 0.5) * 0.1,
        loc.lat + (Math.random() - 0.5) * 0.1,
      ],
      city: loc.city,
      country: loc.country,
      meeting_point: `Plaza central de ${loc.city}`,
    },
    attributes: {
      duration_minutes: pick([60, 90, 120, 180, 240, 360]),
      language: pick(LANGUAGES),
      max_participants: randomInt(4, 15),
      includes: pickN(
        ["guía profesional", "transporte", "almuerzo", "equipamiento", "seguro", "fotos"],
        randomInt(1, 3),
      ),
      difficulty: pick(["baja", "media", "alta"]),
      min_age: pick([0, 10, 14, 18]),
    },
    photos: photos(randomInt(2, 5)),
    rating_avg: null,
    created_at: daysAgo(randomInt(1, 365)),
    updated_at: daysAgo(randomInt(0, 30)),
  };
}

function makeEquipment(index) {
  const loc = pick(CITIES);

  return {
    type: "equipment",
    host_id: fakeUUID(index),
    title: pick(EQUIPMENT_TITLES),
    description: pick(EQUIPMENT_DESCRIPTIONS),
    price: randomInt(10, 80),
    location: {
      city: loc.city,
      country: loc.country,
      pickup_address: `Depósito ${loc.city}, Calle ${randomInt(100, 999)}`,
    },
    attributes: {
      units_available: randomInt(1, 5),
      deposit: randomInt(50, 300),
      condition: pick(["nuevo", "excelente", "muy bueno", "bueno"]),
      weight_kg: parseFloat((Math.random() * 15 + 0.5).toFixed(1)),
      delivery_available: pick([true, false]),
    },
    photos: photos(randomInt(2, 4)),
    rating_avg: null,
    created_at: daysAgo(randomInt(1, 365)),
    updated_at: daysAgo(randomInt(0, 30)),
  };
}

// ---------------------------------------------------------------------------
// Build dataset: 70 accommodations, 20 experiences, 15 equipment = 105 total
// ---------------------------------------------------------------------------

const listings = [];

for (let i = 0; i < 70; i++)  listings.push(makeAccommodation(i));
for (let i = 0; i < 20; i++)  listings.push(makeExperience(i));
for (let i = 0; i < 15; i++)  listings.push(makeEquipment(i));

// ---------------------------------------------------------------------------
// Insert
// ---------------------------------------------------------------------------

const db = db.getSiblingDB(DB_NAME);
db.createCollection(COLLECTION);

const result = db[COLLECTION].insertMany(listings);

print(`\n✓ Inserted ${result.insertedIds ? Object.keys(result.insertedIds).length : "?"} listings into ${DB_NAME}.${COLLECTION}\n`);
