import { REFERENCE_RECIPES, REFERENCE_RECIPE_VERSION, cloneReferenceRecipe, getReferenceRecipe } from "./atelier-reference-recipes.js";

const PREFILL_KEY = "mangrok.reference.prefill.v1";
const state = { query: "", tradition: "All traditions", active: null };

ready(init);

function ready(callback) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", callback, { once: true });
  else callback();
}

function init() {
  document.documentElement.classList.add("recipe-atelier");
  addReferenceTable();
  addReferenceDialog();
  addAtelierAccents();
  bindPrefillRecovery();
  render();
}

function addReferenceTable() {
  if (document.querySelector("#reference-table")) return;
  const vault = document.querySelector("#view-vault, [data-view-panel='vault'], .vault-view, #main");
  if (!vault) return;
  const section = document.createElement("section");
  section.id = "reference-table";
  section.className = "reference-table atelier-section";
  section.setAttribute("aria-labelledby", "reference-table-title");
  section.innerHTML = `
    <header class="reference-table-hero">
      <div class="reference-table-copy">
        <p class="eyebrow">Mangrok reference table</p>
        <h2 id="reference-table-title">Begin with a recipe that already has a story.</h2>
        <p>Explore source-aware editorial references from several culinary traditions. Read the context, inspect the method, then create a private copy to adapt, evolve in Alchemy, preserve, share, or print.</p>
        <div class="reference-table-facts" aria-label="Reference collection facts">
          <span><b>${REFERENCE_RECIPES.length}</b> reviewed starting points</span>
          <span><b>${new Set(REFERENCE_RECIPES.map(item => item.tradition)).size}</b> culinary contexts</span>
          <span><b>${REFERENCE_RECIPE_VERSION}</b> reference edition</span>
        </div>
      </div>
      <img src="./assets/reference-recipes/atelier-hero.svg" alt="An original editorial illustration of a recipe table with bowls, produce, notes, and cooking vessels">
    </header>
    <div class="reference-table-toolbar">
      <label>
        <span>Find a reference</span>
        <input id="reference-search" type="search" autocomplete="off" placeholder="Search dish, region, ingredient, or tradition">
      </label>
      <label>
        <span>Culinary context</span>
        <select id="reference-tradition" aria-label="Filter reference recipes by culinary context"></select>
      </label>
      <p id="reference-count" aria-live="polite"></p>
    </div>
    <div id="reference-grid" class="reference-grid"></div>
    <footer class="reference-table-note">
      <p><b>About authenticity:</b> these are independently written editorial starting points, not claims that one standardized version is the only authentic expression of a dish. Every card exposes context, sources, adaptation notes, allergens, and its review state.</p>
    </footer>`;
  const anchor = vault.querySelector(".vault-hero, .dashboard-hero, .hero, .vault-summary, .kitchen-category-grid");
  if (anchor) anchor.insertAdjacentElement("afterend", section);
  else vault.prepend(section);

  const traditions = ["All traditions", ...new Set(REFERENCE_RECIPES.map(item => item.tradition))];
  section.querySelector("#reference-tradition").innerHTML = traditions.map(value => `<option>${escapeHtml(value)}</option>`).join("");
  section.querySelector("#reference-search").addEventListener("input", event => {
    state.query = event.currentTarget.value;
    render();
  });
  section.querySelector("#reference-tradition").addEventListener("change", event => {
    state.tradition = event.currentTarget.value;
    render();
  });
  section.querySelector("#reference-grid").addEventListener("click", event => {
    const view = event.target.closest("[data-reference-view]");
    const clone = event.target.closest("[data-reference-clone]");
    if (view) openReference(view.dataset.referenceView);
    if (clone) cloneIntoVault(clone.dataset.referenceClone);
  });
}

function addReferenceDialog() {
  if (document.querySelector("#reference-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "reference-dialog";
  dialog.className = "reference-dialog";
  dialog.setAttribute("aria-labelledby", "reference-dialog-title");
  dialog.innerHTML = `<form method="dialog" class="reference-dialog-shell"><button class="reference-dialog-close" value="close" aria-label="Close recipe reference">Close</button><div id="reference-dialog-content"></div></form>`;
  document.body.append(dialog);
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
    const clone = event.target.closest("[data-dialog-clone]");
    if (clone) {
      event.preventDefault();
      cloneIntoVault(clone.dataset.dialogClone);
    }
  });
}

