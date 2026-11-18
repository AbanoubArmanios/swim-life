/* =============================================================================
 * trainer.js — Coach dashboard — FULL CONTROL
 * -----------------------------------------------------------------------------
 * The coach can edit every member, create/delete members, adjust stats (which
 * auto-recalculates Overall + rankings), and manage each member's workouts,
 * training plan, notes, links, attachments and monthly reports.
 *
 * Workouts are built in the SAME table structure the member sees:
 *   #  |  Sets & Reps  |  Exercise  |  Rest  |  Tools  |  Weight
 * ========================================================================== */

const TrainerView = (() => {
  const { el, toast, modal, esc, photoOf, progressBar, workoutTable } = UI;

  /* --------------------------- Roster overview --------------------------- */
  function render(mount) {
    const root = el("div.dash");

    root.append(
      el("div.dash-topbar", {}, [
        el("button.btn.ghost", { html: "&larr; Members", onClick: () => App.goHome() }),
        el("div.badge.coach", { text: "COACH" }),
      ])
    );

    root.append(
      el("div.trainer-head.glass", {}, [
        el("div", {}, [
          el("h1", { text: "Coach John's Control Center" }),
          el("p.muted", { text: "Manage your members, stats, workouts and reports." }),
        ]),
        el("div.trainer-actions", {}, [
          el("button.btn.primary", { html: "＋ New Member", onClick: () => editPlayer(null, mount) }),
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
        el("div.rank-chip", { text: "#" + p._rank }),   // in-flow chip, no overlap
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
        statBar("Strength", p.strength, "var(--primary)"),
        statBar("Endurance", p.endurance, "var(--amber)"),
        statBar("Mobility", p.mobility, "var(--indigo)"),
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
      const f = {};
      function field(label, key, type = "number", val = "") {
        const input = el("input.inp", { type, value: val });
        f[key] = input;
        return el("label.form-field", {}, [el("span", { text: label }), input]);
      }

      const preview = el("div.ovr-preview");
      function updatePreview() {
        const s = Number(f.strength.value) || 0;
        const e = Number(f.endurance.value) || 0;
        const m = Number(f.mobility.value) || 0;
        preview.textContent = "Overall: " + Math.round((s + e + m) / 3);
      }

      const body = el("div.form-grid", {}, [
        field("Name", "name", "text", p ? p.name : ""),
        field("4-digit PIN", "pin", "text", p ? p.pin : Store.genPin()),
        field("Age", "age", "number", p ? p.age : 18),
        field("Height (cm)", "height", "number", p ? p.height : 175),
        field("Weight (kg)", "weight", "number", p ? p.weight : 70),
        field("Strength (0-100)", "strength", "number", p ? p.strength : 50),
        field("Endurance (0-100)", "endurance", "number", p ? p.endurance : 50),
        field("Mobility (0-100)", "mobility", "number", p ? p.mobility : 50),
      ]);

      ["strength", "endurance", "mobility"].forEach((k) =>
        f[k].addEventListener("input", updatePreview)
      );

      const card = el("div.editor", {}, [
        el("div.editor-head", {}, [
          el("h2", { text: isNew ? "New Member" : "Edit " + p.name }),
          el("button.modal-close", { text: "✕", onClick: close }),
        ]),
        body,
        preview,
        el("div.editor-actions", {}, [
          el("button.btn.ghost", { text: "Cancel", onClick: close }),
          el("button.btn.primary", {
            text: isNew ? "Create Member" : "Save Changes",
            onClick: async () => {
              const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
              const data = {
                name: f.name.value.trim() || "Unnamed",
                pin: (f.pin.value.trim() || Store.genPin()).slice(0, 4),
                age: Number(f.age.value) || 0,
                height: Number(f.height.value) || 0,
                weight: Number(f.weight.value) || 0,
                strength: clamp(f.strength.value),
                endurance: clamp(f.endurance.value),
                mobility: clamp(f.mobility.value),
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

        /* ---- Workout days (the table) ---- */
        const wkList = el("div.mng-list");
        [...(cur.workouts || [])]
          .sort((a, b) => String(a.date).localeCompare(String(b.date)))
          .forEach((w) =>
            wkList.append(
              mngRow(
                `${w.date} · ${w.title} (${(w.rows || []).length} rows)`,
                w.completed ? "done" : "",
                () => workoutEditor(id, w, rebuild),
                async () => { await Store.removeItem(id, "workouts", w.id); rebuild(); }
              )
            )
          );
        wrap.append(
          section("Workout Days · the table the member sees", [
            wkList,
            el("button.btn.sm.primary", { html: "＋ Add Workout Day", onClick: () => workoutEditor(id, null, rebuild) }),
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

        /* ---- Training plan ---- */
        const planList = el("div.mng-list");
        (cur.trainingPlans || []).forEach((pl) =>
          planList.append(
            mngRow(pl.title, "",
              () => planEditor(id, pl, rebuild),
              async () => { await Store.removeItem(id, "trainingPlans", pl.id); rebuild(); }
            )
          )
        );
        wrap.append(
          section("Training Plan", [
            planList,
            el("button.btn.sm.primary", { html: "＋ Add Plan", onClick: () => planEditor(id, null, rebuild) }),
          ])
        );

        /* ---- Monthly reports ---- */
        const repList = el("div.mng-list");
        [...(cur.monthlyReports || [])]
          .sort((a, b) => b.month.localeCompare(a.month))
          .forEach((r) => {
            const bits = [];
            if (r.photos && r.photos.length) bits.push(r.photos.length + " photo" + (r.photos.length > 1 ? "s" : ""));
            if (r.pdf) bits.push("PDF");
            repList.append(
              mngRow(`${r.month}${bits.length ? " · " + bits.join(", ") : ""}`, "",
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
            mngRow(`${ln.title} (${ln.type})`, "",
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
            mngRow(a.name, "", null,
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
    return el("div.mng-section", {}, [el("h3.mng-title", { text: title }), ...children]);
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

  /* ---------------------- Workout (table) editor ------------------------ */
  /**
   * Builds a workout day in the exact member-facing structure:
   *   #  |  Sets & Reps  |  Exercise  |  Rest  |  Tools  |  Weight
   * Rows can be added, reordered and removed. Blank cells are allowed.
   */
  function workoutEditor(playerId, w, refresh) {
    const isNew = !w;

    modal((close) => {
      const title = el("input.inp", { type: "text", value: w ? w.title : "", placeholder: "Pull 1" });
      const date = el("input.inp", { type: "date", value: w ? w.date : new Date().toISOString().slice(0, 10) });

      // Working copy of the rows
      let rows = w && w.rows ? w.rows.map((r) => ({ ...r })) : [
        { sets: "", exercise: "", rest: "", tools: "", weight: "" },
      ];

      const rowsWrap = el("div.rowedit-wrap");

      function renderRows() {
        rowsWrap.innerHTML = "";

        // Column captions (match the member table order)
        rowsWrap.append(
          el("div.rowedit-head", {}, [
            el("span.re-num", { text: "#" }),
            el("span", { text: "Sets & Reps" }),
            el("span", { text: "Exercise" }),
            el("span", { text: "Rest" }),
            el("span", { text: "Tools / note" }),
            el("span", { text: "Weight" }),
            el("span.re-act", { text: "" }),
          ])
        );

        rows.forEach((r, i) => {
          const mk = (key, ph) => {
            const inp = el("input.inp.re-inp", { type: "text", value: r[key] || "", placeholder: ph });
            inp.setAttribute("dir", "auto"); // Arabic-friendly
            inp.addEventListener("input", () => { r[key] = inp.value; });
            return inp;
          };

          rowsWrap.append(
            el("div.rowedit", {}, [
              el("span.re-num", { text: String(i + 1) }),
              mk("sets", "3*12"),
              mk("exercise", "Lat pull down"),
              mk("rest", "1:30"),
              mk("tools", "Wide grip"),
              mk("weight", "20k"),
              el("div.re-act", {}, [
                el("button.btn.xs", {
                  text: "↑", title: "Move up",
                  onClick: () => {
                    if (i === 0) return;
                    [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]];
                    renderRows();
                  },
                }),
                el("button.btn.xs", {
                  text: "↓", title: "Move down",
                  onClick: () => {
                    if (i === rows.length - 1) return;
                    [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]];
                    renderRows();
                  },
                }),
                el("button.btn.xs.danger", {
                  text: "✕", title: "Delete row",
                  onClick: () => { rows.splice(i, 1); renderRows(); },
                }),
              ]),
            ])
          );
        });
      }
      renderRows();

      return el("div.editor.wk-editor", {}, [
        el("div.editor-head", {}, [
          el("h2", { text: isNew ? "New Workout Day" : "Edit Workout Day" }),
          el("button.modal-close", { text: "✕", onClick: close }),
        ]),
        el("div.form-grid", {}, [
          el("label.form-field", {}, [el("span", { text: "Day name (banner)" }), title]),
          el("label.form-field", {}, [el("span", { text: "Date" }), date]),
        ]),

        el("div.mng-subhead", { text: "Exercises — leave cells blank for warm-ups / stretches" }),
        rowsWrap,

        el("div.rowedit-actions", {}, [
          el("button.btn.sm", {
            html: "＋ Add Row",
            onClick: () => { rows.push({ sets: "", exercise: "", rest: "", tools: "", weight: "" }); renderRows(); },
          }),
          el("button.btn.sm.ghost", {
            text: "Preview",
            onClick: () => {
              modal((c2) =>
                el("div.wt-modal", {}, [
                  el("div.editor-head", {}, [
                    el("h2", { text: title.value || "Workout" }),
                    el("button.modal-close", { text: "✕", onClick: c2 }),
                  ]),
                  workoutTable({ title: title.value || "Workout", rows }),
                ]), { wide: true });
            },
          }),
        ]),

        el("div.editor-actions", {}, [
          el("button.btn.ghost", { text: "Cancel", onClick: close }),
          el("button.btn.primary", {
            text: "Save Workout",
            onClick: async () => {
              // Drop fully-empty rows
              const clean = rows.filter(
                (r) => r.sets || r.exercise || r.rest || r.tools || r.weight
              );
              const data = {
                title: title.value.trim() || "Workout",
                date: date.value,
                rows: clean,
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
    }, { wide: true });
  }

  /* --------------------------- Plan editor ------------------------------ */
  function planEditor(playerId, pl, refresh) {
    const isNew = !pl;
    modal((close) => {
      const title = el("input.inp", { type: "text", value: pl ? pl.title : "" });
      const descT = el("textarea.inp.area", { rows: "2" });
      descT.value = pl ? pl.description : "";
      const instrT = el("textarea.inp.area", { rows: "3" });
      instrT.value = pl ? pl.instructions : "";

      return el("div.editor", {}, [
        el("div.editor-head", {}, [
          el("h2", { text: isNew ? "New Plan" : "Edit Plan" }),
          el("button.modal-close", { text: "✕", onClick: close }),
        ]),
        el("label.form-field.full", {}, [el("span", { text: "Title" }), title]),
        el("label.form-field.full", {}, [el("span", { text: "Description" }), descT]),
        el("label.form-field.full", {}, [el("span", { text: "Instructions" }), instrT]),
        el("div.editor-actions", {}, [
          el("button.btn.ghost", { text: "Cancel", onClick: close }),
          el("button.btn.primary", {
            text: "Save",
            onClick: async () => {
              const data = {
                title: title.value.trim() || "Plan",
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

  /* --------------------------- Link editor ------------------------------ */
  function linkEditor(playerId, ln, refresh) {
    const isNew = !ln;
    modal((close) => {
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
        el("p.muted", { text: "This permanently removes the member and all their data." }),
        el("div.editor-actions", {}, [
          el("button.btn.ghost", { text: "Cancel", onClick: close }),
          el("button.btn.danger", {
            text: "Delete",
            onClick: async () => {
              await Store.deletePlayer(p.id);
              toast("Member deleted", "info");
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
        el("p.muted", { text: "Restores the original 10 members and clears every change." }),
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
