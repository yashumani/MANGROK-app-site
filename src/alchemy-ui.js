import { INGREDIENT_LIBRARY, EQUIPMENT_LIBRARY, kitchenCategories } from "./kitchen-library.js";
import { TECHNIQUES, HEAT_LEVELS, GOALS, FLAVORS, simulateAlchemy } from "./culinary-engine.js";
import { enhanceWithLocalAI, getLocalAICapabilities } from "./local-ai.js";
import { consumeLocalTrial, entitlementDisplay, normalizeAlchemyEntitlement, readLocalTrial } from "./entitlements.js";
import { GENERATED_IMAGES as IMG } from "./generated-images.js";

const SETTINGS_KEY = "mangrok.alchemy.settings.v1";
const state = {
  mode: "ingredients",
  category: "All",
  query: "",
  ingredients: new Set(["Chicken", "Garlic", "Lemon", "Tomato", "Olive oil", "Basil"]),
  equipment: new Set(["Cast-iron skillet", "Tongs"]),
  technique: "sear",
  heat: "medium-high",
  time: 18,
  servings: 2,
  goal: "balanced",
  provider: "rules",
  busy: false,
  result: null,
  experimentId: null,
  settings: loadSettings(),
  appStatus: {},
  entitlement: null,
  recentExperiments: []
};

ready(init);

function ready(callback) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", callback, { once: true });
  else callback();
}

async function init() {
  addNav();
  addView();
  bindStandardNav();
  renderAll();
  await refreshAccountState();
  window.addEventListener("mangrok:app-ready", refreshAccountState);
  window.addEventListener("mangrok:auth", refreshAccountState);
  if (location.hash === "#alchemy") setTimeout(open, 100);
}

function addNav() {
  const desktop = document.querySelector(".nav-list");
  if (desktop && !desktop.querySelector("[data-alchemy-nav]")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-item";
    button.dataset.alchemyNav = "";
    button.textContent = "Alchemy Lab";
    desktop.querySelector('[data-view="circles"]')?.insertAdjacentElement("beforebegin", button);
    button.addEventListener("click", open);
  }
  const mobile = document.querySelector(".mobile-nav");
  if (mobile && !mobile.querySelector("[data-alchemy-mobile]")) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.alchemyMobile = "";
    button.textContent = "Alchemy";
    mobile.querySelector('[data-view="circles"]')?.insertAdjacentElement("beforebegin", button);
    button.addEventListener("click", open);
  }
}

