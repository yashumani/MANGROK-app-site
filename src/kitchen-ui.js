import {
  INGREDIENT_LIBRARY,
  EQUIPMENT_LIBRARY,
  KITCHEN_LIBRARY_COUNTS,
  kitchenCategories,
  findKitchenItem
} from "./kitchen-library.js";

const TOOL_PREFIX = "tool:";
const state = {
  mode: "ingredients",
  category: "All",
  query: "",
  selectedIngredients: new Set(),
  selectedEquipment: new Set(),
  editorSessionId: null
};

whenReady(init);

function whenReady(callback) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", callback, { once: true });
  else callback();
}

function init() {
  enhanceHeader();
  enhanceVaultLanding();
  enhanceRecipeEditor();
  createKitchenDialog();
  observeRecipeEditor();
  observeRenderedRecipes();
  observeRecipeViewer();
  applyStoredTheme();
}

function enhanceHeader() {
  const titleBlock = document.querySelector(".topbar > div:first-child");
  if (titleBlock && !titleBlock.querySelector(".topbar-product-name")) {
    const product = document.createElement("p");
    product.className = "topbar-product-name";
    product.textContent = "Mangrok";
    titleBlock.prepend(product);
  }

  const sidebarDescriptor = document.querySelector(".brand small");
  if (sidebarDescriptor) sidebarDescriptor.textContent = "Private culinary archive";

  const actions = document.querySelector(".top-actions");
  if (actions && !document.querySelector("#food-theme-toggle")) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.id = "food-theme-toggle";
    toggle.className = "icon-button food-theme-toggle";
    toggle.setAttribute("aria-label", "Switch Mangrok color theme");
    toggle.title = "Switch color theme";
    toggle.textContent = "◐";
    actions.prepend(toggle);
    toggle.addEventListener("click", () => {
      const enabled = document.body.classList.toggle("food-night");
      localStorage.setItem("mangrok.food-theme", enabled ? "night" : "day");
      toggle.setAttribute("aria-pressed", String(enabled));
    });
  }
}

function enhanceVaultLanding() {
  const hero = document.querySelector("#view-vault .hero-panel");
  if (!hero || document.querySelector(".food-library-preview")) return;

  hero.classList.add("food-first-hero");
  const text = hero.firstElementChild;
  if (text && !text.querySelector(".food-hero-still-life")) {
    text.insertAdjacentHTML("beforeend", `
      <div class="food-hero-still-life" aria-label="Mangrok visual kitchen library">
        <span><b>🍅</b><small>Fresh</small></span>
        <span><b>🌿</b><small>Aromatic</small></span>
        <span><b>🍳</b><small>Essential</small></span>
        <span><b>🔪</b><small>Prepared</small></span>
      </div>`);
  }

  const preview = document.createElement("section");
  preview.className = "food-library-preview";
  preview.setAttribute("aria-labelledby", "food-library-heading");
  preview.innerHTML = `
    <div class="food-library-heading">
      <div>
        <p class="eyebrow">Visual kitchen library</p>
        <h2 id="food-library-heading">Build a recipe from ingredients, tools, and memory.</h2>
      </div>
      <p>${KITCHEN_LIBRARY_COUNTS.total} illustrated choices are ready, with custom entries for everything unique to your kitchen.</p>
    </div>
    <div class="food-library-cards">
      ${previewCard("ingredients", "Vegetables", "🥬", "Fresh ingredients", "Produce, fruit, herbs, dairy and proteins")}
      ${previewCard("ingredients", "Herbs & spices", "🫙", "Pantry & spice shelf", "Grains, baking staples, sauces and aromatics")}
      ${previewCard("equipment", "Cookware", "🍳", "Cookware", "Pans, pots, steamers, woks and specialty vessels")}
      ${previewCard("equipment", "Utensils", "🔪", "Utensils & prep tools", "Knives, spoons, whisks, graters and measuring tools")}
    </div>`;
  hero.insertAdjacentElement("afterend", preview);
  preview.addEventListener("click", event => {
    const card = event.target.closest("[data-kitchen-preview]");
    if (!card) return;
    openEditorAndLibrary(card.dataset.mode, card.dataset.category);
  });
}

