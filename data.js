/* =============================================================================
 * data.js — Seed data for FITNESS LIFE (by Coach John Kamel)
 * -----------------------------------------------------------------------------
 * Contains the initial demo roster of 10 members, the coach PIN, generated gym
 * character avatars, and the table-structured workouts.
 *
 * A WORKOUT is a training day (e.g. "Pull 1") holding an ordered list of rows.
 * Each row maps 1:1 to the coach's spreadsheet columns:
 *     #  |  Sets & Reps  |  Exercise  |  Rest  |  Tools  |  Weight
 * Any cell may be empty (warm-ups / stretches), and `tools` accepts free text
 * including Arabic notes.
 *
 * This data only seeds the local database on first launch; after that the live
 * state lives in IndexedDB (see db.js / store.js).
 * ========================================================================== */

/** The single coach PIN (4 digits). */
const TRAINER_PIN = "7001";

/* Real photo avatars (realistic gym portraits), one per member by seed.
   A member's uploaded photo still overrides these (see photoOf in ui.js). */
const DEFAULT_AVATARS = [
  "./avatar0.jpg", "./avatar1.jpg", "./avatar2.jpg", "./avatar3.jpg", "./avatar4.jpg",
  "./avatar5.jpg", "./avatar6.jpg", "./avatar7.jpg", "./avatar8.jpg", "./avatar9.jpg",
];

/* ---------------------- Gym character avatar palettes (fallback) ---------- */
const SKIN_TONES = ["#f6cfa5", "#efbd8c", "#e0a878", "#d29b6e", "#b97c4f", "#9c6238", "#7d4b28"];
const HAIR_COLORS = ["#2b2118", "#4a3527", "#1c1c1c", "#5c3b1e", "#31261d", "#0f0f0f"];
const KIT_COLORS = ["#ff5c35", "#ffb020", "#6366f1", "#10b981", "#ef4444", "#0ea5e9", "#f43f5e", "#84cc16", "#8b5cf6", "#f97316"];
const BG_TINTS = ["#fff1ec", "#fff6e6", "#eef0ff", "#e9f9f2", "#ffeeee", "#eaf6ff"];

/**
 * Build a friendly cartoon GYM MEMBER avatar (inline SVG data URI):
 * headband, hair, tank top and a smile — varied by seed so each member is
 * visually distinct. Used until a real photo is uploaded.
 */
function generateAvatar(name, seed = 0) {
  const skin = SKIN_TONES[seed % SKIN_TONES.length];
  const hair = HAIR_COLORS[seed % HAIR_COLORS.length];
  const kit = KIT_COLORS[seed % KIT_COLORS.length];
  const band = KIT_COLORS[(seed + 5) % KIT_COLORS.length];
  const bg = BG_TINTS[seed % BG_TINTS.length];

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="bg${seed}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${bg}"/>
          <stop offset="1" stop-color="#f2f3f6"/>
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="url(#bg${seed})"/>
      <!-- shoulders / tank top -->
      <path d="M40 200 Q100 142 160 200 Z" fill="${kit}"/>
      <!-- tank straps -->
      <path d="M78 158 L86 200" stroke="#ffffff" stroke-width="7" opacity="0.35" fill="none"/>
      <path d="M122 158 L114 200" stroke="#ffffff" stroke-width="7" opacity="0.35" fill="none"/>
      <!-- neck -->
      <rect x="87" y="118" width="26" height="32" rx="12" fill="${skin}"/>
      <!-- head -->
      <circle cx="100" cy="94" r="43" fill="${skin}"/>
      <!-- ears -->
      <circle cx="59" cy="98" r="8" fill="${skin}"/>
      <circle cx="141" cy="98" r="8" fill="${skin}"/>
      <!-- hair -->
      <path d="M57 88 A43 43 0 0 1 143 88 Q143 62 100 58 Q57 62 57 88 Z" fill="${hair}"/>
      <!-- headband -->
      <path d="M57 92 Q100 78 143 92 L143 80 Q100 66 57 80 Z" fill="${band}"/>
      <rect x="57" y="80" width="86" height="13" rx="6" fill="${band}"/>
      <!-- eyes -->
      <circle cx="84" cy="102" r="4.2" fill="#2b2118"/>
      <circle cx="116" cy="102" r="4.2" fill="#2b2118"/>
      <!-- brows -->
      <path d="M77 93 L91 95" stroke="#2b2118" stroke-width="3" stroke-linecap="round"/>
      <path d="M109 95 L123 93" stroke="#2b2118" stroke-width="3" stroke-linecap="round"/>
      <!-- smile -->
      <path d="M88 118 Q100 128 112 118" stroke="#8a4b2a" stroke-width="4" fill="none" stroke-linecap="round"/>
    </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
}

/* ------------------------------ Date helpers ------------------------------ */
function isoOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function monthIso() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Create a workout row.
 * Every field is free text so the coach can leave cells blank (warm-ups) or
 * write notes (including Arabic) in `tools`.
 */
function row(sets, exercise, rest, tools, weight) {
  return {
    id: "rw_" + Math.random().toString(36).slice(2, 9),
    sets: sets || "",
    exercise: exercise || "",
    rest: rest || "",
    tools: tools || "",
    weight: weight || "",
  };
}

/** Create a workout (a training day) holding table rows. */
function makeWorkout(title, date, rows) {
  return {
    id: "wk_" + Math.random().toString(36).slice(2, 9),
    title,                 // day name, shown in the highlighted banner row
    date,                  // YYYY-MM-DD
    rows,                  // ordered table rows
    completed: false,
    completedDate: null,
  };
}