function addView() {
  const main = document.querySelector("#main");
  if (!main || document.querySelector("#view-alchemy")) return;
  const section = document.createElement("section");
  section.id = "view-alchemy";
  section.className = "view alchemy-view";
  section.dataset.viewPanel = "alchemy";
  section.innerHTML = `
    <section class="alchemy-hero">
      <img src="${IMG.hero}" alt="A generated cinematic cooking laboratory">
      <div><p class="eyebrow">Mangrok culinary discovery engine</p><h2>Build a dish as a living formula.</h2><p>Combine ingredients, cookware, heat, time, and technique. Mangrok predicts balance, risk, and evolution; optional local or subscriber AI can refine the assessment.</p><div id="alchemy-trials"></div></div>
    </section>
    <section class="alchemy-grid">
      <article class="panel alchemy-library">
        <header><div><p class="eyebrow">Elements</p><h3>Kitchen library</h3></div><b id="alchemy-count"></b></header>
        <div class="alchemy-tabs"><button data-mode="ingredients">Ingredients</button><button data-mode="equipment">Equipment</button></div>
        <div class="alchemy-search"><input id="alchemy-search" type="search" placeholder="Search ingredients or equipment"><select id="alchemy-category" aria-label="Filter Alchemy library"></select></div>
        <div id="alchemy-cards" class="alchemy-cards"></div>
        <div class="alchemy-custom"><input id="alchemy-custom" maxlength="80" placeholder="Custom family element"><button class="mini-button" id="alchemy-add" type="button">Add item</button></div>
      </article>
      <article class="panel alchemy-formula">
        <header><p class="eyebrow">Formula</p><h3>Active experiment</h3></header>
        <h4>Ingredients</h4><div class="alchemy-selected" id="alchemy-selected-ingredients"></div>
        <h4>Equipment</h4><div class="alchemy-selected" id="alchemy-selected-equipment"></div>
        <div class="alchemy-controls">
          <label>Technique<select id="alchemy-technique">${TECHNIQUES.map(value => `<option value="${value.id}">${value.label}</option>`).join("")}</select></label>
          <label>Heat<select id="alchemy-heat">${HEAT_LEVELS.map(value => `<option value="${value.id}">${value.label}</option>`).join("")}</select></label>
          <label>Minutes<input id="alchemy-time" type="number" min="1" max="360" value="18"></label>
          <label>Servings<input id="alchemy-servings" type="number" min="1" max="24" value="2"></label>
          <label class="wide">Direction<select id="alchemy-goal">${GOALS.map(value => `<option value="${value.id}">${value.label}</option>`).join("")}</select></label>
        </div>
        <section class="alchemy-provider">
          <div class="alchemy-provider-heading"><div><p class="eyebrow">Reasoning mode</p><p id="alchemy-entitlement-note"></p></div><button class="mini-button" id="alchemy-refresh-access" type="button">Refresh access</button></div>
          <div id="alchemy-providers"></div>
          <details><summary>Self-hosted model settings</summary><label>Endpoint<input id="alchemy-endpoint" value="${escapeAttribute(state.settings.url)}"></label><label>Model<input id="alchemy-model" value="${escapeAttribute(state.settings.model)}"></label><button class="mini-button" id="alchemy-save-settings" type="button">Save local settings</button></details>
          <div id="alchemy-progress" hidden><i><b></b></i><p></p></div>
        </section>
        <div class="button-row"><button class="button primary" id="alchemy-run" type="button">Run Alchemy</button><button class="button ghost" id="alchemy-reset" type="button">Reset</button></div>
        <p class="alchemy-note">Prediction, not a physical guarantee. Verify allergens, doneness, and food-safety requirements independently.</p>
      </article>
    </section>
    <section class="panel alchemy-preview"><div><p class="eyebrow">Live preview</p><h3>Formula balance updates as you work.</h3><p id="alchemy-preview-copy"></p></div><div id="alchemy-preview-metrics"></div></section>
    <section id="alchemy-results" class="alchemy-results" hidden></section>
    <section class="panel alchemy-history" id="alchemy-history" hidden><header><div><p class="eyebrow">Private account history</p><h3>Recent experiments</h3></div><button class="mini-button" type="button" id="alchemy-history-refresh">Refresh</button></header><div id="alchemy-history-list"></div></section>`;
  main.prepend(section);
  bind(section);
}

function bind(root) {
  root.querySelector(".alchemy-tabs").addEventListener("click", event => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    state.mode = button.dataset.mode;
    state.category = "All";
    state.query = "";
    root.querySelector("#alchemy-search").value = "";
    renderLibrary();
  });
  root.querySelector("#alchemy-search").addEventListener("input", event => { state.query = event.target.value; renderLibrary(); });
  root.querySelector("#alchemy-category").addEventListener("change", event => { state.category = event.target.value; renderLibrary(); });
  root.querySelector("#alchemy-cards").addEventListener("click", event => { const button = event.target.closest("[data-item]"); if (button) toggle(button.dataset.item); });
  root.querySelector("#alchemy-selected-ingredients").addEventListener("click", removeSelection);
  root.querySelector("#alchemy-selected-equipment").addEventListener("click", removeSelection);
  root.querySelector("#alchemy-add").addEventListener("click", addCustom);
  root.querySelector("#alchemy-custom").addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); addCustom(); } });
  for (const [id, key] of [["alchemy-technique", "technique"], ["alchemy-heat", "heat"], ["alchemy-time", "time"], ["alchemy-servings", "servings"], ["alchemy-goal", "goal"]]) {
    root.querySelector(`#${id}`).addEventListener("input", event => {
      state[key] = ["time", "servings"].includes(key) ? Number(event.target.value) : event.target.value;
      if (key === "technique") {
        state.heat = TECHNIQUES.find(value => value.id === state.technique)?.heat || state.heat;
        root.querySelector("#alchemy-heat").value = state.heat;
      }
      preview();
    });
  }
  root.querySelector("#alchemy-providers").addEventListener("change", event => { if (event.target.name === "alchemy-provider") { state.provider = event.target.value; renderTrials(); } });
  root.querySelector("#alchemy-run").addEventListener("click", run);
  root.querySelector("#alchemy-reset").addEventListener("click", reset);
  root.querySelector("#alchemy-save-settings").addEventListener("click", saveSettings);
  root.querySelector("#alchemy-refresh-access").addEventListener("click", refreshAccountState);
  root.querySelector("#alchemy-history-refresh").addEventListener("click", loadRecentExperiments);
  root.querySelector("#alchemy-results").addEventListener("click", event => {
    if (event.target.closest("#alchemy-vault")) saveToVault();
    if (event.target.closest("#alchemy-export")) exportResult();
  });
}

