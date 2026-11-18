/* =============================================================================
 * store.js — Central application state + derived data
 * -----------------------------------------------------------------------------
 * A minimal observable store. Any part of the UI can subscribe to changes and
 * re-render. Every mutation runs through `save()` which recomputes rankings and
 * persists to IndexedDB automatically (so a reload always restores the data).
 * ========================================================================== */

const Store = (() => {
  let state = null;                 // the live application state
  const listeners = new Set();      // subscribers notified on change

  /**
   * Load state from the DB, seeding it on first run.
   *
   * MIGRATION: earlier versions of this app (the swim build) stored
   * `speed` / `stamina` and text-based workouts. Loading that old state into the
   * gym build produced NaN scores, so any pre-schema-2 state is migrated here:
   *   speed    -> strength
   *   stamina  -> endurance
   *   mobility -> defaulted
   *   workouts -> converted to the table row structure
   */
  async function init() {
    const existing = await DB.get();
    state = existing ? migrate(existing) : buildSeedState();
    await DB.set(state);
    return state;
  }

  const SCHEMA = 3;

  function migrate(s) {
    if (s.schema === SCHEMA) return s;

    // Codes are now 4 digits — shorten any older 6-digit code to its first 4
    // (fresh seeds already use those same 4 digits, so everything stays in sync).
    if (s.trainerPin && String(s.trainerPin).length > 4) {
      s.trainerPin = String(s.trainerPin).slice(0, 4);
    }
    (s.players || []).forEach((p) => {
      if (p.pin && String(p.pin).length > 4) p.pin = String(p.pin).slice(0, 4);
    });

    (s.players || []).forEach((p) => {
      // Stats: carry the old values across, fill in the new one.
      if (p.strength == null) p.strength = Number(p.speed) || 50;
      if (p.endurance == null) p.endurance = Number(p.stamina) || 50;
      if (p.mobility == null) p.mobility = 60;
      delete p.speed;
      delete p.stamina;

      // Workouts: convert old {exercises:[...]} shape into table rows.
      p.workouts = (p.workouts || []).map((w) => {
        if (Array.isArray(w.rows)) return w;
        const rows = (w.exercises || []).map((ex) => ({
          id: "rw_" + Math.random().toString(36).slice(2, 9),
          sets: w.reps || "",
          exercise: ex,
          rest: "",
          tools: "",
          weight: "",
        }));
        return {
          id: w.id,
          title: w.title || "Workout",
          date: w.date || new Date().toISOString().slice(0, 10),
          rows,
          completed: !!w.completed,
          completedDate: w.completedDate || null,
        };
      });

      // Old free-text daily plans are merged into workouts now.
      delete p.dailyPlans;

      // Guarantee the collections the gym build expects.
      p.trainingPlans = p.trainingPlans || [];
      p.monthlyReports = p.monthlyReports || [];
      p.links = p.links || [];
      p.attachments = p.attachments || [];
      p.activity = p.activity || [];
    });

    s.schema = SCHEMA;
    return s;
  }

  /** Subscribe to state changes. Returns an unsubscribe fn. */
  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notify() {
    listeners.forEach((fn) => fn(state));
  }

  /** Persist + notify. Call after any mutation. */
  async function save() {
    state.updatedAt = Date.now();
    await DB.set(state);
    notify();
  }

  /* ---------------------------- Derived getters --------------------------- */

  /** Coerce a stat to a safe number (never NaN, always 0-100). */
  function stat(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  }

  /** Overall score = (strength + endurance + mobility) / 3, rounded. */
  function overall(p) {
    return Math.round((stat(p.strength) + stat(p.endurance) + stat(p.mobility)) / 3);
  }

  /** Sum of the three stats — used as the ranking tie-breaker. */
  function statSum(p) {
    return stat(p.strength) + stat(p.endurance) + stat(p.mobility);
  }

  /** Workout completion percentage for a player. */
  function completion(p) {
    if (!p.workouts || p.workouts.length === 0) return 0;
    const done = p.workouts.filter((w) => w.completed).length;
    return Math.round((done / p.workouts.length) * 100);
  }

  /**
   * Return players sorted by overall score (desc) with a `rank` attached.
   * Rank is derived — never stored — so it is always consistent.
   */
  function ranked() {
    const list = [...state.players].sort((a, b) => {
      const d = overall(b) - overall(a);
      if (d !== 0) return d;
      return statSum(b) - statSum(a);
    });
    list.forEach((p, i) => (p._rank = i + 1));
    return list;
  }

  /** Look up a single player by id. */
  function getPlayer(id) {
    return state.players.find((p) => p.id === id) || null;
  }

  /** Current rank for a specific player id. */
  function rankOf(id) {
    const r = ranked().find((p) => p.id === id);
    return r ? r._rank : "-";
  }

  /* ------------------------------- Mutations ------------------------------ */

  /** Update editable numeric/text fields on a player (trainer only). */
  async function updatePlayer(id, patch) {
    const p = getPlayer(id);
    if (!p) return;
    Object.assign(p, patch);
    await save();
  }

  /** Set (or clear) a player's profile photo. */
  async function setPhoto(id, dataUrl) {
    const p = getPlayer(id);
    if (!p) return;
    p.photo = dataUrl;
    await save();
  }

  /** Toggle a workout's completed flag and log activity. */
  async function toggleWorkout(playerId, workoutId) {
    const p = getPlayer(playerId);
    if (!p) return;
    const w = p.workouts.find((x) => x.id === workoutId);
    if (!w) return;
    w.completed = !w.completed;
    w.completedDate = w.completed ? new Date().toISOString() : null;
    p.activity.unshift({
      text: w.completed
        ? `Completed workout: ${w.title}`
        : `Reopened workout: ${w.title}`,
      date: new Date().toISOString(),
    });
    p.activity = p.activity.slice(0, 20);
    await save();
  }

  /** Create a new trainee (trainer). */
  async function createPlayer(data) {
    const id = "pl_" + Date.now().toString(36);
    state.players.push({
      id,
      name: data.name || "New Trainee",
      age: Number(data.age) || 18,
      height: Number(data.height) || 175,
      weight: Number(data.weight) || 70,
      strength: Number(data.strength) || 50,
      endurance: Number(data.endurance) || 50,
      mobility: Number(data.mobility) || 50,
      pin: data.pin || genPin(),
      photo: null,
      avatarSeed: state.players.length,
      coachNotes: "",
      trainingPlans: [],
      monthlyReports: [],
      workouts: [],
      links: [],
      attachments: [],
      activity: [{ text: "Added to squad", date: new Date().toISOString() }],
    });
    await save();
    return id;
  }

  /** Delete a trainee (trainer). */
  async function deletePlayer(id) {
    state.players = state.players.filter((p) => p.id !== id);
    await save();
  }

  /* --- Nested collection helpers (plans / workouts / links / attachments) - */

  async function addItem(playerId, collection, item) {
    const p = getPlayer(playerId);
    if (!p) return;
    if (!p[collection]) p[collection] = [];
    item.id = collection.slice(0, 2) + "_" + Date.now().toString(36);
    p[collection].push(item);
    await save();
    return item.id;
  }

  async function updateItem(playerId, collection, itemId, patch) {
    const p = getPlayer(playerId);
    if (!p) return;
    const item = (p[collection] || []).find((x) => x.id === itemId);
    if (item) Object.assign(item, patch);
    await save();
  }

  async function removeItem(playerId, collection, itemId) {
    const p = getPlayer(playerId);
    if (!p) return;
    p[collection] = (p[collection] || []).filter((x) => x.id !== itemId);
    await save();
  }

  /** Reset everything back to the demo seed. */
  async function resetDemo() {
    await DB.clear();
    state = buildSeedState();
    await DB.set(state);
    notify();
  }

  /** Generate a unique 4-digit PIN not already used. */
  function genPin() {
    const used = new Set(state.players.map((p) => p.pin));
    used.add(state.trainerPin);
    let pin;
    do {
      pin = String(Math.floor(1000 + Math.random() * 9000));
    } while (used.has(pin));
    return pin;
  }

  /* ------------------------------- Auth ----------------------------------- */

  function verifyPlayerPin(id, pin) {
    const p = getPlayer(id);
    return p && String(p.pin) === String(pin).trim();
  }

  function verifyTrainerPin(pin) {
    return String(state.trainerPin) === String(pin).trim();
  }

  return {
    init, subscribe, save,
    get state() { return state; },
    overall, statSum, completion, ranked, getPlayer, rankOf,
    updatePlayer, setPhoto, toggleWorkout, createPlayer, deletePlayer,
    addItem, updateItem, removeItem, resetDemo, genPin,
    verifyPlayerPin, verifyTrainerPin,
  };
})();