/** The coach's "Pull 1" day, exactly as supplied. */
function pullDay(date) {
  return makeWorkout("Pull 1", date, [
    row("5 min", "Treadmill", "", "سرعة بطيئة مشي بس", ""),
    row("", "Dynamic Stretch", "", "", ""),
    row("3*12", "Lat pull down", "1:30", "Wide grip", "20k"),
    row("3*10", "Seated row", "1:30", "Wide grip", ""),
    row("3*10", "Reverse fly", "1:30", "Machine", "15k"),
    row("3*12", "Seated dumbbell curls", "1min", "Dumbbell", "4k"),
    row("3*12", "Barbell curl", "1min", "Cable", "15k"),
    row("3*45 sec", "Reverse plank", "50sec", "", "body weight"),
    row("20m", "Treadmill", "", "", ""),
    row("", "Static Stretch", "", "", ""),
  ]);
}

/** A push day. */
function pushDay(date) {
  return makeWorkout("Push 1", date, [
    row("5 min", "Treadmill", "", "Warm-up pace", ""),
    row("", "Dynamic Stretch", "", "", ""),
    row("4*10", "Bench press", "1:30", "Barbell", "40k"),
    row("3*12", "Incline dumbbell press", "1:30", "Dumbbell", "12k"),
    row("3*12", "Shoulder press", "1:30", "Machine", "25k"),
    row("3*15", "Lateral raise", "1min", "Dumbbell", "6k"),
    row("3*12", "Triceps pushdown", "1min", "Cable", "20k"),
    row("3*15", "Push ups", "45sec", "", "body weight"),
    row("", "Static Stretch", "", "", ""),
  ]);
}

/** A legs day. */
function legsDay(date) {
  return makeWorkout("Legs 1", date, [
    row("5 min", "Bike", "", "Easy pace", ""),
    row("", "Dynamic Stretch", "", "", ""),
    row("4*10", "Back squat", "2min", "Barbell", "50k"),
    row("3*12", "Leg press", "1:30", "Machine", "80k"),
    row("3*12", "Romanian deadlift", "1:30", "Barbell", "35k"),
    row("3*15", "Leg curl", "1min", "Machine", "25k"),
    row("3*20", "Calf raise", "45sec", "Machine", "30k"),
    row("3*45 sec", "Plank", "50sec", "", "body weight"),
    row("", "Static Stretch", "", "", ""),
  ]);
}

/**
 * The 10 demo members. Each has a unique 6-digit PIN (documented in README).
 * Strength / Endurance / Mobility are 0-100.
 * Overall is derived at runtime = (strength + endurance + mobility) / 3.
 */
const SEED_PLAYERS = [
  { name: "Ahmed Hassan",    age: 24, height: 182, weight: 76, strength: 92, endurance: 88, mobility: 74, pin: "2048" },
  { name: "Mohammed Nour",   age: 21, height: 178, weight: 72, strength: 88, endurance: 90, mobility: 80, pin: "7319" },
  { name: "Youssef Ibrahim", age: 23, height: 175, weight: 70, strength: 85, endurance: 86, mobility: 82, pin: "4482" },
  { name: "Omar Khaled",     age: 26, height: 185, weight: 80, strength: 90, endurance: 79, mobility: 68, pin: "6153" },
  { name: "Abanoub Maged",   age: 22, height: 180, weight: 74, strength: 82, endurance: 84, mobility: 78, pin: "8901" },
  { name: "Karim Adel",      age: 25, height: 183, weight: 78, strength: 79, endurance: 88, mobility: 72, pin: "3726" },
  { name: "Mostafa Sayed",   age: 20, height: 176, weight: 71, strength: 87, endurance: 75, mobility: 76, pin: "5590" },
  { name: "Seif Ayman",      age: 27, height: 188, weight: 84, strength: 74, endurance: 82, mobility: 66, pin: "1864" },
  { name: "Ziad Fathy",      age: 24, height: 179, weight: 73, strength: 80, endurance: 77, mobility: 84, pin: "6409" },
  { name: "Marwan Tarek",    age: 22, height: 181, weight: 75, strength: 76, endurance: 80, mobility: 70, pin: "9235" },
];

/** Produce the full initial state stored in the database on first run. */
function buildSeedState() {
  const players = SEED_PLAYERS.map((p, i) => ({
    id: "pl_" + (i + 1),
    name: p.name,
    age: p.age,
    height: p.height,
    weight: p.weight,
    strength: p.strength,
    endurance: p.endurance,
    mobility: p.mobility,
    pin: p.pin,
    photo: null,
    avatarSeed: i,
    coachNotes:
      "Keep your form strict on every rep — control the negative and don't rush the last set. Log the weights you actually lift so we can progress next week. — Coach John",
    trainingPlans: [
      {
        id: "tp_" + (i + 1),
        title: "Strength Base Block",
        description: "4-week foundation phase building strength and work capacity.",
        instructions:
          "4 gym sessions per week (Pull / Push / Legs / Conditioning). Add 2.5kg when you hit all reps with clean form.",
      },
    ],
    // Workouts = training days, each rendered as the coach's table.
    workouts: [pullDay(isoOffset(0)), pushDay(isoOffset(1)), legsDay(isoOffset(2))],
    monthlyReports: [
      {
        id: "mr_" + (i + 1),
        month: monthIso(),
        comment:
          "Strong month. Your pulling strength is up and your form on the squat is much cleaner. Next focus: mobility work and keeping rest times honest. — Coach John",
        photos: [],
        pdf: null,
      },
    ],
    links: [
      {
        id: "ln_" + (i + 1),
        title: "Deadlift Form Breakdown",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        type: "youtube",
      },
    ],
    attachments: [],
    activity: [{ text: "Joined Coach John's gym", date: new Date().toISOString() }],
  }));

  return { schema: 2, trainerPin: TRAINER_PIN, players, updatedAt: Date.now() };
}
