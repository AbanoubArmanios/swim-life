/* =============================================================================
 * app.js — Application entry point & router
 * -----------------------------------------------------------------------------
 * Boots the store, renders the home leaderboard, and routes between the home
 * screen, the trainee dashboard and the trainer dashboard. Also registers the
 * service worker so the app works offline as a PWA.
 * ========================================================================== */

const App = (() => {
  const { el, gauge, progressBar, photoOf, toast } = UI;
  let mount; // the #app container

  /* ------------------------------- Boot --------------------------------- */
  async function boot() {
    mount = document.getElementById("app");
    await Store.init();

    // Re-render the home screen automatically when data changes while it is open.
    Store.subscribe(() => {
      if (currentRoute === "home") goHome(false);
    });

    hideSplash();
    goHome();
    registerSW();
  }

  let currentRoute = "home";

  /* ------------------------------ Routing ------------------------------- */
  function goHome(scroll = true) {
    currentRoute = "home";
    renderHome();
    if (scroll) mount.scrollTop = 0;
  }

  function openTrainee(id) {
    currentRoute = "trainee";
    TraineeView.render(id, mount);
  }

  function openTrainer() {
    currentRoute = "trainer";
    TrainerView.render(mount);
  }

  /* --------------------------- Home leaderboard ------------------------- */
  function renderHome() {
    const players = Store.ranked();
    const top = players[0];
    const avg =
      Math.round(
        players.reduce((s, p) => s + Store.overall(p), 0) / players.length
      ) || 0;

    const root = el("div.home");

    /* Header / brand */
    root.append(
      el("header.brand", {}, [
        el("div.brand-left", {}, [
          el("div.logo", {}, [el("span", { text: "🏋" })]),
          el("div", {}, [
            el("div.brand-name", { text: "FITNESS LIFE" }),
            el("div.brand-tag", { text: "BY COACH JOHN KAMEL" }),
          ]),
        ]),
        el("button.btn.trainer-btn", {
          html: "🔒 Trainer Login",
          onClick: () => Auth.loginTrainer(() => openTrainer()),
        }),
      ])
    );

    /* Hero stat strip */
    root.append(
      el("section.stat-strip.glass", {}, [
        stripStat("MEMBERS", players.length, ""),
        stripStat("AVG OVERALL", avg, ""),
        stripStat("TOP MEMBER", top ? top.name.split(" ")[0] : "-", "", true),
      ])
    );

    /* Training pillars — Coach John's method */
    root.append(
      el("div.section-head", {}, [
        el("h2", { text: "Training Pillars" }),
        el("span.muted", { text: "Coach John's method" }),
      ])
    );
    root.append(buildPillars());

    /* Leaderboard heading */
    root.append(
      el("div.section-head", {}, [
        el("h2", { text: "Leaderboard" }),
        el("span.muted", { text: "Tap a card to log in" }),
      ])
    );

    /* Podium (top 3) */
    if (players.length >= 3) {
      root.append(buildPodium(players.slice(0, 3)));
    }

    /* Full ranked grid */
    const grid = el("div.player-grid");
    players.forEach((p, i) => grid.append(playerCard(p, i)));
    root.append(grid);

    root.append(
      el("footer.foot", {}, [
        el("span", { text: "Fitness Life · by Coach John Kamel" }),
      ])
    );

    mount.innerHTML = "";
    mount.append(root);
  }

  /* The six training pillars Coach John builds every program on. */
  const PILLARS = [
    { icon: "🧍", label: "Stability", color: "var(--indigo)" },
    { icon: "🤸", label: "Mobility", color: "var(--amber)" },
    { icon: "🫁", label: "Endurance", color: "var(--green)" },
    { icon: "💪", label: "Strength", color: "var(--primary)" },
    { icon: "🩹", label: "Corrective Exercise", color: "#0ea5e9" },
    { icon: "🔥", label: "Strength & Conditioning", color: "#f43f5e" },
  ];

  function buildPillars() {
    const grid = el("div.pillar-grid");
    PILLARS.forEach((p, i) =>
      grid.append(
        el("div.pillar-card.glass", { style: `animation-delay:${i * 60}ms;--pc:${p.color}` }, [
          el("div.pillar-ico", { text: p.icon }),
          el("div.pillar-label", { text: p.label }),
        ])
      )
    );
    return grid;
  }

  function stripStat(label, value, suffix, highlight) {
    const valNode = el("div.strip-val", { class: highlight ? "hl" : "" });
    if (typeof value === "number") UI.countUp(valNode, value, { suffix });
    else valNode.textContent = value;
    return el("div.strip-item", {}, [
      valNode,
      el("div.strip-label", { text: label }),
    ]);
  }

  /* Podium for top 3 athletes */
  function buildPodium(top3) {
    const order = [top3[1], top3[0], top3[2]]; // 2nd, 1st, 3rd for visual podium
    const classes = ["silver", "gold", "bronze"];
    const podium = el("div.podium");
    order.forEach((p, i) => {
      if (!p) return;
      const place = classes[i];
      podium.append(
        el("button.podium-col", {
          class: place,
          onClick: () => Auth.loginTrainee(p, () => openTrainee(p.id)),
        }, [
          el("div.podium-medal", { text: place === "gold" ? "🥇" : place === "silver" ? "🥈" : "🥉" }),
          el("img.podium-photo", { src: photoOf(p), alt: p.name }),
          el("div.podium-name", { text: p.name.split(" ")[0] }),
          el("div.podium-score", { text: String(Store.overall(p)) }),
          el("div.podium-bar", { class: place }),
        ])
      );
    });
    return podium;
  }

  /* Individual player card */
  function playerCard(p, index) {
    const overall = Store.overall(p);
    const pct = Store.completion(p);

    const card = el("button.player-card.glass", {
      style: `animation-delay:${index * 60}ms`,
      onClick: () => Auth.loginTrainee(p, () => openTrainee(p.id)),
    }, [
      // Rank sits in the flow on the left (dark chip) so it can never
      // collide with the Overall score on the right.
      el("div.pc-top", {}, [
        el("div.pc-rank", { text: "#" + p._rank }),
        el("div.pc-photo-wrap", {}, [
          el("img.pc-photo", { src: photoOf(p), alt: p.name, loading: "lazy" }),
        ]),
        el("div.pc-identity", {}, [
          el("div.pc-name", { text: p.name }),
          el("div.pc-age", { text: `Age ${p.age} · ${p.height}cm · ${p.weight}kg` }),
        ]),
        el("div.pc-overall", {}, [
          el("div.pc-overall-num", { text: String(overall) }),
          el("div.pc-overall-lbl", { text: "OVR" }),
        ]),
      ]),
      el("div.pc-stats", {}, [
        miniStat("STRENGTH", p.strength, "var(--primary)"),
        miniStat("ENDURANCE", p.endurance, "var(--amber)"),
        miniStat("MOBILITY", p.mobility, "var(--indigo)"),
      ]),
      el("div.pc-foot", {}, [
        el("span.pc-lock", { html: "🔒 PIN required" }),
        el("span.pc-prog", { text: pct + "% trained" }),
      ]),
    ]);
    return card;
  }

  function miniStat(label, value, color) {
    return el("div.mini-stat", {}, [
      el("div.mini-head", {}, [
        el("span.mini-label", { text: label }),
        el("span.mini-val", { text: String(value) }),
      ]),
      progressBar(value, { color }),
    ]);
  }

  /* ------------------------------ Splash -------------------------------- */
  function hideSplash() {
    const s = document.getElementById("splash");
    if (s) {
      s.classList.add("hide");
      setTimeout(() => s.remove(), 600);
    }
  }

  /* --------------------------- Service worker --------------------------- */
  function registerSW() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("./service-worker.js")
          .catch((e) => console.warn("SW registration failed", e));
      });
    }
  }

  return { boot, goHome, openTrainee, openTrainer };
})();

document.addEventListener("DOMContentLoaded", () => App.boot());
