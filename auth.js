/* =============================================================================
 * auth.js — PIN login modals (trainee + trainer)
 * -----------------------------------------------------------------------------
 * There are no usernames, passwords or accounts. Access is granted purely via
 * a 6-digit PIN entered on a modern keypad. A wrong PIN triggers an animated
 * shake + error message.
 * ========================================================================== */

const Auth = (() => {
  const { el, modal, toast } = UI;

  /**
   * Show a 6-digit PIN pad.
   * @param {object} cfg { title, subtitle, verify(pin)->bool, onSuccess() }
   */
  function pinPad({ title, subtitle, accent, verify, onSuccess }) {
    modal((close) => {
      const PIN_LEN = 4; // codes are 4 digits
      let pin = "";
      const dots = el("div.pin-dots");
      const errorEl = el("div.pin-error", { text: "" });

      function renderDots() {
        dots.innerHTML = "";
        for (let i = 0; i < PIN_LEN; i++) {
          const d = el("div.pin-dot");
          if (i < pin.length) d.classList.add("filled");
          dots.append(d);
        }
      }

      function fail() {
        errorEl.textContent = "Incorrect PIN — try again";
        const card = errorEl.closest(".pin-card");
        card.classList.remove("shake");
        void card.offsetWidth; // reflow to restart animation
        card.classList.add("shake");
        pin = "";
        renderDots();
        if (navigator.vibrate) navigator.vibrate(120);
      }

      function submit() {
        if (verify(pin)) {
          errorEl.textContent = "";
          const card = errorEl.closest(".pin-card");
          card.classList.add("success");
          setTimeout(() => {
            close();
            onSuccess();
          }, 420);
        } else {
          fail();
        }
      }

      function press(n) {
        if (pin.length >= PIN_LEN) return;
        pin += n;
        errorEl.textContent = "";
        renderDots();
        if (pin.length === PIN_LEN) setTimeout(submit, 180);
      }

      function backspace() {
        pin = pin.slice(0, -1);
        renderDots();
      }

      // Physical keyboard support.
      const keyHandler = (e) => {
        if (e.key >= "0" && e.key <= "9") press(e.key);
        else if (e.key === "Backspace") backspace();
        else if (e.key === "Enter" && pin.length === PIN_LEN) submit();
      };
      document.addEventListener("keydown", keyHandler);

      const pad = el("div.pin-grid");
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"].forEach(
        (k) => {
          const btn = el("button.pin-key", { type: "button", text: k });
          if (k === "⌫") btn.classList.add("alt"), (btn.onclick = backspace);
          else if (k === "✓")
            btn.classList.add("go"), (btn.onclick = submit);
          else btn.onclick = () => press(k);
          pad.append(btn);
        }
      );

      renderDots();

      const card = el("div.pin-card", {
        style: accent ? `--accent:${accent}` : "",
      }, [
        el("button.modal-close", { type: "button", text: "✕", onClick: () => {
          document.removeEventListener("keydown", keyHandler);
          close();
        } }),
        el("div.pin-title", { text: title }),
        el("div.pin-sub", { text: subtitle || "" }),
        dots,
        errorEl,
        pad,
      ]);

      // Clean up the key listener when the modal closes via overlay click.
      const observer = new MutationObserver(() => {
        if (!document.body.contains(card)) {
          document.removeEventListener("keydown", keyHandler);
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      return card;
    });
  }

  /** Trainee login for a specific player. */
  function loginTrainee(player, onSuccess) {
    pinPad({
      title: player.name,
      subtitle: "Enter your 4-digit PIN",
      accent: "var(--neon)",
      verify: (pin) => Store.verifyPlayerPin(player.id, pin),
      onSuccess: () => {
        toast("Welcome back, " + player.name.split(" ")[0], "success");
        onSuccess();
      },
    });
  }

  /** Trainer login. */
  function loginTrainer(onSuccess) {
    pinPad({
      title: "Trainer Access",
      subtitle: "Enter your coach PIN",
      accent: "var(--gold)",
      verify: (pin) => Store.verifyTrainerPin(pin),
      onSuccess: () => {
        toast("Trainer mode unlocked", "success");
        onSuccess();
      },
    });
  }

  return { loginTrainee, loginTrainer };
})();
