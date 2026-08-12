const MOBILE_QUERY = "(max-width: 940px)";
const SCROLL_PREFIX = "mangrok.mobile.scroll.";
const state = {
  mobile: matchMedia(MOBILE_QUERY).matches,
  keyboardOpen: false,
  view: location.hash.replace(/^#/, "") || "vault",
  alchemyStep: "elements",
  scrollFrame: 0,
  focusTimer: 0
};

if (typeof document !== "undefined") ready(init);

function ready(callback) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", callback, { once: true });
  else callback();
}

function init() {
  bindMoreSheet();
  bindViewport();
  bindScrollMemory();
  bindNavigationState();
  updateCompactLabels();
  updateViewportState();
  updateNavigationState(state.view);

  const media = matchMedia(MOBILE_QUERY);
  media.addEventListener?.("change", event => {
    state.mobile = event.matches;
    document.body.classList.toggle("mobile-app-mode", state.mobile);
    updateCompactLabels();
    updateViewportState();
  });
  document.body.classList.toggle("mobile-app-mode", state.mobile);
}

function bindMoreSheet() {
  const openButton = document.querySelector("#mobile-more-button");
  const dialog = document.querySelector("#mobile-more-dialog");
  const closeButton = document.querySelector("#mobile-more-close");
  if (!openButton || !dialog) return;

  openButton.addEventListener("click", () => {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });
  closeButton?.addEventListener("click", () => closeDialog(dialog));
  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeDialog(dialog);
    const destination = event.target.closest("[data-view]");
    if (destination) queueMicrotask(() => closeDialog(dialog));
    const action = event.target.closest("[data-mobile-action]")?.dataset.mobileAction;
    if (!action) return;
    if (action === "activity") document.querySelector("#notifications-button")?.click();
    if (action === "account") document.querySelector("#auth-button")?.click();
    if (action === "theme") document.querySelector("#food-theme-toggle")?.click();
    closeDialog(dialog);
  });
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeDialog(dialog);
  });
}

function bindViewport() {
  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", updateViewportState);
  viewport?.addEventListener("scroll", updateViewportState);
  window.addEventListener("resize", updateViewportState);
  window.addEventListener("orientationchange", () => setTimeout(updateViewportState, 120));

  document.addEventListener("focusin", event => {
    if (!state.mobile || !isKeyboardField(event.target)) return;
    clearTimeout(state.focusTimer);
    state.focusTimer = setTimeout(() => {
      updateViewportState();
      event.target.scrollIntoView({ block: "center", inline: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
    }, 180);
  });
  document.addEventListener("focusout", () => {
    clearTimeout(state.focusTimer);
    state.focusTimer = setTimeout(updateViewportState, 180);
  });
}

function updateViewportState() {
  const viewport = window.visualViewport;
  const height = viewport?.height || window.innerHeight;
  const offsetTop = viewport?.offsetTop || 0;
  const occluded = Math.max(0, window.innerHeight - height - offsetTop);
  const open = state.mobile && occluded > Math.max(130, window.innerHeight * 0.16);
  state.keyboardOpen = open;
  document.documentElement.style.setProperty("--mobile-visual-height", `${Math.round(height)}px`);
  document.documentElement.style.setProperty("--mobile-keyboard-height", `${Math.round(occluded)}px`);
  document.body.classList.toggle("mobile-keyboard-open", open);
}

function bindScrollMemory() {
  document.addEventListener("scroll", event => {
    if (!state.mobile || !event.target?.matches?.(".view.active")) return;
    cancelAnimationFrame(state.scrollFrame);
    state.scrollFrame = requestAnimationFrame(() => saveScroll(event.target));
  }, true);

  window.addEventListener("mangrok:view-changed", event => {
    const view = String(event.detail?.view || "vault");
    state.view = view;
    updateNavigationState(view);
    requestAnimationFrame(() => restoreActiveScroll(view));
  });
  window.addEventListener("mangrok:alchemy-step-changed", event => {
    state.alchemyStep = String(event.detail?.step || "elements");
    requestAnimationFrame(() => restoreActiveScroll("alchemy"));
  });
}

function bindNavigationState() {
  window.addEventListener("mangrok:app-ready", event => {
    const view = String(event.detail?.currentView || location.hash.replace(/^#/, "") || "vault");
    state.view = view;
    updateNavigationState(view);
  });
  window.addEventListener("hashchange", () => {
    const view = location.hash.replace(/^#/, "") || "vault";
    state.view = view;
    updateNavigationState(view);
  });
}

function updateNavigationState(view) {
  const moreActive = view === "legacy" || view === "settings";
  document.querySelectorAll(".mobile-nav [data-view]").forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    active ? button.setAttribute("aria-current", "page") : button.removeAttribute("aria-current");
  });
  document.querySelectorAll(".mobile-nav [data-alchemy-mobile]").forEach(button => {
    const active = view === "alchemy";
    button.classList.toggle("active", active);
    active ? button.setAttribute("aria-current", "page") : button.removeAttribute("aria-current");
  });
  const more = document.querySelector("#mobile-more-button");
  if (more) {
    more.classList.toggle("active", moreActive);
    moreActive ? more.setAttribute("aria-current", "page") : more.removeAttribute("aria-current");
  }
}

function updateCompactLabels() {
  const button = document.querySelector("#new-recipe-button");
  if (button) button.textContent = state.mobile ? "New" : "New recipe";
}

function saveScroll(viewNode) {
  const key = scrollKey(viewNode.dataset.viewPanel || state.view);
  try { sessionStorage.setItem(key, String(Math.max(0, Math.round(viewNode.scrollTop)))); } catch {}
}

function restoreActiveScroll(view) {
  if (!state.mobile) return;
  const node = document.querySelector(`[data-view-panel="${cssEscape(view)}"].active`);
  if (!node) return;
  let value = 0;
  try { value = Number(sessionStorage.getItem(scrollKey(view))) || 0; } catch {}
  node.scrollTop = Math.max(0, value);
}

function scrollKey(view) {
  return `${SCROLL_PREFIX}${view === "alchemy" ? `alchemy.${state.alchemyStep}` : view}`;
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (dialog.open && typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function isKeyboardField(node) {
  return node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement || node?.isContentEditable;
}

function reducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function cssEscape(value) {
  return globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-z0-9_-]/gi, "");
}