function bindStandardNav() {
  document.addEventListener("click", event => {
    if (event.target.closest("[data-view]")) document.querySelectorAll("[data-alchemy-nav],[data-alchemy-mobile]").forEach(node => node.classList.remove("active"));
  });
  window.addEventListener("hashchange", () => { if (location.hash === "#alchemy") open(); });
}

async function open() {
  const panel = document.querySelector("#view-alchemy");
  if (!panel) return;
  document.querySelectorAll("[data-view-panel]").forEach(node => node.classList.toggle("active", node === panel));
  document.querySelectorAll("[data-view]").forEach(node => node.classList.remove("active"));
  document.querySelectorAll("[data-alchemy-nav],[data-alchemy-mobile]").forEach(node => node.classList.add("active"));
  document.querySelector("#view-eyebrow").textContent = "AI cooking laboratory";
  document.querySelector("#view-title").textContent = "Alchemy Lab";
  document.querySelector("#new-recipe-button").hidden = true;
  if (location.hash !== "#alchemy") history.replaceState(null, "", "#alchemy");
  await refreshAccountState();
}

function renderAll() {
  const root = document.querySelector("#view-alchemy");
  if (!root) return;
  root.querySelector("#alchemy-technique").value = state.technique;
  root.querySelector("#alchemy-heat").value = state.heat;
  root.querySelector("#alchemy-time").value = state.time;
  root.querySelector("#alchemy-servings").value = state.servings;
  root.querySelector("#alchemy-goal").value = state.goal;
  renderLibrary();
  renderSelected();
  renderProviders();
  renderTrials();
  preview();
  renderHistory();
}

function renderLibrary() {
  const root = document.querySelector("#view-alchemy");
  if (!root) return;
  const source = state.mode === "equipment" ? EQUIPMENT_LIBRARY : INGREDIENT_LIBRARY;
  const selected = state.mode === "equipment" ? state.equipment : state.ingredients;
  const query = state.query.trim().toLowerCase();
  const categories = kitchenCategories(state.mode);
  root.querySelector("#alchemy-category").innerHTML = categories.map(value => `<option${value === state.category ? " selected" : ""}>${escapeHtml(value)}</option>`).join("");
  root.querySelectorAll("[data-mode]").forEach(button => button.classList.toggle("active", button.dataset.mode === state.mode));
  const image = state.mode === "equipment" ? IMG.equipment : IMG.ingredients;
  root.querySelector("#alchemy-cards").innerHTML = source
    .filter(item => (state.category === "All" || item.category === state.category) && (!query || `${item.name} ${item.category}`.toLowerCase().includes(query)))
    .slice(0, 42)
    .map((item, index) => `<button type="button" data-item="${escapeAttribute(item.name)}" class="alchemy-card ${selected.has(item.name) ? "selected" : ""}"><img src="${image}" alt="" style="object-position:${(index % 7) * 14}% ${(Math.floor(index / 7) % 5) * 25}%"><span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.category)}</small></span><em>${selected.has(item.name) ? "Selected" : "Add"}</em></button>`)
    .join("");
  root.querySelector("#alchemy-count").textContent = `${selected.size} selected`;
}

