import { GENERATED_IMAGES as IMG } from "./generated-images.js";
import { analyzePrintProject, buildPrintProofManifest } from "./print.js";

const STICKERS = Object.freeze([
  { id: "ingredients", name: "Ingredient garden", src: IMG.ingredients },
  { id: "equipment", name: "Kitchen tools", src: IMG.equipment },
  { id: "alchemy", name: "Alchemy kitchen", src: IMG.hero },
  { id: "insights", name: "Smart kitchen", src: IMG.insights },
  { id: "evolution", name: "Recipe evolution", src: IMG.evolution }
]);
const KEY = "mangrok.print.illustrations.v1";
let selected = new Set(loadSelection());
let currentProof = null;

ready(init);

function ready(callback) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", callback, { once: true });
  else callback();
}

function init() {
  const form = document.querySelector("#book-form");
  if (!form || document.querySelector("#print-illustrations")) return;

  addThemes(form);
  const illustrationStudio = buildIllustrationStudio();
  const proofStudio = buildProofStudio();
  form.querySelector("fieldset")?.insertAdjacentElement("beforebegin", illustrationStudio);
  illustrationStudio.insertAdjacentElement("afterend", proofStudio);

  illustrationStudio.addEventListener("click", event => {
    const button = event.target.closest("[data-print-art]");
    if (!button) return;
    const id = button.dataset.printArt;
    if (selected.has(id)) selected.delete(id);
    else if (selected.size < 4) selected.add(id);
    syncSelection();
    renderSelection();
  });
  form.addEventListener("change", scheduleRefresh);
  form.addEventListener("input", scheduleRefresh);
  document.querySelector("#print-proof-refresh")?.addEventListener("click", refreshProof);
  document.querySelector("#print-proof-download")?.addEventListener("click", downloadProofManifest);

  syncSelection();
  renderSelection();
  refreshProof();
}

function addThemes(form) {
  for (const [value, label] of [["pastel", "Pastel recipe journal"], ["midnight", "Midnight culinary"]]) {
    if (![...form.elements.theme.options].some(option => option.value === value)) form.elements.theme.add(new Option(label, value));
  }
}

function buildIllustrationStudio() {
  const box = document.createElement("section");
  box.id = "print-illustrations";
  box.className = "print-illustrations";
  box.innerHTML = `
    <header><p class="eyebrow">Illustration studio</p><h3>Decorate your family edition</h3><p>Choose original Mangrok-generated culinary artwork for the cover and recipe pages.</p></header>
    <div>${STICKERS.map(sticker => `<button type="button" data-print-art="${sticker.id}"><img src="${sticker.src}" alt=""><span>${sticker.name}</span><small>Add to book</small></button>`).join("")}</div>
    <input type="hidden" id="print-art-value" name="decorations">`;
  return box;
}

function buildProofStudio() {
  const box = document.createElement("section");
  box.id = "print-proof-studio";
  box.className = "print-proof-studio";
  box.innerHTML = `
    <header><div><p class="eyebrow">Preflight</p><h3>Edition proof</h3></div><span id="print-proof-grade">Checking</span></header>
    <p id="print-proof-summary">Select recipes to calculate the page estimate and print-safety checks.</p>
    <div id="print-proof-details" class="print-proof-details"></div>
    <div class="button-row"><button type="button" class="button secondary" id="print-proof-refresh">Validate edition</button><button type="button" class="button ghost" id="print-proof-download" disabled>Download proof manifest</button></div>`;
  return box;
}

function renderSelection() {
  document.querySelectorAll("[data-print-art]").forEach(button => {
    const active = selected.has(button.dataset.printArt);
    button.classList.toggle("selected", active);
    button.querySelector("small").textContent = active ? "Selected" : "Add to book";
  });
  previewDecorations();
  refreshProof();
}

function syncSelection() {
  const input = document.querySelector("#print-art-value");
  if (input) input.value = JSON.stringify([...selected]);
  localStorage.setItem(KEY, JSON.stringify([...selected]));
}

function previewDecorations() {
  const cover = document.querySelector("#book-preview .book-cover");
  if (!cover) return;
  cover.querySelector(".print-art-preview")?.remove();
  if (!selected.size) return;
  const preview = document.createElement("div");
  preview.className = "print-art-preview";
  preview.innerHTML = [...selected].map(id => `<img src="${STICKERS.find(sticker => sticker.id === id).src}" alt="">`).join("");
  cover.append(preview);
}

let refreshTimer = null;
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    previewDecorations();
    refreshProof();
  }, 80);
}

async function refreshProof() {
  const draft = await requestPrintDraft();
  if (!draft) return;
  draft.decorations = [...selected];
  currentProof = buildPrintProofManifest(draft);
  renderProof(analyzePrintProject(draft));
}

function renderProof(analysis) {
  const grade = document.querySelector("#print-proof-grade");
  const summary = document.querySelector("#print-proof-summary");
  const details = document.querySelector("#print-proof-details");
  const download = document.querySelector("#print-proof-download");
  if (!grade || !summary || !details || !download) return;

  grade.textContent = analysis.ready ? "Ready for PDF" : `${analysis.errors.length} issue${analysis.errors.length === 1 ? "" : "s"}`;
  grade.classList.toggle("ready", analysis.ready);
  summary.textContent = `${analysis.recipeCount} recipe${analysis.recipeCount === 1 ? "" : "s"} · approximately ${analysis.estimatedPages} pages · ${analysis.pageSize}`;
  details.innerHTML = [
    ...analysis.errors.map(message => `<p class="print-proof-error"><b>Required:</b> ${escapeHtml(message)}</p>`),
    ...analysis.warnings.map(message => `<p class="print-proof-warning"><b>Review:</b> ${escapeHtml(message)}</p>`),
    ...(!analysis.errors.length && !analysis.warnings.length ? ["<p class=\"print-proof-ready\"><b>Preflight complete.</b> No browser-PDF issues were detected.</p>"] : [])
  ].join("");
  download.disabled = !currentProof;
}

async function requestPrintDraft() {
  const bridged = await requestBridge("mangrok:request-print-draft", {}, 1_500);
  if (bridged) return bridged;
  const form = document.querySelector("#book-form");
  if (!form) return null;
  const data = new FormData(form);
  const recipes = [...document.querySelectorAll("#print-recipe-list input:checked")].map(input => ({
    id: input.value,
    title: input.closest("label")?.textContent?.trim() || "Selected recipe",
    ingredients: ["Recipe data available in Mangrok"],
    steps: ["Open the app to validate full recipe content"],
    origin: {}
  }));
  return {
    title: String(data.get("title") || ""),
    dedication: String(data.get("dedication") || ""),
    theme: String(data.get("theme") || "heritage"),
    recipes,
    includeSecrets: Boolean(data.get("includeSecrets")),
    secretApprovalAt: data.get("secretApproval") ? new Date().toISOString() : null,
    decorations: [...selected]
  };
}

function downloadProofManifest() {
  if (!currentProof) return;
  const blob = new Blob([JSON.stringify(currentProof, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mangrok-print-proof-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function requestBridge(name, payload = {}, timeoutMs = 1_500) {
  if (typeof CustomEvent !== "function") return Promise.resolve(null);
  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(value || null);
    };
    const timeout = setTimeout(() => finish(null), timeoutMs);
    window.dispatchEvent(new CustomEvent(name, { detail: { ...payload, resolve: finish, reject: () => finish(null) } }));
  });
}

function loadSelection() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]").filter(id => STICKERS.some(sticker => sticker.id === id)).slice(0, 4);
  } catch { return []; }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}
