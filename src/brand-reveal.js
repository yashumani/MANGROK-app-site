const SESSION_KEY = "mangrok.brand.reveal.session.v1";
const VISITED_KEY = "mangrok.brand.reveal.visited.v1";
const FULL_DURATION = 1900;
const RETURNING_DURATION = 760;

(function bootstrapBrandReveal() {
  if (typeof document === "undefined") return;
  const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  let alreadyShown = false;
  try { alreadyShown = sessionStorage.getItem(SESSION_KEY) === "shown"; } catch {}
  if (alreadyShown) return;
  document.documentElement.classList.add("brand-reveal-pending");
  const start = () => mountReveal({ reduced });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();

function mountReveal({ reduced = false } = {}) {
  if (document.querySelector("#mangrok-brand-reveal")) return;
  let firstVisit = true;
  try { firstVisit = localStorage.getItem(VISITED_KEY) !== "yes"; } catch {}
  const duration = reduced ? 120 : firstVisit ? FULL_DURATION : RETURNING_DURATION;
  const overlay = document.createElement("section");
  overlay.id = "mangrok-brand-reveal";
  overlay.className = "mangrok-brand-reveal";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");
  overlay.setAttribute("aria-label", "Mangrok is opening");
  overlay.innerHTML = `
    <button class="mangrok-brand-reveal__skip" type="button">Skip</button>
    <div class="mangrok-brand-reveal__stage">
      <div class="mangrok-brand-reveal__halo" aria-hidden="true"></div>
      <img class="mangrok-brand-reveal__mark" src="./assets/mangrok-mark.svg" alt="">
      <div class="mangrok-brand-reveal__book-line" aria-hidden="true"></div>
      <div class="mangrok-brand-reveal__copy"><strong>Mangrok</strong><span>Recipes · Smarter · Together</span></div>
    </div>
    <p class="mangrok-brand-reveal__status">Opening your recipe atelier</p>`;
  document.body.prepend(overlay);
  const finish = () => dismissReveal(overlay);
  overlay.querySelector("button")?.addEventListener("click", finish, { once: true });
  const timeout = setTimeout(finish, duration);
  overlay.addEventListener("mangrok:brand-dismiss", () => { clearTimeout(timeout); finish(); }, { once: true });
  try { localStorage.setItem(VISITED_KEY, "yes"); } catch {}
}

function dismissReveal(overlay) {
  if (!overlay || overlay.classList.contains("is-leaving")) return;
  overlay.classList.add("is-leaving");
  document.documentElement.classList.remove("brand-reveal-pending");
  try { sessionStorage.setItem(SESSION_KEY, "shown"); } catch {}
  setTimeout(() => overlay.remove(), 380);
}

export const BRAND_REVEAL_CONFIG = Object.freeze({ SESSION_KEY, VISITED_KEY, FULL_DURATION, RETURNING_DURATION });