function renderSelected() {
  renderSelectedList("#alchemy-selected-ingredients", state.ingredients, "ingredients");
  renderSelectedList("#alchemy-selected-equipment", state.equipment, "equipment");
}

function renderSelectedList(selector, values, mode) {
  const root = document.querySelector(selector);
  root.innerHTML = values.size
    ? [...values].map(value => `<span>${escapeHtml(value)}<button data-remove="${escapeAttribute(value)}" data-remove-mode="${mode}" type="button">Remove</button></span>`).join("")
    : `<p>No ${mode} selected.</p>`;
}

function renderProviders() {
  const capabilities = getLocalAICapabilities(configuration());
  const root = document.querySelector("#alchemy-providers");
  if (!root) return;
  const rows = [
    { id: "rules", name: "Instant culinary engine", description: "Explainable flavor, technique, timing, and risk rules." },
    { id: "webllm", name: "On-device local LLM", description: capabilities.webgpu ? `Runs ${capabilities.webllmModel} in this browser after a model download.` : "WebGPU is unavailable in this browser.", disabled: !capabilities.webgpu },
    { id: "ollama", name: "Self-hosted model", description: "Use your own OpenAI-compatible local endpoint." },
    { id: "gateway", name: "Mangrok subscriber AI", description: !capabilities.gateway ? "The private gateway has not been configured." : !state.appStatus.signedIn ? "Sign in to use server-metered subscriber AI." : state.entitlement ? entitlementDisplay(state.entitlement) : "Server entitlement is not available yet.", disabled: !capabilities.gateway || !state.appStatus.signedIn || !state.entitlement?.allowed }
  ];
  if (!rows.some(row => row.id === state.provider && !row.disabled)) state.provider = "rules";
  root.innerHTML = rows.map(row => `<label class="${row.disabled ? "disabled" : ""}"><input type="radio" name="alchemy-provider" value="${row.id}" ${state.provider === row.id ? "checked" : ""} ${row.disabled ? "disabled" : ""}><span><b>${escapeHtml(row.name)}</b><small>${escapeHtml(row.description)}</small></span></label>`).join("");
  const note = document.querySelector("#alchemy-entitlement-note");
  if (note) note.textContent = state.entitlement ? entitlementDisplay(state.entitlement) : state.appStatus.signedIn ? "Checking server access…" : "Local Alpha access is stored only in this browser.";
}

function renderTrials() {
  const config = configuration();
  const local = readLocalTrial(localStorage, Number(config.alchemyTrialLimit) || 10);
  const server = state.entitlement;
  const active = state.provider === "gateway" ? server : local;
  const root = document.querySelector("#alchemy-trials");
  const button = document.querySelector("#alchemy-run");
  if (!root || !button) return;
  root.innerHTML = server && state.appStatus.signedIn
    ? `<b>${escapeHtml(entitlementDisplay(server))}</b><span>Subscriber AI is metered on the server. Local rules and previews remain device-side.</span>`
    : `<b>${local.remaining} of ${local.trialLimit} local discovery runs remaining</b><span>Live previews do not use a trial. Browser counters are Alpha-only.</span>`;
  button.disabled = state.busy || !active?.allowed;
  button.textContent = !active?.allowed ? "Access required" : state.busy ? "Running Alchemy…" : "Run Alchemy";
}

function preview() {
  if (state.ingredients.size < 2) {
    document.querySelector("#alchemy-preview-copy").textContent = "Select at least two ingredients to begin.";
    document.querySelector("#alchemy-preview-metrics").innerHTML = "";
    return;
  }
  const value = simulateAlchemy(currentInput());
  document.querySelector("#alchemy-preview-copy").textContent = value.summary;
  document.querySelector("#alchemy-preview-metrics").innerHTML = [
    ["Direction", value.outcome], ["Confidence", `${value.confidence}%`], ["Equipment fit", `${value.equipmentFit.score}%`], ["Leading flavor", leadingFlavor(value.flavor)]
  ].map(([label, metric]) => `<div><small>${label}</small><b>${escapeHtml(metric)}</b></div>`).join("");
}

