/* =============================================================================
 * data.js — Seed data for APEX Performance
 * -----------------------------------------------------------------------------
 * Contains the initial demo roster of 10 trainees, the trainer PIN, and helper
 * utilities used to bootstrap the application the very first time it runs.
 *
 * IMPORTANT: This data is only used to seed the local database on first launch.
 * After that, the live state lives in IndexedDB (see db.js / store.js) so any
 * edits the trainer makes persist across reloads.
 * ========================================================================== */

/**
 * The single trainer PIN. Change this to whatever you like.
 * (Also documented in README.md so it is easy to find.)
 */
const TRAINER_PIN = "700142";

/**
 * A small palette used to generate colourful, deterministic avatar gradients
 * for trainees who have not uploaded a real photo yet.
 */
/* Character-avatar palettes — varied so every swimmer looks distinct. */
const SKIN_TONES = ["#f6cfa5", "#efbd8c", "#e0a878", "#d29b6e", "#b97c4f", "#9c6238", "#7d4b28"];
const CAP_COLORS = ["#ff6f61", "#12b3c6", "#ffb703", "#7b61ff", "#2ec4b6", "#e84393", "#ff924c", "#0ea5e9", "#22c55e", "#f43f5e"];
const BG_TINTS = ["#eafaf6", "#fef3ec", "#eef6ff", "#f6f0ff", "#eafcff", "#fdeef5"];

/**
 * Build a friendly cartoon SWIMMER character avatar (inline SVG data URI):
 * skin tone, swim cap, goggles and a smile — all varied by seed so each
 * athlete is visually unique. Used until a real photo is uploaded.
 * @param {string} name  Full name (used only for the aria/title).
 * @param {number} seed  Index driving the colour combination.
 * @returns {string} data:image/svg+xml URI.
 */
function generateAvatar(name, seed = 0) {
  const skin = SKIN_TONES[seed % SKIN_TONES.length];
  const cap = CAP_COLORS[seed % CAP_COLORS.length];
  const suit = CAP_COLORS[(seed + 4) % CAP_COLORS.length];
  const bg = BG_TINTS[seed % BG_TINTS.length];
  const lens = "#cdeffd";
  const strap = "#0c3a49";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="bg${seed}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${bg}"/>
          <stop offset="1" stop-color="#dff3f8"/>
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="url(#bg${seed})"/>
      <!-- shoulders / swimsuit -->
      <path d="M46 200 Q100 146 154 200 Z" fill="${suit}"/>
      <path d="M46 200 Q100 146 154 200" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="2"/>
      <!-- neck -->
      <rect x="87" y="118" width="26" height="30" rx="12" fill="${skin}"/>
      <!-- head -->
      <circle cx="100" cy="94" r="43" fill="${skin}"/>
      <!-- ears -->
      <circle cx="59" cy="96" r="8" fill="${skin}"/>
      <circle cx="141" cy="96" r="8" fill="${skin}"/>
      <!-- swim cap -->
      <path d="M57 94 A43 43 0 0 1 143 94 Q143 70 100 62 Q57 70 57 94 Z" fill="${cap}"/>
      <ellipse cx="84" cy="76" rx="15" ry="6" fill="#ffffff" opacity="0.35"/>
      <!-- goggle strap -->
      <path d="M58 96 Q100 104 142 96" stroke="${strap}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <!-- goggles -->
      <rect x="68" y="94" width="26" height="19" rx="9" fill="${lens}" stroke="${strap}" stroke-width="3"/>
      <rect x="106" y="94" width="26" height="19" rx="9" fill="${lens}" stroke="${strap}" stroke-width="3"/>
      <ellipse cx="75" cy="100" rx="4" ry="3" fill="#ffffff" opacity="0.8"/>
      <ellipse cx="113" cy="100" rx="4" ry="3" fill="#ffffff" opacity="0.8"/>
      <!-- smile -->
      <path d="M88 124 Q100 134 112 124" stroke="#8a4b2a" stroke-width="4" fill="none" stroke-linecap="round"/>
    </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
}

/** ISO date string (YYYY-MM-DD) offset by `days` from today. */
function isoOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Current month string (YYYY-MM). */
function monthIso() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Create a fresh workout object.
 */
function makeWorkout(title, description, exercises, duration, reps) {
  return {
    id: "wk_" + Math.random().toString(36).slice(2, 9),
    title,
    description,
    exercises,          // array of strings
    duration,           // e.g. "45 min"
    reps,               // e.g. "4 x 12"
    completed: false,
    completedDate: null,
    date: new Date().toISOString().slice(0, 10),
  };
}

/**
 * The 10 demo trainees. Each has a unique 6-digit PIN (documented in README).
 * Speed and Stamina are 0-100. Overall is derived at runtime = (speed+stamina)/2.
 */
