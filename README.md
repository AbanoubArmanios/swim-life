# 🏊 Swim Life — by Coach John Kamel

A premium, mobile-first **Progressive Web App (PWA)** for **Coach John Kamel** and his
swimmers. Bright pool-water theme with blue/aqua accents, glassmorphism cards, animated
water background, circular performance gauges and a live leaderboard.

Runs **100% in the browser** — no backend, no server, no database, no Firebase.
Deploys directly to **GitHub Pages**. All data is stored locally in **IndexedDB**
(with a LocalStorage fallback), so reloading the browser preserves everything.

---

## 🔑 Login PINs (test credentials)

There are **no usernames and no passwords** — only 6-digit PINs.

### Trainer PIN

| Role             | PIN      |
| ---------------- | -------- |
| Coach John Kamel | **700142** |

Use the **🔒 Trainer Login** button on the home screen, then enter the PIN above
for full control (edit stats, create/delete swimmers, manage swim sets & media).

### Trainee PINs

Tap a player card on the home screen, then enter that athlete's PIN.

| # | Swimmer          | PIN      |
| - | ---------------- | -------- |
| 1 | Ahmed Hassan     | **204815** |
| 2 | Mohammed Nour    | **731960** |
| 3 | Youssef Ibrahim  | **448209** |
| 4 | Omar Khaled      | **615372** |
| 5 | Abanoub Maged    | **890134** |
| 6 | Karim Adel       | **372641** |
| 7 | Mostafa Sayed    | **559028** |
| 8 | Seif Ayman       | **186473** |
| 9 | Ziad Fathy       | **640917** |
| 10 | Marwan Tarek    | **923506** |

> A trainee can **only** upload/replace their photo and mark workouts complete.
> Everything else is read-only. The trainer controls all stats and content.

---

## 🚀 Deploy to GitHub Pages

1. Create a new GitHub repository (e.g. `swim-life`).
2. Copy every file from this `trainer-dashboard` folder into the repo root
   (so `index.html` sits at the top level).
3. Commit and push:
   ```bash
   git init
   git add .
   git commit -m "APEX Performance PWA"
   git branch -M main
   git remote add origin https://github.com/<your-username>/swim-life.git
   git push -u origin main
   ```
4. On GitHub: **Settings → Pages → Build and deployment**.
   - Source: **Deploy from a branch**
   - Branch: **main** / **/ (root)** → **Save**
5. Wait ~1 minute, then open:
   `https://<your-username>.github.io/swim-life/`

Because all paths are **relative** (`./js/...`, `./assets/...`), it works in a
project sub-path without any extra configuration. On mobile, use the browser's
**“Add to Home Screen”** to install it as a full-screen app.

### Run locally

Open `index.html` directly, or serve it (recommended so the service worker works):

```bash
# Python
python3 -m http.server 8080
# then visit http://localhost:8080
```

---

## 📁 Folder structure

```
trainer-dashboard/
├── index.html            # App shell + splash + script order
├── manifest.json         # PWA manifest (installable app)
├── service-worker.js     # Offline caching (cache-first app shell)
├── README.md             # This file
├── css/
│   └── styles.css        # All styling (theme, glass, gauges, animations)
├── js/
│   ├── data.js           # Seed data: 10 trainees, PINs, avatar generator
│   ├── db.js             # IndexedDB wrapper (+ LocalStorage fallback)
│   ├── store.js          # State, rankings, mutations, auto-save
│   ├── ui.js             # Reusable UI: gauges, modals, toasts, counters
│   ├── auth.js           # PIN keypad login (trainee + trainer)
│   ├── trainee.js        # Athlete dashboard (view-only)
│   ├── trainer.js        # Trainer dashboard (full CRUD)
│   └── app.js            # Entry point, router, home leaderboard
└── assets/
    └── icons/            # PWA icons (192, 512, maskable, svg)
```

Profile photos use **generated SVG avatars** by default (initials + gradient),
so no binary image files are needed. Uploaded photos are stored as base64 in
IndexedDB.

---

## 🧮 How scoring & ranking work

- **Overall = (Speed + Stamina) / 2** — computed live, never stored.
- **Rank** is derived by sorting all trainees by Overall (descending). It updates
  automatically the moment any score changes — nothing to recalculate by hand.
- **Workout completion %** = completed workouts ÷ total workouts.

---

## 🛠️ Customizing the app

All demo content lives in **`js/data.js`**. Edits there only affect the *first*
launch (before data is saved). After that, use the **Trainer dashboard** to make
changes live — or click **Reset Demo** in the trainer view to reload the seed.

### Change the trainer PIN

In `js/data.js`:

```js
const TRAINER_PIN = "700142"; // ← change to any 6-digit code
```

### Change a trainee's scores / details

Two ways:

1. **In-app (recommended):** Trainer Login → **Edit Stats** on any card. Overall
   and rankings recalculate instantly.
2. **In code:** edit the `SEED_PLAYERS` array in `js/data.js`, then Reset Demo:

```js
{
  name: "Marcus Vann", age: 24, height: 182, weight: 76,
  speed: 92, stamina: 88, pin: "204815",
},
```

### Add more trainees

- **In-app:** Trainer Login → **＋ New Trainee** (a unique PIN is generated for you).
- **In code:** add another object to `SEED_PLAYERS` in `js/data.js` with a unique
  6-digit `pin`, then Reset Demo.

### Change rankings

Rankings are automatic — you don't set them directly. Adjust a trainee's **Speed**
or **Stamina** and the leaderboard re-sorts itself. (Speed then stamina totals are
used as a tie-breaker.)

### Assign daily plans, monthly reports, workouts, notes, links & attachments

Trainer Login → **Manage** on any card. From there you can add/edit/delete:

- **Daily plans** — a day-by-day plan with a date, focus and details. Each swimmer
  sees these in a **Daily Plan** panel on their own dashboard, with **today's** plan
  highlighted automatically.
- **Monthly reports** — pick a month, write a **comment**, attach **photos** and a
  **PDF**. The swimmer sees these in a **Monthly Reports** panel (photos open full-size,
  the PDF is downloadable).
- **Workouts** (title, description, exercises, duration, reps, date)
- **Training plans** (title, description, instructions)
- **Coach notes**
- **Links** (YouTube — auto-embeds — external URLs, or PDF links)
- **Attachments** (upload PDF or image files, stored locally)

Everything assigned to a swimmer appears **only** inside that swimmer's dashboard.

---

## ✨ Features

- Bright pool-water theme with animated water background and blue/aqua accents
- Animated leaderboard with **top-3 podium** and auto-sorting swimmer cards
- Circular **performance gauges** and animated progress bars
- **PIN keypad** login with animated error shake (no accounts)
- **Trainee dashboard** (view-only + photo upload + workout completion)
- **Trainer dashboard** (full CRUD over trainees, stats, plans, media)
- **IndexedDB** persistence with auto-save (survives reloads & offline use)
- Installable **PWA** with offline app-shell caching
- Count-up number animations, smooth modal & page transitions
- Fully responsive, mobile-first, `prefers-reduced-motion` friendly

---

## 🔒 A note on security

PINs are stored in client-side code and local storage, so this is intended for
**demo / small-team convenience**, not high-security use. Anyone with the code
can read the PINs. For real-world sensitive data you would add a real backend.

---

*Swim Life · by Coach John Kamel — built with vanilla HTML5, CSS3 and ES6+ JavaScript, no frameworks, no build step.*