function addAtelierAccents() {
  const vaultTitle = document.querySelector("#view-vault h1, #view-vault h2, [data-view-panel='vault'] h1");
  if (vaultTitle && !vaultTitle.dataset.atelierOriginal) {
    vaultTitle.dataset.atelierOriginal = vaultTitle.textContent || "Recipe Vault";
  }
  const print = document.querySelector("#view-print, [data-view-panel='print']");
  if (print) print.classList.add("atelier-print-studio");
  const alchemy = document.querySelector("#view-alchemy, [data-view-panel='alchemy']");
  if (alchemy) alchemy.classList.add("atelier-alchemy-lab");
}

function render() {
  const grid = document.querySelector("#reference-grid");
  const count = document.querySelector("#reference-count");
  if (!grid) return;
  const query = normalize(state.query);
  const rows = REFERENCE_RECIPES.filter(item => {
    if (state.tradition !== "All traditions" && item.tradition !== state.tradition) return false;
    if (!query) return true;
    return normalize([
      item.title,
      item.subtitle,
      item.tradition,
      item.region,
      item.context,
      ...item.ingredients,
      ...item.dietary
    ].join(" ")).includes(query);
  });
  grid.innerHTML = rows.map(card).join("");
  if (count) count.textContent = `${rows.length} reference${rows.length === 1 ? "" : "s"}`;
}

function card(item) {
  const dietary = item.dietary.slice(0, 2).map(value => `<span>${escapeHtml(value)}</span>`).join("");
  const allergy = item.allergens.length ? `${item.allergens.length} allergen note${item.allergens.length === 1 ? "" : "s"}` : "No declared major allergen";
  return `
    <article class="reference-card">
      <button type="button" class="reference-card-image" data-reference-view="${escapeAttribute(item.id)}" aria-label="Read ${escapeAttribute(item.title)} reference">
        <img src="${escapeAttribute(item.image)}" alt="Original Mangrok illustration for ${escapeAttribute(item.title)}">
        <span>${escapeHtml(item.region)}</span>
      </button>
      <div class="reference-card-body">
        <p class="reference-card-tradition">${escapeHtml(item.tradition)}</p>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.subtitle)}</p>
        <div class="reference-card-meta">
          <span>${item.time} min</span><span>${escapeHtml(item.difficulty)}</span><span>${item.servings} servings</span>
        </div>
        <div class="reference-card-tags">${dietary}</div>
        <small>${escapeHtml(allergy)} · ${escapeHtml(item.reviewState)}</small>
      </div>
      <footer>
        <button type="button" class="button ghost" data-reference-view="${escapeAttribute(item.id)}">Read reference</button>
        <button type="button" class="button primary" data-reference-clone="${escapeAttribute(item.id)}">Use as a starting point</button>
      </footer>
    </article>`;
}