const SEED_PLAYERS = [
  {
    name: "Ahmed Hassan", age: 24, height: 182, weight: 76,
    speed: 92, stamina: 88, pin: "204815",
  },
  {
    name: "Mohammed Nour", age: 21, height: 178, weight: 72,
    speed: 88, stamina: 90, pin: "731960",
  },
  {
    name: "Youssef Ibrahim", age: 23, height: 175, weight: 70,
    speed: 85, stamina: 86, pin: "448209",
  },
  {
    name: "Omar Khaled", age: 26, height: 185, weight: 80,
    speed: 90, stamina: 79, pin: "615372",
  },
  {
    name: "Abanoub Maged", age: 22, height: 180, weight: 74,
    speed: 82, stamina: 84, pin: "890134",
  },
  {
    name: "Karim Adel", age: 25, height: 183, weight: 78,
    speed: 79, stamina: 88, pin: "372641",
  },
  {
    name: "Mostafa Sayed", age: 20, height: 176, weight: 71,
    speed: 87, stamina: 75, pin: "559028",
  },
  {
    name: "Seif Ayman", age: 27, height: 188, weight: 84,
    speed: 74, stamina: 82, pin: "186473",
  },
  {
    name: "Ziad Fathy", age: 24, height: 179, weight: 73,
    speed: 80, stamina: 77, pin: "640917",
  },
  {
    name: "Marwan Tarek", age: 22, height: 181, weight: 75,
    speed: 76, stamina: 80, pin: "923506",
  },
];

/**
 * Produce the full initial state object stored in the database on first run.
 */
function buildSeedState() {
  const players = SEED_PLAYERS.map((p, i) => ({
    id: "pl_" + (i + 1),
    name: p.name,
    age: p.age,
    height: p.height,
    weight: p.weight,
    speed: p.speed,
    stamina: p.stamina,
    pin: p.pin,
    photo: null,                    // base64 photo once uploaded, else null
    avatarSeed: i,                  // for the generated placeholder
    coachNotes:
      "Keep your streamline tight off every wall and breathe bilaterally on the freestyle sets. Focus on a high elbow catch and long, relaxed strokes. Hydrate well between sets. — Coach John",
    trainingPlans: [
      {
        id: "tp_" + (i + 1),
        title: "Base Endurance Block",
        description:
          "4-week aerobic foundation phase building freestyle endurance and stroke efficiency.",
        instructions:
          "4 pool sessions per week. Log your average 100m pace after each main set and note stroke count per length.",
      },
    ],
    workouts: [
      makeWorkout(
        "Sprint & Starts",
        "Explosive short-distance work for top-end speed and reactive starts.",
        ["400m easy warm-up", "8 x 25m sprint freestyle", "Dive start practice", "200m cooldown"],
        "60 min",
        "8 x 25m",
      ),
      makeWorkout(
        "Aerobic Endurance Set",
        "Steady long-distance freestyle to build stamina and pacing.",
        ["300m warm-up", "10 x 100m freestyle on 1:45", "200m kick", "100m cooldown"],
        "75 min",
        "10 x 100m",
      ),
      makeWorkout(
        "Technique & IM Drills",
        "Stroke-refinement drills across all four strokes plus dryland core.",
        ["Catch-up drill", "Fingertip drag", "Fist swim", "IM 4 x 50m", "Plank & core dryland"],
        "55 min",
        "4 x 50m IM",
      ),
    ],
    // Day-by-day plan the coach sets — the athlete sees these in their dashboard.
    dailyPlans: [
      {
        id: "dp_" + (i + 1) + "_1",
        date: isoOffset(0),
        title: "Freestyle Speed Session",
        focus: "Speed",
        content:
          "Warm-up 400m easy. Main set: 8 x 50m sprint freestyle on 1:10 with fast turns. 200m cooldown. Keep your streamline tight off every wall.",
      },
      {
        id: "dp_" + (i + 1) + "_2",
        date: isoOffset(1),
        title: "Endurance & Kick",
        focus: "Stamina",
        content:
          "Warm-up 300m. Main set: 6 x 200m freestyle steady pace. 8 x 50m kick with board. 100m cooldown. Breathe bilaterally throughout.",
      },
      {
        id: "dp_" + (i + 1) + "_3",
        date: isoOffset(2),
        title: "Technique & Recovery",
        focus: "Technique",
        content:
          "Drills: catch-up, fingertip drag, single-arm freestyle. 4 x 100m IM easy. Finish with 10 min mobility and stretching.",
      },
    ],
    // Monthly reports the coach posts (comment + optional photos + PDF).
    monthlyReports: [
      {
        id: "mr_" + (i + 1),
        month: monthIso(),
        comment:
          "Strong, consistent month. Your 100m freestyle pace improved and your turns are noticeably sharper. Next focus: bilateral breathing and core stability during long sets. — Coach John",
        photos: [],
        pdf: null,
      },
    ],
    links: [
      {
        id: "ln_" + (i + 1),
        title: "Freestyle Technique Breakdown",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        type: "youtube",
      },
    ],
    attachments: [],                // {id,name,type,dataUrl}
    activity: [
      { text: "Joined Coach John's swim squad", date: new Date().toISOString() },
    ],
  }));

  return { trainerPin: TRAINER_PIN, players, updatedAt: Date.now() };
}
