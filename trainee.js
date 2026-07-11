/* =============================================================================
 * trainee.js — Trainee (athlete) dashboard — VIEW ONLY
 * -----------------------------------------------------------------------------
 * The athlete can ONLY:
 *   - upload / change their profile photo
 *   - mark workouts complete
 * Everything else (age, height, weight, speed, stamina, rank, plans, notes,
 * links, attachments) is read-only. Those are controlled by the trainer.
 * ========================================================================== */

const TraineeView = (() => {
  const { el, gauge, progressBar, toast, esc, photoOf, youtubeEmbed, modal } = UI;

  function render(playerId, mount) {
    const p = Store.getPlayer(playerId);
    if (!p) return App.goHome();

    const overall = Store.overall(p);
    const rank = Store.rankOf(p.id);
    const pct = Store.completion(p);

    const root = el("div.dash");

    /* ------------------------------ Top bar ------------------------------ */
    root.append(
      el("div.dash-topbar", {}, [
        el("button.btn.ghost", {
          html: "&larr; Squad",
          onClick: () => App.goHome(),
        }),
        el("div.badge.athlete", { text: "ATHLETE" }),
      ])
    );

    /* ------------------------------ Hero --------------------------------- */
    const photoWrap = el("div.hero-photo", {}, [
      el("img", { src: photoOf(p), alt: p.name }),
      el("button.photo-edit", {
        title: "Change photo",
        html: "📷",
        onClick: async () => {
          const data = await UI.pickImage();
          if (data) {
            await Store.setPhoto(p.id, data);
            toast("Profile photo updated", "success");
            render(playerId, mount);
          }
        },
      }),
    ]);

    const hero = el("div.hero.glass", {}, [
      photoWrap,
      el("div.hero-info", {}, [
        el("div.hero-rank", { html: `#${rank} <span>RANK</span>` }),
        el("h1.hero-name", { text: p.name }),
        el("div.hero-meta", {}, [
          metaPill("Age", p.age),
          metaPill("Height", p.height + " cm"),
          metaPill("Weight", p.weight + " kg"),
        ]),
        el("div.hero-overall", {}, [
          el("div.hero-overall-num", { text: String(overall) }),
          el("div.hero-overall-label", { text: "OVERALL" }),
        ]),
      ]),
    ]);
    root.append(hero);

    /* ----------------------------- Gauges -------------------------------- */
    root.append(
      el("div.gauge-row.glass", {}, [
        el("div.gauge-cell", {}, [
          gauge(p.speed, { label: "SPEED", color: "var(--neon)" }),
        ]),
        el("div.gauge-cell", {}, [
          gauge(p.stamina, { label: "STAMINA", color: "var(--neon-2)" }),
        ]),
        el("div.gauge-cell", {}, [
          gauge(overall, { label: "OVERALL", color: "var(--gold)" }),
        ]),
      ])
    );

    /* -------------------------- Progress panel --------------------------- */
    const progressPanel = el("div.panel.glass", {}, [
      el("div.panel-head", {}, [
        el("h2", { text: "Training Progress" }),
        el("div.pct-chip", { text: pct + "%" }),
      ]),
      progressBar(pct, { color: "var(--neon)" }),
      el("div.panel-sub", {
        text: `${p.workouts.filter((w) => w.completed).length} of ${
          p.workouts.length
        } workouts completed`,
      }),
    ]);
    root.append(progressPanel);

    /* --------------------------- Daily plan ------------------------------ */
    if (p.dailyPlans && p.dailyPlans.length) {
      const today = new Date().toISOString().slice(0, 10);
      const sorted = [...p.dailyPlans].sort((a, b) => a.date.localeCompare(b.date));
      const list = el("div.daily-list");
      sorted.forEach((dp) => {
        const isToday = dp.date === today;
        list.append(
          el("div.daily-card", { class: isToday ? "today" : "" }, [
            el("div.daily-side", {}, [
              el("div.daily-dow", { text: fmtDow(dp.date) }),
              el("div.daily-dnum", { text: fmtDayNum(dp.date) }),
              isToday ? el("div.today-chip", { text: "TODAY" }) : null,
            ]),
            el("div.daily-body", {}, [
              el("div.daily-title-row", {}, [
                el("span.daily-title", { text: dp.title }),
                dp.focus ? el("span.tag.focus", { text: dp.focus }) : null,
              ]),
              el("div.daily-content", { text: dp.content }),
            ]),
          ])
        );
      });
      root.append(
        el("div.panel.glass", {}, [
          el("div.panel-head", {}, [
            el("h2", { text: "Daily Plan" }),
            el("span.muted", { text: "Set by Coach John" }),
          ]),
          list,
        ])
      );
    }

    /* ---------------------------- Workouts ------------------------------- */
    const workoutList = el("div.wk-list");
    p.workouts.forEach((w) => workoutList.append(workoutCard(p, w, () => render(playerId, mount))));
    root.append(
      el("div.panel.glass", {}, [
        el("div.panel-head", {}, [el("h2", { text: "Swim Sets" })]),
        p.workouts.length
          ? workoutList
          : el("div.empty", { text: "No swim sets assigned yet." }),
      ])
    );

    /* ------------------------- Training plans ---------------------------- */
    if (p.trainingPlans && p.trainingPlans.length) {
      const plans = el("div.plan-list");
      p.trainingPlans.forEach((pl) =>
        plans.append(
          el("div.plan-card", {}, [
            el("h3", { text: pl.title }),
            el("p", { text: pl.description }),
            pl.instructions
              ? el("div.plan-instr", { html: "<b>Instructions:</b> " + esc(pl.instructions) })
              : null,
          ])
        )
      );
      root.append(
        el("div.panel.glass", {}, [
          el("div.panel-head", {}, [el("h2", { text: "Training Plans" })]),
          plans,
        ])
      );
    }

    /* --------------------------- Coach notes ----------------------------- */
    if (p.coachNotes) {
      root.append(
        el("div.panel.glass", {}, [
          el("div.panel-head", {}, [el("h2", { text: "Coach Notes" })]),
          el("div.notes", { text: p.coachNotes }),
        ])
      );
    }

    /* -------------------------- Monthly reports -------------------------- */
    if (p.monthlyReports && p.monthlyReports.length) {
      const reports = [...p.monthlyReports].sort((a, b) =>
        b.month.localeCompare(a.month)
      );
      const wrap = el("div.report-list");
      reports.forEach((r) => {
        const card = el("div.report-card", {}, [
          el("div.report-month", { text: fmtMonth(r.month) }),
          r.comment ? el("div.report-comment", { text: r.comment }) : null,
        ]);
        if (r.photos && r.photos.length) {
          const gal = el("div.report-gallery");
          r.photos.forEach((src) =>
            gal.append(
              el("a.report-photo", { href: src, target: "_blank", rel: "noopener" }, [
                el("img", { src, loading: "lazy", alt: "Report photo" }),
              ])
            )
          );
          card.append(gal);
        }
        if (r.pdf) {
          card.append(
            el("a.report-pdf", {
              href: r.pdf.dataUrl,
              download: r.pdf.name,
              target: "_blank",
            }, [
              el("span.report-pdf-ico", { text: "📄" }),
              el("span", { text: r.pdf.name }),
              el("span.report-pdf-dl", { text: "Download" }),
            ])
          );
        }
        wrap.append(card);
      });
      root.append(
        el("div.panel.glass", {}, [
          el("div.panel-head", {}, [
            el("h2", { text: "Monthly Reports" }),
            el("span.muted", { text: "From Coach John" }),
          ]),
          wrap,
        ])
      );
    }

    /* -------------------------- Links & media ---------------------------- */
    if (p.links && p.links.length) {
      const links = el("div.link-list");
      p.links.forEach((ln) => links.append(linkCard(ln)));
      root.append(
        el("div.panel.glass", {}, [
          el("div.panel-head", {}, [el("h2", { text: "Useful Links" })]),
          links,
        ])
      );
    }

    /* --------------------------- Attachments ----------------------------- */
    if (p.attachments && p.attachments.length) {
      const atts = el("div.att-list");
      p.attachments.forEach((a) =>
        atts.append(
          el("a.att-card", { href: a.dataUrl, download: a.name, target: "_blank" }, [
            el("div.att-icon", { text: a.type.includes("pdf") ? "📄" : "🖼️" }),
            el("div.att-name", { text: a.name }),
          ])
        )
      );
      root.append(
        el("div.panel.glass", {}, [
          el("div.panel-head", {}, [el("h2", { text: "Attachments" })]),
          atts,
        ])
      );
    }

    /* ---------------------------- Activity ------------------------------- */
    if (p.activity && p.activity.length) {
      const acts = el("div.activity");
      p.activity.slice(0, 8).forEach((a) =>
        acts.append(
          el("div.activity-item", {}, [
            el("span.dot"),
            el("span.activity-text", { text: a.text }),
            el("span.activity-date", { text: fmtDate(a.date) }),
          ])
        )
      );
      root.append(
        el("div.panel.glass", {}, [
          el("div.panel-head", {}, [el("h2", { text: "Recent Activity" })]),
          acts,
        ])
      );
    }

    mount.innerHTML = "";
    mount.append(root);
    mount.scrollTop = 0;
  }

  /* ------------------------------ Sub-parts ------------------------------ */

  function metaPill(label, value) {
    return el("div.meta-pill", {}, [
      el("span.meta-label", { text: label }),
      el("span.meta-value", { text: String(value) }),
    ]);
  }

  function workoutCard(player, w, refresh) {
    const card = el("div.wk-card", { class: w.completed ? "done" : "" });
    const box = el("button.wk-check", {
      class: w.completed ? "checked" : "",
      html: w.completed ? "✓" : "",
      onClick: async () => {
        await Store.toggleWorkout(player.id, w.id);
        toast(w.completed ? "Workout reopened" : "Workout complete! 🔥",
          w.completed ? "info" : "success");
        refresh();
      },
    });
    card.append(
      box,
      el("div.wk-body", {}, [
        el("div.wk-title", { text: w.title }),
        el("div.wk-desc", { text: w.description }),
        el("div.wk-tags", {}, [
          w.duration ? el("span.tag", { text: "⏱ " + w.duration }) : null,
          w.reps ? el("span.tag", { text: "🔁 " + w.reps }) : null,
          w.exercises && w.exercises.length
            ? el("span.tag", { text: "🏋 " + w.exercises.length + " drills" })
            : null,
        ]),
      ])
    );
    return card;
  }

  function linkCard(ln) {
    const embed = ln.type === "youtube" ? youtubeEmbed(ln.url) : null;
    if (embed) {
      return el("div.yt-card", {}, [
        el("div.yt-frame", {}, [
          el("iframe", {
            src: embed,
            frameborder: "0",
            allowfullscreen: "true",
            loading: "lazy",
          }),
        ]),
        el("div.link-title", { text: ln.title }),
      ]);
    }
    return el("a.link-card", { href: ln.url, target: "_blank", rel: "noopener" }, [
      el("div.link-ico", { text: ln.type === "pdf" ? "📄" : "🔗" }),
      el("div.link-title", { text: ln.title }),
      el("div.link-url", { text: ln.url }),
    ]);
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  /** Short day-of-week, e.g. "SAT". */
  function fmtDow(iso) {
    try {
      return new Date(iso + "T00:00:00")
        .toLocaleDateString(undefined, { weekday: "short" })
        .toUpperCase();
    } catch {
      return "";
    }
  }

  /** Day + short month, e.g. "11 Jul". */
  function fmtDayNum(iso) {
    try {
      return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      });
    } catch {
      return iso;
    }
  }

  /** Full month + year, e.g. "July 2026". */
  function fmtMonth(ym) {
    try {
      return new Date(ym + "-01T00:00:00").toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    } catch {
      return ym;
    }
  }

  return { render };
})();
