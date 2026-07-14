/* =============================================================================
 * trainee.js — Member dashboard — VIEW ONLY
 * -----------------------------------------------------------------------------
 * The member can ONLY:
 *   - upload / change their profile photo
 *   - mark a workout day complete
 * Everything else (age, height, weight, strength, endurance, mobility, rank,
 * workouts, plans, notes, links, reports) is controlled by the coach.
 *
 * Tapping a workout day opens it as the coach's table:
 *   #  |  Sets & Reps  |  Exercise  |  Rest  |  Tools  |  Weight
 * ========================================================================== */

const TraineeView = (() => {
  const { el, gauge, progressBar, toast, esc, photoOf, youtubeEmbed, modal, workoutTable } = UI;

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
        el("button.btn.ghost", { html: "&larr; Members", onClick: () => App.goHome() }),
        el("div.badge.athlete", { text: "MEMBER" }),
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

    root.append(
      el("div.hero.glass", {}, [
        photoWrap,
        el("div.hero-info", {}, [
          // Rank (left) and Overall (right) share one flex row — they can no
          // longer overlap the name or each other on narrow screens.
          el("div.hero-toprow", {}, [
            el("div.hero-rank", {}, [
              el("span.hero-rank-num", { text: "#" + rank }),
              el("span.hero-rank-lbl", { text: "RANK" }),
            ]),
            el("div.hero-overall", {}, [
              el("div.hero-overall-num", { text: String(overall) }),
              el("div.hero-overall-label", { text: "OVERALL" }),
            ]),
          ]),
          el("h1.hero-name", { text: p.name }),
          el("div.hero-meta", {}, [
            metaPill("Age", p.age),
            metaPill("Height", p.height + " cm"),
            metaPill("Weight", p.weight + " kg"),
          ]),
        ]),
      ])
    );

    /* ----------------------------- Gauges -------------------------------- */
    root.append(
      el("div.gauge-row.glass", {}, [
        el("div.gauge-cell", {}, [gauge(p.strength, { label: "STRENGTH", color: "var(--primary)" })]),
        el("div.gauge-cell", {}, [gauge(p.endurance, { label: "ENDURANCE", color: "var(--amber)" })]),
        el("div.gauge-cell", {}, [gauge(p.mobility, { label: "MOBILITY", color: "var(--indigo)" })]),
      ])
    );

    /* -------------------------- Progress panel --------------------------- */
    root.append(
      el("div.panel.glass", {}, [
        el("div.panel-head", {}, [
          el("h2", { text: "Training Progress" }),
          el("div.pct-chip", { text: pct + "%" }),
        ]),
        progressBar(pct, { color: "var(--primary)" }),
        el("div.panel-sub", {
          text: `${p.workouts.filter((w) => w.completed).length} of ${p.workouts.length} workout days completed`,
        }),
      ])
    );

    /* ---------------------------- Workouts ------------------------------- */
    const today = new Date().toISOString().slice(0, 10);
    const workouts = [...(p.workouts || [])].sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
    const wkList = el("div.wk-list");
    workouts.forEach((w) =>
      wkList.append(workoutCard(p, w, w.date === today, () => render(playerId, mount)))
    );

    root.append(
      el("div.panel.glass", {}, [
        el("div.panel-head", {}, [
          el("h2", { text: "My Workouts" }),
          el("span.muted", { text: "Tap a day to open it" }),
        ]),
        workouts.length ? wkList : el("div.empty", { text: "No workouts assigned yet." }),
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
          el("div.panel-head", {}, [el("h2", { text: "Training Plan" })]),
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
      const reports = [...p.monthlyReports].sort((a, b) => b.month.localeCompare(a.month));
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
            el("a.report-pdf", { href: r.pdf.dataUrl, download: r.pdf.name, target: "_blank" }, [
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

  /** A workout day card. Tapping it opens the full table. */
  function workoutCard(player, w, isToday, refresh) {
    const exCount = (w.rows || []).filter((r) => r.exercise).length;

    const check = el("button.wk-check", {
      class: w.completed ? "checked" : "",
      html: w.completed ? "✓" : "",
      title: w.completed ? "Mark as not done" : "Mark complete",
      onClick: async (e) => {
        e.stopPropagation();           // don't open the table
        await Store.toggleWorkout(player.id, w.id);
        toast(w.completed ? "Workout reopened" : "Workout complete! 💪",
          w.completed ? "info" : "success");
        refresh();
      },
    });

    const card = el("div.wk-card", {
      class: (w.completed ? "done " : "") + (isToday ? "today" : ""),
      onClick: () => openWorkout(w),
    }, [
      check,
      el("div.wk-body", {}, [
        el("div.wk-title-row", {}, [
          el("span.wk-title", { text: w.title }),
          isToday ? el("span.today-chip", { text: "TODAY" }) : null,
        ]),
        el("div.wk-tags", {}, [
          el("span.tag", { text: "📅 " + fmtDayNum(w.date) }),
          el("span.tag", { text: "🏋 " + exCount + " exercises" }),
        ]),
      ]),
      el("span.wk-open", { text: "View ›" }),
    ]);
    return card;
  }

  /** Open a workout day as the full table, in a modal. */
  function openWorkout(w) {
    modal((close) =>
      el("div.wt-modal", {}, [
        el("div.editor-head", {}, [
          el("div", {}, [
            el("h2", { text: w.title }),
            el("div.muted.wt-date", { text: fmtDayNum(w.date) }),
          ]),
          el("button.modal-close", { text: "✕", onClick: close }),
        ]),
        workoutTable(w),
      ])
    , { wide: true });
  }

  function linkCard(ln) {
    const embed = ln.type === "youtube" ? youtubeEmbed(ln.url) : null;
    if (embed) {
      return el("div.yt-card", {}, [
        el("div.yt-frame", {}, [
          el("iframe", { src: embed, frameborder: "0", allowfullscreen: "true", loading: "lazy" }),
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

  /* ------------------------------ Formatters ----------------------------- */
  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch { return ""; }
  }
  function fmtDayNum(iso) {
    try {
      return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "short", day: "numeric", month: "short",
      });
    } catch { return iso || ""; }
  }
  function fmtMonth(ym) {
    try {
      return new Date(ym + "-01T00:00:00").toLocaleDateString(undefined, {
        month: "long", year: "numeric",
      });
    } catch { return ym; }
  }

  return { render };
})();