async function run() {
  if (state.busy || state.ingredients.size < 2) return;
  if (state.provider === "gateway") {
    await refreshAccountState();
    if (!state.entitlement?.allowed) {
      progress("A valid server-managed trial or subscription is required for the Mangrok subscriber AI.", 100, true);
      return;
    }
  } else if (!readLocalTrial(localStorage, Number(configuration().alchemyTrialLimit) || 10).allowed) {
    progress("The local Alpha trial is complete. Sign in when subscriber access is activated.", 100, true);
    return;
  }

  state.busy = true;
  state.experimentId = null;
  renderTrials();
  progress("Building the culinary assessment.", 8);
  const base = simulateAlchemy(currentInput());
  const requestId = randomId();
  const startedAt = performance.now();

  let localRunCompleted = state.provider === "rules";
  try {
    const enhanced = await enhanceWithLocalAI({
      input: base.input,
      simulation: base,
      provider: state.provider,
      config: configuration(),
      requestId,
      onProgress: value => progress(value.text || "Preparing local AI.", value.progress)
    });
    state.result = { ...enhanced.result, providerLabel: enhanced.model, requestId: enhanced.requestId, latencyMs: enhanced.latencyMs };
    localRunCompleted = state.provider !== "gateway";
    if (enhanced.entitlement) state.entitlement = normalizeAlchemyEntitlement(enhanced.entitlement, Number(configuration().alchemyTrialLimit) || 10);
  } catch (error) {
    state.result = { ...base, providerLabel: "Mangrok culinary engine", requestId, latencyMs: Math.round(performance.now() - startedAt), fallback: error.message };
    if (error?.entitlement) state.entitlement = normalizeAlchemyEntitlement(error.entitlement, Number(configuration().alchemyTrialLimit) || 10);
    progress(`AI refinement was unavailable; the explainable result was preserved. ${error.message}`, 100, true);
  }

  if (state.provider !== "gateway" && localRunCompleted) consumeLocalTrial(localStorage, Number(configuration().alchemyTrialLimit) || 10);
  state.busy = false;
  renderTrials();
  renderResult();
  await persistExperiment();
  if (state.provider === "gateway") await refreshAccountState();
}

