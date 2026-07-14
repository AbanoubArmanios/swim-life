/* =============================================================================
 * ui.js — Reusable UI primitives & animation helpers
 * -----------------------------------------------------------------------------
 * Small, dependency-free helpers shared across the home screen and dashboards:
 * element factory, toasts, modal system, animated number counters and circular
 * performance gauges (F1 / Playermaker inspired).
 * ========================================================================== */

const UI = (() => {
  /* ------------------------- DOM helper (hyperscript) --------------------- */
  /**
   * Create an element quickly.
   * @param {string} tag  e.g. "div.card#main"
   * @param {object} [attrs] attributes / props (class, html, text, on* handlers)
   * @param {Array}  [children]
   */
  function el(tag, attrs = {}, children = []) {
    const [name, ...rest] = tag.split(/(?=[.#])/);
    const node = document.createElement(name || "div");
    rest.forEach((token) => {
      if (token[0] === ".") node.classList.add(token.slice(1));
      if (token[0] === "#") node.id = token.slice(1);
    });
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className += " " + v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (v !== null && v !== undefined && v !== false) {
        node.setAttribute(k, v);
      }
    }
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null || c === false) return;
      node.append(c.nodeType ? c : document.createTextNode(c));
    });
    return node;
  }

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* -------------------------------- Toasts -------------------------------- */
  function toast(message, type = "info") {
    let wrap = $("#toast-wrap");
    if (!wrap) {
      wrap = el("div#toast-wrap");
      document.body.append(wrap);
    }
    const t = el("div.toast", { class: type, text: message });
    wrap.append(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.remove(), 300);
    }, 2600);
  }

  /* -------------------------------- Modal --------------------------------- */
  /**
   * Open a modal. `builder(close)` returns the content node.
   * Returns a close() function.
   */
  function modal(builder, opts = {}) {
    const overlay = el("div.modal-overlay");
    const close = () => {
      overlay.classList.remove("open");
      setTimeout(() => overlay.remove(), 250);
    };
    const box = el("div.modal", { class: opts.wide ? "wide" : "" });
    const content = builder(close);
    box.append(content);
    overlay.append(box);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay && !opts.locked) close();
    });
    document.body.append(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));
    return close;
  }

  /* ------------------------ Animated number counter ----------------------- */
  function countUp(node, to, { duration = 900, suffix = "" } = {}) {
    const start = performance.now();
    const from = 0;
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      node.textContent = Math.round(from + (to - from) * eased) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* --------------------------- Circular gauge ----------------------------- */
  /**
   * Build an animated circular gauge (0-100).
   * @param {number} value
   * @param {object} opts { label, color, size }
   */
  function gauge(value, { label = "", color = "var(--neon)", size = 132 } = {}) {
    const r = size / 2 - 12;
    const circ = 2 * Math.PI * r;
    const wrap = el("div.gauge", { style: `width:${size}px;height:${size}px` });
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);

    const track = document.createElementNS(ns, "circle");
    track.setAttribute("cx", size / 2);
    track.setAttribute("cy", size / 2);
    track.setAttribute("r", r);
    track.setAttribute("class", "gauge-track");

    const prog = document.createElementNS(ns, "circle");
    prog.setAttribute("cx", size / 2);
    prog.setAttribute("cy", size / 2);
    prog.setAttribute("r", r);
    prog.setAttribute("class", "gauge-prog");
    prog.style.stroke = color;
    prog.style.strokeDasharray = circ;
    prog.style.strokeDashoffset = circ; // start empty
    prog.setAttribute(
      "transform",
      `rotate(-90 ${size / 2} ${size / 2})`
    );

    svg.append(track, prog);
    const center = el("div.gauge-center", {}, [
      el("div.gauge-value", { text: "0" }),
      label ? el("div.gauge-label", { text: label }) : null,
    ]);
    wrap.append(svg, center);

    // Animate when scrolled into view.
    const animate = () => {
      const offset = circ - (Math.max(0, Math.min(100, value)) / 100) * circ;
      requestAnimationFrame(() => (prog.style.strokeDashoffset = offset));
      countUp(center.querySelector(".gauge-value"), Math.round(value));
    };
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animate();
            obs.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    // Observe on next tick once mounted.
    setTimeout(() => io.observe(wrap), 0);
    return wrap;
  }

  /* --------------------------- Progress bar ------------------------------- */
  function progressBar(percent, { color = "var(--neon)" } = {}) {
    const wrap = el("div.pbar");
    const fill = el("div.pbar-fill", {
      style: `--target:${percent}%;background:${color}`,
    });
    wrap.append(fill);
    setTimeout(() => (fill.style.width = percent + "%"), 60);
    return wrap;
  }

  /* --------------------------- Photo picker ------------------------------- */
  /**
   * Prompt the user to pick an image file and return a resized base64 data URL.
   */
  function pickImage(maxSize = 512) {
    return new Promise((resolve) => {
      const input = el("input", { type: "file", accept: "image/*" });
      input.style.display = "none";
      document.body.append(input);
      input.addEventListener("change", () => {
        const file = input.files[0];
        input.remove();
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const c = document.createElement("canvas");
            c.width = Math.round(img.width * scale);
            c.height = Math.round(img.height * scale);
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            resolve(c.toDataURL("image/jpeg", 0.85));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
      input.click();
    });
  }

  /** Read any file as a base64 data URL (for attachments/PDFs). */
  function readFileAsDataURL(accept = "*/*") {
    return new Promise((resolve) => {
      const input = el("input", { type: "file", accept });
      input.style.display = "none";
      document.body.append(input);
      input.addEventListener("change", () => {
        const file = input.files[0];
        input.remove();
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () =>
          resolve({ name: file.name, type: file.type, dataUrl: reader.result });
        reader.readAsDataURL(file);
      });
      input.click();
    });
  }

  /* --------------------------- Workout table ------------------------------ */
  /**
   * Render a workout exactly in the coach's spreadsheet structure:
   *
   *   #  |  Sets & Reps  |  Exercise  |  Rest  |  Tools  |  Weight
   *
   * - A highlighted day-banner row spans the full width (e.g. "Pull 1").
   * - Rows are auto-numbered; blank cells are allowed (warm-ups / stretches)
   *   and render as a subtle dash.
   * - The Tools cell accepts free text incl. Arabic (dir="auto" handles RTL).
   * - On phones the table scrolls horizontally so no column gets crushed.
   *
   * @param {object} workout {title, rows:[{sets,exercise,rest,tools,weight}]}
   */
  function workoutTable(workout) {
    const scroll = el("div.wt-scroll");
    const table = el("table.wt");

    // Column headers
    const thead = el("thead", {}, [
      el("tr", {}, [
        el("th.wt-num", { text: "#" }),
        el("th", { text: "Sets & Reps" }),
        el("th.wt-ex", { text: "Exercise" }),
        el("th", { text: "Rest" }),
        el("th", { text: "Tools" }),
        el("th", { text: "Weight" }),
      ]),
    ]);

    const tbody = el("tbody");

    // Highlighted day banner (e.g. "Pull 1")
    tbody.append(
      el("tr.wt-banner", {}, [
        el("td", { colspan: "6", text: workout.title || "Workout" }),
      ])
    );

    // Blank cell → subtle dash so the grid stays readable
    const cell = (value, cls) => {
      const td = el("td", { class: cls || "" });
      const v = (value == null ? "" : String(value)).trim();
      if (v) {
        td.setAttribute("dir", "auto"); // supports Arabic / RTL notes
        td.textContent = v;
      } else {
        td.append(el("span.wt-empty", { text: "–" }));
      }
      return td;
    };

    (workout.rows || []).forEach((r, i) => {
      tbody.append(
        el("tr", {}, [
          el("td.wt-num", { text: String(i + 1) }),
          cell(r.sets),
          cell(r.exercise, "wt-ex"),
          cell(r.rest),
          cell(r.tools, "wt-tools"),
          cell(r.weight),
        ])
      );
    });

    table.append(thead, tbody);
    scroll.append(table);

    const wrap = el("div.wt-wrap", {}, [
      scroll,
      el("div.wt-hint", { text: "Swipe the table sideways to see every column" }),
    ]);
    return wrap;
  }

  /** Escape HTML for safe insertion. */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Resolve the display photo for a player (uploaded or generated avatar). */
  function photoOf(p) {
    return p.photo || generateAvatar(p.name, p.avatarSeed || 0);
  }

  /** Convert a YouTube URL to an embeddable form. */
  function youtubeEmbed(url) {
    const m = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/
    );
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  }

  return {
    el, $, $$, toast, modal, countUp, gauge, progressBar, workoutTable,
    pickImage, readFileAsDataURL, esc, photoOf, youtubeEmbed,
  };
})();
