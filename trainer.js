/* =============================================================================
 * trainer.js — Trainer (coach) dashboard — FULL CONTROL
 * -----------------------------------------------------------------------------
 * The trainer can edit every trainee, create/delete trainees, adjust stats
 * (which auto-recalculates overall + rankings), and manage each athlete's
 * training plans, workouts, coach notes, links and attachments.
 * ========================================================================== */

const TrainerView = (() => {
  const { el, toast, modal, esc, photoOf, progressBar } = UI;

  /* --------------------------- Roster overview --------------------------- */
  function render(mount) {
    const root = el("div.dash");

    root.append(
      el("div.dash-topbar", {}, [
        el("button.btn.ghost", { html: "&larr; Squad", onClick: () => App.goHome() }),
        el("div.badge.coach", { text: "TRAINER" }),
      ])
    );

    root.append(
      el("div.trainer-head.glass", {}, [
        el("div", {}, [
          el("h1", { text: "Coach John's Control Center" }),
          el("p.muted", { text: "Manage your swimmers, stats, swim sets and media." }),
        ]),
        el("div.trainer-actions", {}, [
          el("button.btn.primary", { html: "＋ New Trainee", onClick: () => editPlayer(null, mount) }),
          el("button.btn.ghost", { text: "Reset Demo", onClick: () => confirmReset(mount) }),
        ]),
      ])
    );

    const grid = el("div.coach-grid");
    Store.ranked().forEach((p) => grid.append(coachCard(p, mount)));
    root.append(grid);

    mount.innerHTML = "";
    mount.append(root);
    mount.scrollTop = 0;
  }

  function coachCard(p, mount) {
    const overall = Store.overall(p);
    return el("div.coach-card.glass", {}, [
      el("div.coach-card-top", {}, [
        el("div.rank-chip", { text: "#" + p._rank }),
        el("img.coach-avatar", { src: photoOf(p), alt: p.name }),
        el("div", {}, [
          el("div.coach-name", { text: p.name }),
          el("div.coach-sub", { text: `Age ${p.age} · ${p.height}cm · ${p.weight}kg` }),
          el("div.coach-pin", { text: "PIN " + p.pin }),
        ]),
        el("div.coach-overall", {}, [
          el("div.coach-overall-num", { text: String(overall) }),
          el("div.coach-overall-lbl", { text: "OVR" }),
        ]),
      ]),
      el("div.coach-stats", {}, [
        statBar("Speed", p.speed, "var(--neon)"),
        statBar("Stamina", p.stamina, "var(--neon-2)"),
      ]),
      el("div.coach-card-actions", {}, [
        el("button.btn.sm.primary", { text: "Edit Stats", onClick: () => editPlayer(p.id, mount) }),
        el("button.btn.sm", { text: "Manage", onClick: () => managePlayer(p.id, mount) }),
        el("button.btn.sm.danger", { text: "Delete", onClick: () => confirmDelete(p, mount) }),
      ]),
    ]);
  }

  function statBar(label, value, color) {
    return el("div.stat-row", {}, [
      el("div.stat-row-head", {}, [
        el("span", { text: label }),
        el("span.stat-val", { text: String(value) }),
      ]),
      progressBar(value, { color }),
    ]);
  }

  /* --------------------------- Edit / create ---------------------------- */
  function editPlayer(id, mount) {
    const p = id ? Store.getPlayer(id) : null;
    const isNew = !p;

    modal((close) => {
      const f = {}; // field references
      function field(label, key, type = "number", val = "") {
        const input = el("input.inp", { type, value: val });
        f[key] = input;
        return el("label.form-field", {}, [el("span", { text: label }), input]);
      }

      const preview = el("div.ovr-preview");
      function updatePreview() {
        const sp = Number(f.speed.value) || 0;
        const st = Number(f.stamina.value) || 0;
        preview.textContent = "Overall: " + Math.round((sp + st) / 2);
      }

      const body = el("div.form-grid", {}, [
        field("Name", "name", "text", p ? p.name : ""),
        field("6-digit PIN", "pin", "text", p ? p.pin : Store.genPin()),
        field("Age", "age", "number", p ? p.age : 18),
        field("Height (cm)", "height", "number", p ? p.height : 175),
        field("Weight (kg)", "weight", "number", p ? p.weight : 70),
        field("Speed (0-100)", "speed", "number", p ? p.speed : 50),
        field("Stamina (0-100)", "stamina", "number", p ? p.stamina : 50),
      ]);

      f.speed.addEventListener("input", updatePreview);
      f.stamina.addEventListener("input", updatePreview);

      const card = el("div.editor", {}, [
        el("div.editor-head", {}, [
          el("h2", { text: isNew ? "New Trainee" : "Edit " + p.name }),
          el("button.modal-close", { text: "✕", onClick: close }),
        ]),
        body,
        preview,
        el("div.editor-actions", {}, [
          el("button.btn.ghost", { text: "Cancel", onClick: close }),
          el("button.btn.primary", {
            text: isNew ? "Create Trainee" : "Save Changes",
            onClick: async () => {
              const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
              const data = {
                name: f.name.value.trim() || "Unnamed",
                pin: (f.pin.value.trim() || Store.genPin()).slice(0, 6),
                age: Number(f.age.value) || 0,
                height: Number(f.height.value) || 0,
                weight: Number(f.weight.value) || 0,
                speed: clamp(f.speed.value),
                stamina: clamp(f.stamina.value),
              };
              if (isNew) await Store.createPlayer(data);
              else await Store.updatePlayer(id, data);
              toast("Saved — rankings updated", "success");
              close();
              render(mount);
            },
          }),
        ]),
      ]);
      updatePreview();
      return card;
    }, { wide: true });
  }

  /* ------------------------- Manage (deep) view ------------------------- */
  function managePlayer(id, mount) {
    const p = Store.getPlayer(id);
    if (!p) return;

    modal((close) => {
      const wrap = el("div.manage");

      function rebuild() {
        wrap.innerHTML = "";
        const cur = Store.getPlayer(id);
        wrap.append(
          el("div.editor-head", {}, [
            el("h2", { text: "Manage · " + cur.name }),
            el("button.modal-close", { text: "✕", onClick: close }),
          ])
        );

        /* ---- Coach notes ---- */
        const notesArea = el("textarea.inp.area", { rows: "3" });
        notesArea.value = cur.coachNotes || "";
        wrap.append(
          section("Coach Notes", [
            notesArea,
            el("button.btn.sm.primary", {
              text: "Save Notes",
              onClick: async () => {
                await Store.updatePlayer(id, { coachNotes: notesArea.value });
                toast("Notes saved", "success");
              },
            }),
          ])
        );

        /* ---- Workouts ---- */
        const wkList = el("div.mng-list");
        cur.workouts.forEach((w) =>
          wkList.append(
            mngRow(
              `${w.title} — ${w.duration || ""} ${w.reps ? "· " + w.reps : ""}`,
              w.completed ? "done" : "",
              () => workoutEditor(id, w, rebuild),
              async () => { await Store.removeItem(id, "workouts", w.id); rebuild(); }
            )
          )
        );
        wrap.append(
          section("Workouts", [
            wkList,
            el("button.btn.sm.primary", { html: "＋ Add Workout", onClick: () => workoutEditor(id, null, rebuild) }),
          ])
        );

        /* ---- Training plans ---- */
        const planList = el("div.mng-list");
        (cur.trainingPlans || []).forEach((pl) =>
          planList.append(
            mngRow(
              pl.title,
              "",
              () => planEditor(id, pl, rebuild),
              async () => { await Store.removeItem(id, "trainingPlans", pl.id); rebuild(); }
            )
          )
        );
        wrap.append(
          section("Training Plans", [
            planList,
            el("button.btn.sm.primary", { html: "＋ Add Plan", onClick: () => planEditor(id, null, rebuild) }),
          ])
        );

        /* ---- Daily plans (day-by-day, visible to athlete) ---- */
        const dailyList = el("div.mng-list");
        (cur.dailyPlans || [])
          .slice()
          .sort((a, b) => a.date.localeCompare(b.date))
          .forEach((dp) =>
            dailyList.append(
              mngRow(
                `${dp.date} · ${dp.title}${dp.focus ? " (" + dp.focus + ")" : ""}`,
                "",
                () => dailyPlanEditor(id, dp, rebuild),
                async () => { await Store.removeItem(id, "dailyPlans", dp.id); rebuild(); }
              )
            )
          );
        wrap.append(
          section("Daily Plans · shown to the athlete", [
            dailyList,
            el("button.btn.sm.primary", { html: "＋ Add Daily Plan", onClick: () => dailyPlanEditor(id, null, rebuild) }),
          ])
        );

        /* ---- Monthly reports (comment + photos + PDF) ---- */
        const repList = el("div.mng-list");
        (cur.monthlyReports || [])
          .slice()
          .sort((a, b) => b.month.localeCompare(a.month))
          .forEach((r) => {
            const bits = [];
            if (r.photos && r.photos.length) bits.push(r.photos.length + " photo" + (r.photos.length > 1 ? "s" : ""));
            if (r.pdf) bits.push("PDF");
            repList.append(
              mngRow(
                `${r.month}${bits.length ? " · " + bits.join(", ") : ""}`,
                "",
                () => reportEditor(id, r, rebuild),
                async () => { await Store.removeItem(id, "monthlyReports", r.id); rebuild(); }
              )
            );
          });
        wrap.append(
          section("Monthly Reports · comment, photos & PDF", [
            repList,
            el("button.btn.sm.primary", { html: "＋ Add Monthly Report", onClick: () => reportEditor(id, null, rebuild) }),
          ])
        );

        /* ---- Links ---- */
        const linkList = el("div.mng-list");
        (cur.links || []).forEach((ln) =>
          linkList.append(
            mngRow(
              `${ln.title} (${ln.type})`,
              "",
              () => linkEditor(id, ln, rebuild),
              async () => { await Store.removeItem(id, "links", ln.id); rebuild(); }
            )
          )
        );
        wrap.append(
          section("Links (YouTube / External / PDF)", [
            linkList,
            el("button.btn.sm.primary", { html: "＋ Add Link", onClick: () => linkEditor(id, null, rebuild) }),
          ])
        );

        /* ---- Attachments ---- */
        const attList = el("div.mng-list");
        (cur.attachments || []).forEach((a) =>
          attList.append(
            mngRow(
              a.name,
              "",
              null,
              async () => { await Store.removeItem(id, "attachments", a.id); rebuild(); }
            )
          )
        );
        wrap.append(
          section("Attachments (PDF / Image)", [
            attList,
            el("button.btn.sm.primary", {
              html: "＋ Upload File",
              onClick: async () => {
                const file = await UI.readFileAsDataURL("application/pdf,image/*");
                if (file) {
                  await Store.addItem(id, "attachments", file);
                  toast("File attached", "success");
                  rebuild();
                }
              },
            }),
          ])
        );

        wrap.append(
          el("div.editor-actions", {}, [
            el("button.btn.primary", { text: "Done", onClick: () => { close(); render(mount); } }),
          ])
        );
      }

      rebuild();
      return wrap;
    }, { wide: true });
  }

  function section(title, children) {
    return el("div.mng-section", {}, [
      el("h3.mng-title", { text: title }),
      ...children,
    ]);
  }

  function mngRow(label, cls, onEdit, onDelete) {
    const row = el("div.mng-row", { class: cls });
    row.append(el("span.mng-label", { text: label }));
    const actions = el("div.mng-actions");
    if (onEdit) actions.append(el("button.btn.xs", { text: "Edit", onClick: onEdit }));
    if (onDelete) actions.append(el("button.btn.xs.danger", { text: "✕", onClick: onDelete }));
    row.append(actions);
    return row;
  }

  /* --------------------------- Item editors ----------------------------- */
  function workoutEditor(playerId, w, refresh) {
    const isNew = !w;
    modal((close) => {
      const f = {};
      const inp = (label, key, val = "", type = "text") => {
        const i = el("input.inp", { type, value: val });
        f[key] = i;
        return el("label.form-field", {}, [el("span", { text: label }), i]);
      };
      const exArea = el("textarea.inp.area", { rows: "3" });
      exArea.value = w && w.exercises ? w.exercises.join("\n") : "";

      const card = el("div.editor", {}, [
        el("div.editor-head", {}, [
          el("h2", { text: isNew ? "New Workout" : "Edit Workout" }),
          el("button.modal-close", { text: "✕", onClick: close }),
        ]),
        el("div.form-grid", {}, [
          inp("Title", "title", w ? w.title : ""),
          inp("Duration", "duration", w ? w.duration : ""),
          inp("Reps / Sets", "reps", w ? w.reps : ""),
          inp("Date", "date", w ? w.date : new Date().toISOString().slice(0, 10), "date"),
        ]),
        el("label.form-field.full", {}, [
          el("span", { text: "Description" }),
          (() => { const t = el("textarea.inp.area", { rows: "2" }); t.value = w ? w.description : ""; f.description = t; return t; })(),
        ]),
        el("label.form-field.full", {}, [
          el("span", { text: "Exercises (one per line)" }),
          exArea,
        ]),
        el("div.editor-actions", {}, [
          el("button.btn.ghost", { text: "Cancel", onClick: close }),
          el("button.btn.primary", {
            text: "Save",
            onClick: async () => {
              const data = {
                title: f.title.value.trim() || "Workout",
                duration: f.duration.value.trim(),
                reps: f.reps.value.trim(),
                date: f.date.value,
                description: f.description.value.trim(),
                exercises: exArea.value.split("\n").map((s) => s.trim()).filter(Boolean),
              };
              if (isNew) {
                data.completed = false;
                data.completedDate = null;
                await Store.addItem(playerId, "workouts", data);
              } else {
                await Store.updateItem(playerId, "workouts", w.id, data);
              }
              toast("Workout saved", "success");
              close();
              refresh();
            },
          }),
        ]),
      ]);
      return card;
    }, { wide: true });
  }

  function planEditor(playerId, pl, refresh) {
    const isNew = !pl;
    modal((close) => {
      const f = {};
      const inp = (label, key, val = "") => {
        const i = el("input.inp", { type: "text", value: val });
        f[key] = i;
        return el("label.form-field.full", {}, [el("span", { text: label }), i]);
      };
      const descT = el("textarea.inp.area", { rows: "2" });
      descT.value = pl ? pl.description : "";
      const instrT = el("textarea.inp.area", { rows: "3" });
      instrT.value = pl ? pl.instructions : "";

      return el("div.editor", {}, [
        el("div.editor-head", {}, [
          el("h2", { text: isNew ? "New Plan" : "Edit Plan" }),
          el("button.modal-close", { text: "✕", onClick: close }),
        ]),
        inp("Title", "title", pl ? pl.title : ""),
        el("label.form-field.full", {}, [el("span", { text: "Description" }), descT]),
        el("label.form-field.full", {}, [el("span", { text: "Instructions" }), instrT]),
        el("div.editor-actions", {}, [
          el("button.btn.ghost", { text: "Cancel", onClick: close }),
          el("button.btn.primary", {
            text: "Save",
            onClick: async () => {
              const data = {
                title: f.title.value.trim() || "Plan",
                description: descT.value.trim(),
                instructions: instrT.value.trim(),
              };
              if (isNew) await Store.addItem(playerId, "trainingPlans", data);
              else await Store.updateItem(playerId, "trainingPlans", pl.id, data);
              toast("Plan saved", "success");
              close();
              refresh();
            },
          }),
        ]),
      ]);
    }, { wide: true });
  }

  function linkEditor(playerId, ln, refresh) {
    const isNew = !ln;
    modal((close) => {
      const f = {};
      const title = el("input.inp", { type: "text", value: ln ? ln.title : "" });
      const url = el("input.inp", { type: "url", value: ln ? ln.url : "" });
      const type = el("select.inp");
      ["youtube", "link", "pdf", "image"].forEach((t) => {
        const o = el("option", { value: t, text: t });
        if (ln && ln.type === t) o.selected = true;
        type.append(o);
      });

      return el("div.editor", {}, [
        el("div.editor-head", {}, [
          el("h2", { text: isNew ? "New Link" : "Edit Link" }),
          el("button.modal-close", { text: "✕", onClick: close }),
        ]),
        el("label.form-field.full", {}, [el("span", { text: "Title" }), title]),
        el("label.form-field.full", {}, [el("span", { text: "URL" }), url]),
        el("label.form-field.full", {}, [el("span", { text: "Type" }), type]),
        el("div.editor-actions", {}, [
          el("button.btn.ghost", { text: "Cancel", onClick: close }),
          el("button.btn.primary", {
            text: "Save",
            onClick: async () => {
              const data = {
                title: title.value.trim() || "Link",
                url: url.value.trim(),
                type: type.value,
              };
              if (isNew) await Store.addItem(playerId, "links", data);
              else await Store.updateItem(playerId, "links", ln.id, data);
              toast("Link saved", "success");
              close();
              refresh();
            },
          }),
        ]),
      ]);
    }, { wide: true });
  }

  /* ----------------------- Daily plan editor ---------------------------- */
  function dailyPlanEditor(playerId, dp, refresh) {
    const isNew = !dp;
    modal((close) => {
      const date = el("input.inp", { type: "date", value: dp ? dp.date : new Date().toISOString().slice(0, 10) });
      const title = el("input.inp", { type: "text", value: dp ? dp.title : "" });
      const focus = el("input.inp", { type: "text", value: dp ? dp.focus : "" });
      const content = el("textarea.inp.area", { rows: "4" });
      content.value = dp ? dp.content : "";

      return el("div.editor", {}, [
        el("div.editor-head", {}, [
          el("h2", { text: isNew ? "New Daily Plan" : "Edit Daily Plan" }),
          el("button.modal-close", { text: "✕", onClick: close }),
        ]),
        el("div.form-grid", {}, [
          el("label.form-field", {}, [el("span", { text: "Date" }), date]),
          el("label.form-field", {}, [el("span", { text: "Focus (e.g. Speed)" }), focus]),
        ]),
        el("label.form-field.full", {}, [el("span", { text: "Title" }), title]),
        el("label.form-field.full", {}, [el("span", { text: "Plan details" }), content]),
        el("div.editor-actions", {}, [
          el("button.btn.ghost", { text: "Cancel", onClick: close }),
          el("button.btn.primary", {
            text: "Save",
            onClick: async () => {
              const data = {
                date: date.value,
                title: title.value.trim() || "Daily Plan",
                focus: focus.value.trim(),
                content: content.value.trim(),
              };
              if (isNew) await Store.addItem(playerId, "dailyPlans", data);
              else await Store.updateItem(playerId, "dailyPlans", dp.id, data);
              toast("Daily plan saved", "success");
              close();
              refresh();
            },
          }),
        ]),
      ]);
    }, { wide: true });
  }

  /* --------------------- Monthly report editor -------------------------- */
  function reportEditor(playerId, r, refresh) {
    const isNew = !r;
    modal((close) => {
      let photos = r && r.photos ? [...r.photos] : [];
      let pdf = r && r.pdf ? r.pdf : null;
      const month = el("input.inp", { type: "month", value: r ? r.month : new Date().toISOString().slice(0, 7) });
      const comment = el("textarea.inp.area", { rows: "4" });
      comment.value = r ? r.comment : "";

      const gallery = el("div.mng-photos");
      function renderGallery() {
        gallery.innerHTML = "";
        if (!photos.length) {
          gallery.append(el("span.muted", { text: "No photos yet." }));
          return;
        }
        photos.forEach((src, idx) =>
          gallery.append(
            el("div.mng-photo", {}, [
              el("img", { src }),
              el("button.mng-photo-x", {
                type: "button", text: "✕",
                onClick: () => { photos.splice(idx, 1); renderGallery(); },
              }),
            ])
          )
        );
      }
      renderGallery();

      const pdfRow = el("div.pdf-row");
      function renderPdf() {
        pdfRow.innerHTML = "";
        if (pdf) {
          pdfRow.append(
            el("span.mng-label", { text: "📄 " + pdf.name }),
            el("button.btn.xs.danger", { text: "Remove", onClick: () => { pdf = null; renderPdf(); } })
          );
        } else {
          pdfRow.append(el("span.muted", { text: "No PDF attached." }));
        }
      }
      renderPdf();

      return el("div.editor", {}, [
        el("div.editor-head", {}, [
          el("h2", { text: isNew ? "New Monthly Report" : "Edit Monthly Report" }),
          el("button.modal-close", { text: "✕", onClick: close }),
        ]),
        el("label.form-field.full", {}, [el("span", { text: "Month" }), month]),
        el("label.form-field.full", {}, [el("span", { text: "Comment" }), comment]),
        el("div.mng-subhead", { text: "Photos" }),
        gallery,
        el("button.btn.sm", {
          html: "＋ Add Photo",
          onClick: async () => {
            const d = await UI.pickImage(900);
            if (d) { photos.push(d); renderGallery(); }
          },
        }),
        el("div.mng-subhead", { text: "PDF" }),
        pdfRow,
        el("button.btn.sm", {
          html: "＋ Attach PDF",
          onClick: async () => {
            const file = await UI.readFileAsDataURL("application/pdf");
            if (file) { pdf = { name: file.name, dataUrl: file.dataUrl }; renderPdf(); }
          },
        }),
        el("div.editor-actions", {}, [
          el("button.btn.ghost", { text: "Cancel", onClick: close }),
          el("button.btn.primary", {
            text: "Save Report",
            onClick: async () => {
              const data = {
                month: month.value,
                comment: comment.value.trim(),
                photos,
                pdf,
              };
              if (isNew) await Store.addItem(playerId, "monthlyReports", data);
              else await Store.updateItem(playerId, "monthlyReports", r.id, data);
              toast("Monthly report saved", "success");
              close();
              refresh();
            },
          }),
        ]),
      ]);
    }, { wide: true });
  }

  /* ------------------------- Confirm dialogs ---------------------------- */
  function confirmDelete(p, mount) {
    modal((close) =>
      el("div.editor", {}, [
        el("h2", { text: "Delete " + p.name + "?" }),
        el("p.muted", { text: "This permanently removes the trainee and all their data." }),
        el("div.editor-actions", {}, [
          el("button.btn.ghost", { text: "Cancel", onClick: close }),
          el("button.btn.danger", {
            text: "Delete",
            onClick: async () => {
              await Store.deletePlayer(p.id);
              toast("Trainee deleted", "info");
              close();
              render(mount);
            },
          }),
        ]),
      ])
    );
  }

  function confirmReset(mount) {
    modal((close) =>
      el("div.editor", {}, [
        el("h2", { text: "Reset all demo data?" }),
        el("p.muted", { text: "Restores the original 10 trainees and clears every change." }),
        el("div.editor-actions", {}, [
          el("button.btn.ghost", { text: "Cancel", onClick: close }),
          el("button.btn.danger", {
            text: "Reset",
            onClick: async () => {
              await Store.resetDemo();
              toast("Demo data restored", "success");
              close();
              render(mount);
            },
          }),
        ]),
      ])
    );
  }

  return { render };
})();