function previewCard(mode, category, icon, title, description) {
  return `<button type="button" class="food-library-card" data-kitchen-preview data-mode="${escapeAttribute(mode)}" data-category="${escapeAttribute(category)}">
    <span class="food-library-visual" aria-hidden="true">${icon}</span>
    <span><b>${escapeHtml(title)}</b><small>${escapeHtml(description)}</small></span>
    <i aria-hidden="true">↗</i>
  </button>`;
}

function enhanceRecipeEditor() {
  const form = document.querySelector("#recipe-form");
  const ingredients = form?.elements?.ingredients;
  if (!form || !ingredients || document.querySelector("#kitchen-library-launch")) return;

  const ingredientLabel = ingredients.closest("label");
  const panel = document.createElement("section");
  panel.id = "kitchen-library-launch";
  panel.className = "kitchen-library-launch span-2";
  panel.innerHTML = `
    <div class="kitchen-launch-copy">
      <p class="eyebrow">Visual selection</p>
      <h3>Choose from the Mangrok kitchen library</h3>
      <p>Add familiar ingredients with a tap, then refine quantities in the recipe. Select the exact cookware and utensils needed for anyone who inherits it.</p>
    </div>
    <div class="kitchen-launch-actions">
      <button class="button secondary" type="button" data-open-kitchen="ingredients">Choose ingredients</button>
      <button class="button ghost" type="button" data-open-kitchen="equipment">Choose equipment</button>
    </div>
    <div class="equipment-summary" id="equipment-summary" aria-live="polite">No equipment selected yet.</div>`;
  ingredientLabel.insertAdjacentElement("afterend", panel);

  panel.addEventListener("click", event => {
    const button = event.target.closest("[data-open-kitchen]");
    if (button) openKitchenLibrary(button.dataset.openKitchen);
  });

  form.addEventListener("submit", prepareEquipmentTagsForSave, true);
}