function renderResult() {
  const value = state.result;
  const root = document.querySelector("#alchemy-results");
  root.hidden = false;
  root.innerHTML = `
    <article class="panel alchemy-outcome"><img src="${IMG.insights}" alt="A generated plated-dish insight scene"><div><p class="eyebrow">${escapeHtml(value.outcome)}</p><h2>${escapeHtml(value.title)}</h2><p>${escapeHtml(value.summary)}</p><strong>${value.confidence}% prediction confidence</strong><small>Reasoning source: ${escapeHtml(value.providerLabel)}${value.latencyMs ? ` · ${value.latencyMs} ms` : ""}</small>${value.fallback ? `<p class="warning-note">${escapeHtml(value.fallback)}</p>` : ""}<div class="button-row"><button class="button primary" id="alchemy-vault">Save to Vault</button><button class="button ghost" id="alchemy-export">Export experiment</button></div></div></article>
    <div class="alchemy-result-grid">
      <section class="panel"><p class="eyebrow">Flavor balance</p><h3>Predicted profile</h3>${FLAVORS.map(key => `<div class="flavor"><span>${key}</span><i><b style="width:${value.flavor[key]}%"></b></i><strong>${value.flavor[key]}</strong></div>`).join("")}</section>
      <section class="panel"><p class="eyebrow">Risk review</p><h3>What could go wrong</h3>${value.risks.length ? value.risks.map(risk => `<article class="risk ${risk.severity}"><b>${escapeHtml(risk.message)}</b><p>${escapeHtml(risk.action)}</p></article>`).join("") : "<p>No major contradiction was detected.</p>"}</section>
      <section class="panel"><p class="eyebrow">Chef notes</p><h3>Ways to improve it</h3><ul>${[...(value.aiInsights || []), ...value.suggestions].slice(0, 8).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
      <section class="panel"><p class="eyebrow">Culinary science</p><h3>Why it behaves this way</h3><ul>${value.science.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
    </div>
    <section class="panel alchemy-timeline"><p class="eyebrow">Cooking timeline</p><h3>Predicted evolution</h3><div>${value.stages.map((stage, index) => `<article><small>Stage ${index + 1}</small><h4>${escapeHtml(stage.name)}</h4><b>${stage.minutes} min</b><p>${escapeHtml(stage.cue)}</p></article>`).join("")}</div></section>
    <section class="alchemy-evolutions"><img src="${IMG.evolution}" alt="A generated recipe evolution scene"><div>${value.evolutions.map(item => `<article class="panel"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.change)}</p><small>${escapeHtml(item.reason)}</small></article>`).join("")}</div></section>
    <p class="alchemy-disclaimer">${escapeHtml(value.disclaimer)}</p>`;
  root.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function persistExperiment() {
  if (!state.appStatus.signedIn || !state.result) return;
  try {
    const saved = await requestBridge("mangrok:save-alchemy-experiment", {
      experiment: {
        title: state.result.title,
        input: state.result.input,
        output: state.result,
        provider: state.provider,
        model: state.result.providerLabel,
        requestId: state.result.requestId,
        durationMs: state.result.latencyMs,
        entitlementPlan: state.entitlement?.plan || null
      }
    }, 6_000);
    state.experimentId = saved?.id || null;
    await loadRecentExperiments();
  } catch (error) {
    console.warn("Alchemy experiment history", error);
  }
}

async function refreshAccountState() {
  state.appStatus = await requestBridge("mangrok:request-app-status", {}, 2_000) || {};
  if (state.appStatus.signedIn) {
    try {
      const raw = await requestBridge("mangrok:request-alchemy-entitlement", {}, 4_000);
      state.entitlement = raw ? normalizeAlchemyEntitlement(raw, Number(configuration().alchemyTrialLimit) || 10) : null;
    } catch {
      state.entitlement = null;
    }
    await loadRecentExperiments();
  } else {
    state.entitlement = null;
    state.recentExperiments = [];
  }
  renderProviders();
  renderTrials();
  renderHistory();
}

async function loadRecentExperiments() {
  if (!state.appStatus.signedIn) return;
  try {
    state.recentExperiments = await requestBridge("mangrok:list-alchemy-experiments", { limit: 8 }, 5_000) || [];
  } catch { state.recentExperiments = []; }
  renderHistory();
}

function renderHistory() {
  const panel = document.querySelector("#alchemy-history");
  const list = document.querySelector("#alchemy-history-list");
  if (!panel || !list) return;
  panel.hidden = !state.appStatus.signedIn;
  list.innerHTML = state.recentExperiments.length
    ? state.recentExperiments.map(item => `<article><div><b>${escapeHtml(item.title || "Untitled experiment")}</b><p>${escapeHtml(item.provider || "rules")} · ${new Date(item.created_at || Date.now()).toLocaleString()}</p></div><span>${escapeHtml(item.status || "completed")}</span></article>`).join("")
    : "<p>No server-saved Alchemy experiments yet.</p>";
}

function toggle(name) {
  const values = state.mode === "equipment" ? state.equipment : state.ingredients;
  values.has(name) ? values.delete(name) : values.add(name);
  renderLibrary(); renderSelected(); preview();
}

function removeSelection(event) {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  (button.dataset.removeMode === "equipment" ? state.equipment : state.ingredients).delete(button.dataset.remove);
  renderLibrary(); renderSelected(); preview();
}

function addCustom() {
  const input = document.querySelector("#alchemy-custom");
  const value = input.value.trim().replaceAll(",", " ").slice(0, 80);
  if (!value) return;
  (state.mode === "equipment" ? state.equipment : state.ingredients).add(value);
  input.value = "";
  renderLibrary(); renderSelected(); preview();
}

