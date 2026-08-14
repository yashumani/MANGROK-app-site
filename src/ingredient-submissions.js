import { registerPersonalIngredient, resolveIngredient } from "./ingredient-catalog.js";
import { createAgentCloudProvider } from "./agent-cloud.js";

const STORAGE_KEY = "mangrok.ingredient.submissions.v2";

export class IngredientSubmissionQueue {
  constructor({ storage = globalThis.localStorage, cloud = createAgentCloudProvider() } = {}) {
    this.storage = storage;
    this.cloud = cloud;
  }

  async submit(input = {}, { confirmed = false, syncCloud = true } = {}) {
    if (!confirmed) throw new Error("Explicit confirmation is required before saving or submitting an ingredient.");
    const name = String(input.name || input.canonicalName || "").trim().slice(0, 120);
    if (!name) throw new Error("Ingredient name is required.");
    const existing = resolveIngredient(name);
    if (existing?.status === "published") {
      const merged = freezeSubmission({
        id: id(), name, category: input.category || existing.category, aliases: input.aliases || [], cuisines: input.cuisines || [],
        regions: input.regions || [], dietary: input.dietary || [], allergens: input.allergens || [], status: "merged",
        duplicateOf: existing.id, submittedAt: now(), updatedAt: now(), notes: "Matched an existing reviewed catalog entry."
      });
      this.persist(merged);
      return merged;
    }

    const personal = registerPersonalIngredient({ ...input, name });
    let row = freezeSubmission({
      id: id(), clientRequestId: id(), name: personal.name, category: personal.category, aliases: personal.aliases,
      cuisines: personal.cuisines, regions: personal.regions, dietary: personal.dietary, allergens: personal.allergens,
      sourceUrl: String(input.sourceUrl || "").slice(0, 500), sourceLicense: String(input.sourceLicense || "").slice(0, 120),
      notes: String(input.notes || "").slice(0, 1600), status: "pending", duplicateOf: null, submittedAt: now(), updatedAt: now()
    });
    this.persist(row);

    if (syncCloud && this.cloud?.enabled) {
      try {
        const cloudRow = await this.cloud.submitIngredientProposal(row);
        row = freezeSubmission({ ...row, cloudId: cloudRow?.id || cloudRow, status: cloudRow?.status || "pending", updatedAt: now() });
        this.persist(row);
      } catch (error) {
        row = freezeSubmission({ ...row, syncError: String(error.message || error).slice(0, 400), updatedAt: now() });
        this.persist(row);
      }
    }
    return row;
  }

  async list() {
    const local = this.read();
    if (!this.cloud?.enabled) return local;
    try {
      const cloudRows = await this.cloud.listIngredientSubmissions();
      return mergeRows(local, cloudRows || []);
    } catch { return local; }
  }

  async withdraw(idValue) {
    const key = String(idValue || "");
    const rows = this.read();
    const index = rows.findIndex(row => row.id === key || row.cloudId === key);
    if (index < 0) return null;
    const current = rows[index];
    const updated = freezeSubmission({ ...current, status: "withdrawn", updatedAt: now() });
    rows[index] = updated;
    this.write(rows);
    if (current.cloudId && this.cloud?.enabled) {
      try { await this.cloud.withdrawIngredientProposal(current.cloudId); } catch {}
    }
    return updated;
  }

  persist(row) {
    const rows = this.read();
    const index = rows.findIndex(value => value.id === row.id);
    if (index >= 0) rows[index] = row; else rows.unshift(row);
    this.write(rows.slice(0, 300));
  }
  read() {
    try { const value = JSON.parse(this.storage?.getItem?.(STORAGE_KEY) || "[]"); return Array.isArray(value) ? value.map(freezeSubmission) : []; }
    catch { return []; }
  }
  write(rows) { try { this.storage?.setItem?.(STORAGE_KEY, JSON.stringify(rows)); } catch {} }
}

function freezeSubmission(value) {
  return Object.freeze({
    ...value,
    aliases: Object.freeze(list(value.aliases)), cuisines: Object.freeze(list(value.cuisines)), regions: Object.freeze(list(value.regions)),
    dietary: Object.freeze(list(value.dietary)), allergens: Object.freeze(list(value.allergens))
  });
}
function mergeRows(local, cloud) {
  const map = new Map(local.map(row => [row.cloudId || row.id, row]));
  for (const row of cloud) map.set(row.id, freezeSubmission({ ...row, cloudId: row.id, name: row.canonical_name || row.name, aliases: row.aliases, cuisines: row.cuisines, regions: row.regions, dietary: row.dietary, allergens: row.allergens, submittedAt: row.created_at, updatedAt: row.updated_at }));
  return Object.freeze([...map.values()].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))));
}
function list(value) { return (Array.isArray(value) ? value : value ? [value] : []).map(item => String(item).trim()).filter(Boolean); }
function id() { return globalThis.crypto?.randomUUID?.() || `ingredient-${Math.random().toString(36).slice(2)}`; }
function now() { return new Date().toISOString(); }