function createKitchenDialog() {
  if (document.querySelector("#kitchen-library-dialog")) return;
  const dialog = document.createElement("dialog");
  dialog.id = "kitchen-library-dialog";
  dialog.className = "modal wide-modal kitchen-library-dialog";
  dialog.innerHTML = `
    <div class="modal-shell kitchen-library-shell">
      <header>
        <div><p class="eyebrow">Food-first recipe entry</p><h2>Kitchen library</h2><p class="kitchen-dialog-intro">Select illustrated ingredients, cookware, appliances and utensils. Custom items remain available for family-specific tools and regional ingredients.</p></div>
        <button type="button" class="icon-button" data-kitchen-close aria-label="Close">×</button>
      </header>
      <div class="kitchen-library-controls">
        <div class="kitchen-mode-tabs" role="tablist" aria-label="Kitchen library type">
          <button type="button" role="tab" data-kitchen-mode="ingredients">Ingredients <small>${KITCHEN_LIBRARY_COUNTS.ingredients}</small></button>
          <button type="button" role="tab" data-kitchen-mode="equipment">Equipment <small>${KITCHEN_LIBRARY_COUNTS.equipment}</small></button>
        </div>
        <label class="kitchen-search"><span aria-hidden="true">⌕</span><span class="sr-only">Search kitchen library</span><input id="kitchen-library-search" type="search" autocomplete="off" placeholder="Search tomato, saffron, skillet, whisk…"></label>
      </div>
      <div class="kitchen-category-list" id="kitchen-category-list" aria-label="Kitchen library categories"></div>
      <div class="kitchen-grid" id="kitchen-library-grid" role="list"></div>
      <div class="kitchen-empty" id="kitchen-library-empty" hidden>No matching items. Add a custom ingredient or tool below.</div>
      <section class="kitchen-selection-panel">
        <div><p class="eyebrow">Selected</p><div class="kitchen-selected-tray" id="kitchen-selected-tray"></div></div>
        <div class="kitchen-custom-entry">
          <label for="kitchen-custom-input">Custom item</label>
          <div><input id="kitchen-custom-input" maxlength="80" placeholder="Family spice blend or special vessel"><button class="mini-button" type="button" id="kitchen-custom-add">Add</button></div>
        </div>
      </section>
      <footer>
        <button type="button" class="button ghost" id="kitchen-clear-selection">Clear selection</button>
        <span class="kitchen-selection-count" id="kitchen-selection-count">0 selected</span>
        <button type="button" class="button primary" id="kitchen-apply-selection">Add to recipe</button>
      </footer>
    </div>`;
  document.body.append(dialog);

  dialog.querySelector("[data-kitchen-close]").addEventListener("click", () => dialog.close());
  dialog.querySelector("#kitchen-library-search").addEventListener("input", event => {
    state.query = event.currentTarget.value;
    renderKitchenLibrary();
  });
  dialog.querySelector(".kitchen-mode-tabs").addEventListener("click", event => {
    const button = event.target.closest("[data-kitchen-mode]");
    if (!button) return;
    state.mode = button.dataset.kitchenMode;
    state.category = "All";
    state.query = "";
    dialog.querySelector("#kitchen-library-search").value = "";
    renderKitchenLibrary();
  });
  dialog.querySelector("#kitchen-category-list").addEventListener("click", event => {
    const button = event.target.closest("[data-kitchen-category]");
    if (!button) return;
    state.category = button.dataset.kitchenCategory;
    renderKitchenLibrary();
  });
  dialog.querySelector("#kitchen-library-grid").addEventListener("click", event => {
    const card = event.target.closest("[data-kitchen-item]");
    if (!card) return;
    toggleSelection(card.dataset.kitchenItem);
  });
  dialog.querySelector("#kitchen-selected-tray").addEventListener("click", event => {
    const button = event.target.closest("[data-remove-kitchen-item]");
    if (!button) return;
    currentSelection().delete(button.dataset.removeKitchenItem);
    renderKitchenLibrary();
  });
  dialog.querySelector("#kitchen-custom-add").addEventListener("click", addCustomKitchenItem);
  dialog.querySelector("#kitchen-custom-input").addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); addCustomKitchenItem(); }
  });
  dialog.querySelector("#kitchen-clear-selection").addEventListener("click", () => {
    currentSelection().clear();
    renderKitchenLibrary();
  });
  dialog.querySelector("#kitchen-apply-selection").addEventListener("click", applyKitchenSelection);
}

function observeRecipeEditor() {
  const dialog = document.querySelector("#recipe-dialog");
  if (!dialog) return;
  const observer = new MutationObserver(() => {
    if (dialog.open) syncEditorSelections();
    else state.editorSessionId = null;
  });
  observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
}

function syncEditorSelections() {
  const form = document.querySelector("#recipe-form");
  if (!form) return;
  const sessionId = String(form.elements.id?.value || "new");
  if (state.editorSessionId === sessionId) return;
  state.editorSessionId = sessionId;

  const parsedTags = splitTags(form.elements.tags?.value || "");
  const equipment = parsedTags.filter(isToolTag).map(tag => displayToolName(tag.slice(TOOL_PREFIX.length)));
  state.selectedEquipment = new Set(equipment);
  if (form.elements.tags) form.elements.tags.value = parsedTags.filter(tag => !isToolTag(tag)).join(", ");

  const ingredientLines = splitLines(form.elements.ingredients?.value || "").map(value => value.toLowerCase());
  state.selectedIngredients = new Set(INGREDIENT_LIBRARY.filter(item => ingredientLines.some(line => line.includes(item.name.toLowerCase()))).map(item => item.name));
  renderEquipmentSummary();
}