function reset() {
  state.ingredients = new Set(["Chicken", "Garlic", "Lemon", "Tomato", "Olive oil", "Basil"]);
  state.equipment = new Set(["Cast-iron skillet", "Tongs"]);
  state.technique = "sear";
  state.heat = "medium-high";
  state.time = 18;
  state.servings = 2;
  state.goal = "balanced";
  state.result = null;
  state.experimentId = null;
  document.querySelector("#alchemy-results").hidden = true;
  renderAll();
}

function saveSettings() {
  state.settings = {
    url: document.querySelector("#alchemy-endpoint").value.trim(),
    model: document.querySelector("#alchemy-model").value.trim()
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  progress("Local model settings saved on this device. Use Settings → System readiness to test the endpoint.", 100);
  renderProviders();
}

function saveToVault() {
  const value = state.result;
  document.querySelector("#new-recipe-button")?.click();
  const fill = () => {
    const dialog = document.querySelector("#recipe-dialog");
    const form = document.querySelector("#recipe-form");
    if (!dialog?.open || !form) return setTimeout(fill, 40);
    form.elements.title.value = value.title;
    form.elements.summary.value = `${value.summary}\n\nAlchemy confidence: ${value.confidence}%.`;
    form.elements.servings.value = value.input.servings;
    form.elements.cookMinutes.value = value.input.timeMinutes;
    form.elements.ingredients.value = value.input.ingredients.join("\n");
    form.elements.steps.value = value.stages.map(stage => `${stage.name} (${stage.minutes} min): ${stage.cue}`).join("\n");
    form.elements.tags.value = `alchemy, ai-discovered, ${value.input.goal}${state.experimentId ? `, experiment:${state.experimentId}` : ""}`;
    form.elements.story.value = `Created in Mangrok Alchemy.${state.experimentId ? `\nExperiment record: ${state.experimentId}` : ""}\n\n${value.science.map(item => `- ${item}`).join("\n")}`;
    window.dispatchEvent(new CustomEvent("mangrok:kitchen-selection", { detail: { ingredients: value.input.ingredients, equipment: value.input.equipment } }));
  };
  fill();
}

function exportResult() {
  const blob = new Blob([JSON.stringify({ type: "mangrok.alchemy", version: 2, experimentId: state.experimentId, experiment: state.result }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mangrok-alchemy-experiment.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function progress(text, value = 40, error = false) {
  const root = document.querySelector("#alchemy-progress");
  root.hidden = false;
  root.classList.toggle("error", error);
  root.querySelector("p").textContent = text;
  root.querySelector("b").style.width = `${Number.isFinite(Number(value)) ? Math.max(3, Math.min(100, value)) : 40}%`;
}

function currentInput() {
  return { ingredients: [...state.ingredients], equipment: [...state.equipment], technique: state.technique, heat: state.heat, timeMinutes: state.time, servings: state.servings, goal: state.goal };
}

function configuration() {
  return { ...(window.MANGROK_CONFIG || {}), ollamaBaseUrl: state.settings.url, ollamaModel: state.settings.model };
}

function loadSettings() {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { url: String(value.url || "http://127.0.0.1:11434/v1"), model: String(value.model || "llama3.2") };
  } catch { return { url: "http://127.0.0.1:11434/v1", model: "llama3.2" }; }
}

function requestBridge(name, payload = {}, timeoutMs = 2_000) {
  if (typeof CustomEvent !== "function") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (handler, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      handler(value);
    };
    const timeout = setTimeout(() => finish(resolve, null), timeoutMs);
    window.dispatchEvent(new CustomEvent(name, { detail: {
      ...payload,
      resolve: value => finish(resolve, value),
      reject: error => finish(reject, error instanceof Error ? error : new Error(String(error || "Request failed.")))
    } }));
  });
}

function leadingFlavor(flavor) { return FLAVORS.toSorted((left, right) => flavor[right] - flavor[left])[0]; }
function randomId() {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `request-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
function escapeAttribute(value) { return escapeHtml(value).replaceAll("`", "&#96;"); }