function openReference(id) {
  const item = getReferenceRecipe(id);
  const dialog = document.querySelector("#reference-dialog");
  const root = document.querySelector("#reference-dialog-content");
  if (!item || !dialog || !root) return;
  state.active = item.id;
  root.innerHTML = `
    <article class="reference-detail">
      <header class="reference-detail-hero">
        <img src="${escapeAttribute(item.image)}" alt="Original Mangrok illustration for ${escapeAttribute(item.title)}">
        <div>
          <p class="eyebrow">${escapeHtml(item.tradition)}</p>
          <h2 id="reference-dialog-title">${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(item.subtitle)}</p>
          <div class="reference-detail-meta"><span>${escapeHtml(item.region)}</span><span>${item.time} min</span><span>${item.servings} servings</span><span>${escapeHtml(item.difficulty)}</span></div>
          <button type="button" class="button primary" data-dialog-clone="${escapeAttribute(item.id)}">Create a private editable copy</button>
        </div>
      </header>
      <section class="reference-context">
        <div><p class="eyebrow">Cultural context</p><p>${escapeHtml(item.context)}</p></div>
        <div><p class="eyebrow">Mangrok adaptation note</p><p>${escapeHtml(item.adaptation)}</p></div>
      </section>
      <section class="reference-detail-grid">
        <div class="reference-ingredients"><p class="eyebrow">Ingredients</p><h3>What to prepare</h3><ul>${item.ingredients.map(value => `<li>${escapeHtml(value)}</li>`).join("")}</ul></div>
        <div class="reference-method"><p class="eyebrow">Method</p><h3>How the formula evolves</h3><ol>${item.steps.map(value => `<li>${escapeHtml(value)}</li>`).join("")}</ol></div>
      </section>
      <section class="reference-facts">
        <div><p class="eyebrow">Equipment</p><p>${item.equipment.map(escapeHtml).join(" · ")}</p></div>
        <div><p class="eyebrow">Dietary context</p><p>${item.dietary.map(escapeHtml).join(" · ") || "No classification supplied"}</p></div>
        <div><p class="eyebrow">Allergen notes</p><p>${item.allergens.map(escapeHtml).join(" · ") || "No major allergen declared in this reference; verify every product label and kitchen environment."}</p></div>
      </section>
      <section class="reference-sources"><p class="eyebrow">Sources and review</p><h3>Why this reference looks this way</h3><p>Reviewed ${escapeHtml(item.reviewedAt)}. Source material verifies identity, context, characteristic ingredients, method, or safety boundaries; Mangrok’s wording is independently written.</p><ul>${item.sources.map(source => `<li><a href="${escapeAttribute(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.name)}</a><span>${escapeHtml(source.purpose)}</span></li>`).join("")}</ul></section>
    </article>`;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function cloneIntoVault(id) {
  const item = getReferenceRecipe(id);
  if (!item) return;
  const cloned = cloneReferenceRecipe(item);
  try { localStorage.setItem(PREFILL_KEY, JSON.stringify(cloned)); } catch {}
  const detail = { recipe: cloned, reference: item, source: "reference-table" };
  window.dispatchEvent(new CustomEvent("mangrok:prefill-recipe", { detail }));
  window.dispatchEvent(new CustomEvent("mangrok:open-recipe-editor", { detail }));
  document.dispatchEvent(new CustomEvent("mangrok:reference-recipe", { detail }));
  document.querySelector("#reference-dialog")?.close?.();
  document.querySelector("#new-recipe-button, [data-new-recipe], .new-recipe-button")?.click?.();
  setTimeout(() => applyToVisibleEditor(cloned), 120);
  setTimeout(() => applyToVisibleEditor(cloned), 450);
  announce(`Created an editable starting point from ${item.title}. Review the recipe before saving it to your Vault.`);
}

function applyToVisibleEditor(recipe) {
  const values = [
    [["#recipe-title", "#recipe-name", "[name='title']", "[name='name']"], recipe.title],
    [["#recipe-summary", "#recipe-description", "[name='summary']", "[name='description']"], recipe.summary],
    [["#recipe-ingredients", "[name='ingredients']"], recipe.ingredients.join("\n")],
    [["#recipe-steps", "#recipe-method", "#recipe-instructions", "[name='steps']", "[name='instructions']"], recipe.steps.map((step, index) => `${index + 1}. ${step.text}`).join("\n")],
    [["#recipe-equipment", "[name='equipment']"], recipe.equipment.join("\n")],
    [["#recipe-tags", "[name='tags']"], recipe.tags.join(", ")],
    [["#recipe-story", "[name='story']"], recipe.story],
    [["#recipe-time", "[name='timeMinutes']", "[name='time']"], String(recipe.timeMinutes)],
    [["#recipe-servings", "[name='servings']"], String(recipe.servings)]
  ];
  let changed = 0;
  for (const [selectors, value] of values) {
    const field = selectors.map(selector => document.querySelector(selector)).find(Boolean);
    if (!field || field.value) continue;
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    changed += 1;
  }
  if (changed) {
    try { localStorage.removeItem(PREFILL_KEY); } catch {}
  }
}

function bindPrefillRecovery() {
  document.addEventListener("click", event => {
    if (!event.target.closest("#new-recipe-button, [data-new-recipe], .new-recipe-button")) return;
    let recipe = null;
    try { recipe = JSON.parse(localStorage.getItem(PREFILL_KEY) || "null"); } catch {}
    if (recipe) setTimeout(() => applyToVisibleEditor(recipe), 160);
  });
}

function announce(message) {
  const region = document.querySelector("#toast, #status-message, [aria-live='polite']");
  if (region) {
    region.textContent = message;
    region.hidden = false;
  }
  window.dispatchEvent(new CustomEvent("mangrok:announce", { detail: { message } }));
}

function normalize(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function escapeAttribute(value) { return escapeHtml(value); }
