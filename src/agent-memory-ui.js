import { AgentMemoryStore } from "./agent-memory.js";
import { ingredientCatalogStats } from "./ingredient-catalog.js";

const memory = new AgentMemoryStore();
if (typeof document !== "undefined") ready(init);

function ready(callback) { document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", callback, { once: true }) : callback(); }
function init() {
  const grid = document.querySelector("#view-settings .settings-grid");
  if (!grid || document.querySelector("#agent-memory-panel")) return;
  const stats = ingredientCatalogStats();
  const panel = document.createElement("section");
  panel.id = "agent-memory-panel";
  panel.className = "panel agent-memory-panel";
  panel.innerHTML = `<div class="agent-panel-heading"><div><p class="eyebrow">Bounded culinary agent</p><h3>Memory and ingredient knowledge</h3></div><label class="switch-row compact"><span><b>Enable agent memory</b><small>Off by default. Only confirmed preferences, corrections, and short session summaries are retained.</small></span><input id="agent-memory-enabled" type="checkbox"></label></div><div class="ingredient-catalog-stats"><div><small>Published ingredients</small><b>${stats.published.toLocaleString()}</b></div><div><small>Aliases</small><b>${stats.aliases.toLocaleString()}</b></div><div><small>Cuisine traditions</small><b>${stats.cuisines.toLocaleString()}</b></div><div><small>Categories</small><b>${stats.categories.toLocaleString()}</b></div><div><small>Catalog version</small><b>${escapeHtml(stats.version)}</b></div></div><form id="agent-memory-form" class="agent-memory-form"><label>Scope<select name="scope"><option value="preference">Preference</option><option value="ingredient">Ingredient</option><option value="technique">Technique</option><option value="equipment">Equipment</option><option value="dietary">Dietary</option><option value="cuisine">Cuisine</option><option value="correction">Correction</option><option value="session-summary">Session summary</option></select></label><label class="wide">Memory<input name="content" maxlength="420" placeholder="Example: Prefer medium heat and less sugar in tomato sauces"></label><label class="check-row"><input name="confirmed" type="checkbox">I confirm this concise memory may be saved on this device.</label><button class="button secondary" type="submit">Save memory</button></form><p class="microcopy">Credentials, passphrases, private keys, sealed notes, decryption material, and complete private recipes are rejected.</p><div id="agent-memory-list" class="agent-memory-list" aria-live="polite"></div>`;
  grid.append(panel);
  const toggle = panel.querySelector("#agent-memory-enabled");
  toggle.checked = memory.isEnabled();
  toggle.addEventListener("change", () => { memory.setEnabled(toggle.checked); render(); });
  panel.querySelector("#agent-memory-form").addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      memory.remember({ scope: data.get("scope"), key: data.get("scope"), content: data.get("content") }, { confirmed: data.get("confirmed") === "on" });
      event.currentTarget.reset(); toggle.checked = memory.isEnabled(); render();
    } catch (error) { alert(error.message); }
  });
  panel.querySelector("#agent-memory-list").addEventListener("click", event => { const button = event.target.closest("[data-memory-delete]"); if (button) { memory.forget(button.dataset.memoryDelete); render(); } });
  render();
}
function render() {
  const root = document.querySelector("#agent-memory-list"); if (!root) return;
  const rows = memory.list();
  root.innerHTML = memory.isEnabled() ? (rows.length ? rows.map(row => `<article><div><span>${escapeHtml(row.scope)}</span><p>${escapeHtml(row.content)}</p><small>Confirmed ${new Date(row.updatedAt).toLocaleString()}</small></div><button class="mini-button" type="button" data-memory-delete="${escapeHtml(row.id)}">Forget</button></article>`).join("") : "<p>No confirmed memories are stored on this device.</p>") : "<p>Agent memory is off. Ingredient search and deterministic Alchemy still work without it.</p>";
}
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
