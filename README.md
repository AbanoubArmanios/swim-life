# 🏋 Fitness Life — by Coach John Kamel

A premium, mobile-first **Progressive Web App (PWA)** for **Coach John Kamel** and his gym
members. Modern fitness theme with an animated gym floor (running, push-ups, pull-ups,
lifting), performance gauges, a live leaderboard, and workouts presented as a clean
training table.

Runs **100% in the browser** — no backend, no server, no database. Deploys to
**GitHub Pages**. All data is stored locally in **IndexedDB** (LocalStorage fallback),
so reloading the browser preserves everything.

---

## 🔑 Login PINs (test credentials)

No usernames, no passwords — only 4-digit PINs.

### Coach

| Role             | PIN      |
| ---------------- | -------- |
| Coach John Kamel | **7001** |

Use the **Trainer Login** button on the home screen for full control.

### Members

Tap a member card on the home screen, then enter that member's PIN.

| # | Member           | PIN    |
| - | ---------------- | ------ |
| 1 | Ahmed Hassan     | **2048** |
| 2 | Mohammed Nour    | **7319** |
| 3 | Youssef Ibrahim  | **4482** |
| 4 | Omar Khaled      | **6153** |
| 5 | Abanoub Maged    | **8901** |
| 6 | Karim Adel       | **3726** |
| 7 | Mostafa Sayed    | **5590** |
| 8 | Seif Ayman       | **1864** |
| 9 | Ziad Fathy       | **6409** |
| 10 | Marwan Tarek    | **9235** |

> A member can **only** upload their photo and mark a workout day complete.
> Everything else is read-only — the coach controls all stats and content.

---

## 🏋 The workout table

A **workout** is a training day (e.g. "Pull 1"). When a member taps a workout day it
opens as the coach's table:

```
#  |  Sets & Reps  |  Exercise  |  Rest  |  Tools  |  Weight
```

- A highlighted **day-banner** row spans the table (e.g. "PULL 1").
- Rows are auto-numbered down the left.
- **Any cell may be left blank** — warm-ups and stretches (e.g. "Dynamic Stretch")
  simply show a dash.
- The **Tools** column accepts free text, including **Arabic notes**
  (e.g. `سرعة بطيئة مشي بس`). Right-to-left text is handled automatically.
- On phones the table **scrolls sideways** so no column gets crushed.

The coach builds workouts in this exact structure: **Trainer Login → Manage → Workout
Days → Add Workout Day**. Each row has the same six fields, rows can be reordered
(↑ / ↓) or deleted, and there's a **Preview** button to see it exactly as the member will.

---

## 📊 Stats & ranking

- Each member has **Strength**, **Endurance** and **Mobility** (0–100).
- **Overall = (Strength + Endurance + Mobility) / 3** — computed live, never stored.
- **Rank** is derived by sorting members by Overall (descending) and updates the moment
  any score changes.
- **Progress %** = completed workout days ÷ total workout days.

---

## 🚀 Deploy to GitHub Pages

1. Create a repo and copy every file from this folder into it (so `index.html` is at the root).
2. Push:
   ```bash
   git init && git add . && git commit -m "Fitness Life"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```
3. **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `/ (root)` → Save.

All paths are relative, so it works from a project sub-path without extra config.

### Run locally

Open `index.html` directly, or serve it (recommended, so the service worker works):

```bash
python3 -m http.server 8080
```

---

## 📁 Folder structure

```
├── index.html            # App shell, splash, animated gym floor
├── manifest.json         # PWA manifest
├── service-worker.js     # Offline caching
├── css/styles.css        # Theme, gym animations, the workout table
├── js/
│   ├── data.js           # Seed members, PINs, gym avatars, workout tables
│   ├── db.js             # IndexedDB wrapper (+ LocalStorage fallback)
│   ├── store.js          # State, Overall, rankings, auto-save
│   ├── ui.js             # Gauges, modals, toasts, the workout table renderer
│   ├── auth.js           # PIN keypad login
│   ├── trainee.js        # Member dashboard (view-only)
│   ├── trainer.js        # Coach dashboard (full CRUD + table builder)
│   └── app.js            # Entry point, router, leaderboard
└── assets/icons/         # PWA icons (dumbbell)
```

Member photos use **generated gym avatars** (headband, hair, tank top) until a real
photo is uploaded.

---

## 🛠️ Customizing

Demo content lives in **`js/data.js`** and seeds only the *first* launch. After that use
the **Coach dashboard** — or click **Reset Demo** to reload the seed.

- **Change the coach PIN:** `const TRAINER_PIN = "700142";` in `js/data.js`.
- **Change stats:** Trainer Login → **Edit Stats**. Overall and rankings recalculate instantly.
- **Add a member:** Trainer Login → **＋ New Member** (a unique PIN is generated).
- **Build a workout:** Trainer Login → **Manage** → **＋ Add Workout Day**.
- **Monthly reports:** Trainer Login → **Manage** → **＋ Add Monthly Report** — write a
  comment, attach photos and a PDF. The member sees them in their dashboard.

---

## 🔒 A note on security

PINs live in client-side code, so this is for **demo / small-gym convenience**, not
high-security use. Anyone with the code can read them. Real protection needs a backend.

Data is also stored **per device** — the coach's edits live in the browser he uses and
won't sync to members' phones. Syncing would require a backend.

---

*Fitness Life · by Coach John Kamel — vanilla HTML5, CSS3 and ES6+ JavaScript. No frameworks, no build step.*