function prepareEquipmentTagsForSave(event) {
  if (event.submitter?.value !== "save") return;
  const form = event.currentTarget;
  const tagsInput = form.elements.tags;
  if (!tagsInput) return;
  const visibleTags = splitTags(tagsInput.value).filter(tag => !isToolTag(tag));
  const toolTags = [...state.selectedEquipment].map(name => `${TOOL_PREFIX}${name}`);
  tagsInput.value = [...visibleTags, ...toolTags].join(", ");
  queueMicrotask(() => {
    if (form.closest("dialog")?.open) tagsInput.value = visibleTags.join(", ");
  });
}

function openEditorAndLibrary(mode, category = "All") {
  const recipeDialog = document.querySelector("#recipe-dialog");
  if (!recipeDialog?.open) document.querySelector("#new-recipe-button")?.click();
  const wait = () => {
    if (recipeDialog?.open) openKitchenLibrary(mode, category);
    else setTimeout(wait, 35);
  };
  wait();
}

function openKitchenLibrary(mode = "ingredients", category = "All") {
  const recipeDialog = document.querySelector("#recipe-dialog");
  if (!recipeDialog?.open) return openEditorAndLibrary(mode, category);
  syncEditorSelections();
  state.mode = mode === "equipment" ? "equipment" : "ingredients";
  state.category = kitchenCategories(state.mode).includes(category) ? category : "All";
  state.query = "";
  const dialog = document.querySelector("#kitchen-library-dialog");
  dialog.querySelector("#kitchen-library-search").value = "";
  renderKitchenLibrary();
  dialog.showModal();
}

function renderKitchenLibrary() {
  const dialog = document.querySelector("#kitchen-library-dialog");
  if (!dialog) return;
  const source = state.mode === "equipment" ? EQUIPMENT_LIBRARY : INGREDIENT_LIBRARY;
  const selected = currentSelection();
  const query = state.query.trim().toLowerCase();
  const filtered = source.filter(item => (state.category === "All" || item.category === state.category) && (!query || `${item.name} ${item.category}`.toLowerCase().includes(query)));

  dialog.querySelectorAll("[data-kitchen-mode]").forEach(button => {
    const active = button.dataset.kitchenMode === state.mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  dialog.querySelector("#kitchen-category-list").innerHTML = kitchenCategories(state.mode).map(category => `<button type="button" class="${category === state.category ? "active" : ""}" data-kitchen-category="${escapeAttribute(category)}">${escapeHtml(category)}</button>`).join("");
  dialog.querySelector("#kitchen-library-grid").innerHTML = filtered.map(item => kitchenCard(item, selected.has(item.name))).join("");
  dialog.querySelector("#kitchen-library-empty").hidden = filtered.length > 0;
  renderSelectedTray();
}

function kitchenCard(item, selected) {
  return `<button type="button" class="kitchen-item-card ${selected ? "selected" : ""}" data-kitchen-item="${escapeAttribute(item.name)}" aria-pressed="${selected}" role="listitem">
    <span class="kitchen-item-visual" aria-hidden="true">${item.icon}</span>
    <span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.category)}</small></span>
    <i aria-hidden="true">${selected ? "✓" : "+"}</i>
  </button>`;
}

function currentSelection() {
  return state.mode === "equipment" ? state.selectedEquipment : state.selectedIngredients;
}

function toggleSelection(name) {
  const selected = currentSelection();
  if (selected.has(name)) selected.delete(name); else selected.add(name);
  renderKitchenLibrary();
}

function addCustomKitchenItem() {
  const input = document.querySelector("#kitchen-custom-input");
  const name = String(input.value || "").trim().replaceAll(",", " ").slice(0, 80);
  if (!name) return;
  currentSelection().add(name);
  input.value = "";
  renderKitchenLibrary();
}

function renderSelectedTray() {
  const dialog = document.querySelector("#kitchen-library-dialog");
  const selected = [...currentSelection()];
  dialog.querySelector("#kitchen-selected-tray").innerHTML = selected.length ? selected.map(name => `<button type="button" data-remove-kitchen-item="${escapeAttribute(name)}"><span>${escapeHtml(iconFor(name, state.mode))}</span>${escapeHtml(name)}<i aria-hidden="true">×</i></button>`).join("") : `<p>Nothing selected in this section yet.</p>`;
  dialog.querySelector("#kitchen-selection-count").textContent = `${selected.length} selected`;
}

function applyKitchenSelection() {
  const form = document.querySelector("#recipe-form");
  if (!form) return;
  if (state.mode === "ingredients") {
    const current = splitLines(form.elements.ingredients.value);
    const normalized = new Set(current.map(value => value.toLowerCase()));
    for (const name of state.selectedIngredients) if (!normalized.has(name.toLowerCase())) current.push(name);
    form.elements.ingredients.value = current.join("\n");
    form.elements.ingredients.dispatchEvent(new Event("input", { bubbles: true }));
  }
  renderEquipmentSummary();
  document.querySelector("#kitchen-library-dialog")?.close();
}

function renderEquipmentSummary() {
  const summary = document.querySelector("#equipment-summary");
  if (!summary) return;
  const values = [...state.selectedEquipment];
  summary.innerHTML = values.length ? `<b>${values.length} selected:</b> ${values.map(value => `<span>${escapeHtml(value)}</span>`).join("")}` : "No equipment selected yet.";
}

function observeRenderedRecipes() {
  const grid = document.querySelector("#recipe-grid");
  if (!grid) return;
  const enhance = () => grid.querySelectorAll(".recipe-card").forEach(enhanceRecipeCard);
  new MutationObserver(enhance).observe(grid, { childList: true, subtree: true });
  enhance();
}

function enhanceRecipeCard(card) {
  if (card.dataset.kitchenEnhanced === "true") return;
  const toolTags = [...card.querySelectorAll(".tag")].filter(tag => isToolTag(tag.textContent));
  if (!toolTags.length) { card.dataset.kitchenEnhanced = "true"; return; }
  toolTags.forEach(tag => tag.remove());
  const meta = card.querySelector(".card-meta");
  if (meta) meta.insertAdjacentHTML("beforeend", `<span class="equipment-meta">♨ ${toolTags.length} tool${toolTags.length === 1 ? "" : "s"}</span>`);
  card.dataset.kitchenEnhanced = "true";
}

function observeRecipeViewer() {
  const content = document.querySelector("#viewer-content");
  if (!content) return;
  const enhance = () => {
    const toolTags = [...content.querySelectorAll(".tag")].filter(tag => isToolTag(tag.textContent));
    if (!toolTags.length || content.querySelector(".viewer-equipment")) return;
    const names = toolTags.map(tag => displayToolName(tag.textContent.slice(TOOL_PREFIX.length)));
    toolTags.forEach(tag => tag.remove());
    const target = content.querySelector(".viewer-layout > div:nth-child(2)") || content;
    target.insertAdjacentHTML("beforeend", `<section class="viewer-equipment"><p class="eyebrow">Kitchen setup</p><h3>Equipment & utensils</h3><div>${names.map(name => `<span><b aria-hidden="true">${escapeHtml(iconFor(name, "equipment"))}</b>${escapeHtml(name)}</span>`).join("")}</div></section>`);
  };
  new MutationObserver(enhance).observe(content, { childList: true, subtree: true });
  enhance();
}

function applyStoredTheme() {
  const enabled = localStorage.getItem("mangrok.food-theme") === "night";
  document.body.classList.toggle("food-night", enabled);
  document.querySelector("#food-theme-toggle")?.setAttribute("aria-pressed", String(enabled));
}

function iconFor(name, mode) {
  const found = findKitchenItem(name, mode);
  return found?.icon || (mode === "equipment" ? "♨" : "✦");
}

function displayToolName(value) {
  const cleaned = String(value || "").trim();
  const found = findKitchenItem(cleaned, "equipment");
  if (found) return found.name;
  return cleaned.replace(/\b\w/g, character => character.toUpperCase());
}

function splitTags(value) {
  return String(value || "").split(",").map(tag => tag.trim()).filter(Boolean);
}

function splitLines(value) {
  return String(value || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function isToolTag(value) {
  return String(value || "").trim().toLowerCase().startsWith(TOOL_PREFIX);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}
