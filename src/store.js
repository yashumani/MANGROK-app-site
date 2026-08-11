import { buildBackup, normalizeRecipe, parseBackup, makeVersion, uid, isoNow } from "./model.js";

const DB_NAME = "mangrok-vault-v2";
const DB_VERSION = 1;
const STORES = ["recipes", "versions", "circles", "books", "legacy", "notifications", "assets", "settings"];

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
  });
}
function requestPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class LocalVaultStore {
  constructor() { this.db = null; }
  async init() { this.db = await openDatabase(); await this.migrateLegacy(); return this; }
  transaction(storeName, mode = "readonly") {
    if (!STORES.includes(storeName)) throw new Error(`Unknown store: ${storeName}`);
    return this.db.transaction(storeName, mode).objectStore(storeName);
  }
  async list(storeName) { return requestPromise(this.transaction(storeName).getAll()); }
  async get(storeName, id) { return requestPromise(this.transaction(storeName).get(id)); }
  async put(storeName, record) {
    if (!record?.id) record = { ...record, id: uid(storeName.slice(0, -1) || "item") };
    await requestPromise(this.transaction(storeName, "readwrite").put(record)); return record;
  }
  async remove(storeName, id) { await requestPromise(this.transaction(storeName, "readwrite").delete(id)); }
  async clear(storeName) { await requestPromise(this.transaction(storeName, "readwrite").clear()); }

  async saveRecipe(input, note = "Saved recipe") {
    const existing = input.id ? await this.get("recipes", input.id) : null;
    const recipe = normalizeRecipe({ ...input, revision: existing ? existing.revision + 1 : input.revision || 1,
      createdAt: existing?.createdAt || input.createdAt, updatedAt: isoNow() });
    if (existing) await this.put("versions", makeVersion(existing, note));
    await this.put("recipes", recipe);
    await this.notify(existing ? `Updated “${recipe.title}”` : `Added “${recipe.title}”`, "recipe");
    return recipe;
  }
  async deleteRecipe(id) {
    const recipe = await this.get("recipes", id);
    if (!recipe) return;
    await this.put("versions", makeVersion(recipe, "Deleted recipe"));
    for (const asset of await this.list("assets")) if (asset.recipeId === id) await this.remove("assets", asset.id);
    await this.remove("recipes", id); await this.notify(`Deleted “${recipe.title}”`, "warning");
  }
  async restoreVersion(versionId) {
    const version = await this.get("versions", versionId);
    if (!version) throw new Error("Version not found.");
    return this.saveRecipe({ ...version.snapshot, revision: Number(version.snapshot.revision || 1) }, `Restored revision ${version.revision}`);
  }
  async versionsFor(recipeId) { return (await this.list("versions")).filter(v => v.recipeId === recipeId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }

  async saveAsset(recipeId, file, kind = "photo") {
    const asset = { id: uid("asset"), recipeId, kind, name: file.name || "Attachment", type: file.type || "application/octet-stream",
      size: file.size || 0, blob: file, local: true, createdAt: isoNow() };
    await this.put("assets", asset); return { ...asset, blob: undefined };
  }
  async assetsFor(recipeId) { return (await this.list("assets")).filter(a => a.recipeId === recipeId); }

  async notify(message, kind = "info") {
    return this.put("notifications", { id: uid("notice"), message, kind, read: false, createdAt: isoNow() });
  }
  async markNotificationsRead() {
    for (const item of await this.list("notifications")) if (!item.read) await this.put("notifications", { ...item, read: true });
  }

  async exportBackup() {
    const assets = (await this.list("assets")).map(asset => ({ ...asset, blob: undefined, omittedBinary: true }));
    return buildBackup({ recipes: await this.list("recipes"), circles: await this.list("circles"), books: await this.list("books"),
      legacyPlans: await this.list("legacy"), notifications: await this.list("notifications"), assets, versions: await this.list("versions") });
  }
  async importBackup(value, replace = false) {
    const backup = parseBackup(value);
    if (replace) for (const name of STORES.filter(n => n !== "settings")) await this.clear(name);
    for (const recipe of backup.recipes) await this.put("recipes", normalizeRecipe(recipe));
    for (const circle of backup.circles) await this.put("circles", circle);
    for (const book of backup.books) await this.put("books", book);
    for (const plan of backup.legacyPlans) await this.put("legacy", plan);
    for (const notice of backup.notifications) await this.put("notifications", notice);
    for (const version of backup.versions) await this.put("versions", version);
    await this.notify(`Imported ${backup.recipes.length} recipes. Binary attachments must be reattached.`, "success");
    return backup;
  }

  async migrateLegacy() {
    const marker = await this.get("settings", "legacy-migration");
    if (marker) return;
    const keys = ["mangrok.recipes", "mangrok-vault", "mangrok_recipes"];
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key); if (!raw) continue;
        const parsed = JSON.parse(raw); const recipes = Array.isArray(parsed) ? parsed : parsed.recipes;
        if (Array.isArray(recipes)) for (const recipe of recipes) await this.put("recipes", normalizeRecipe(recipe));
      } catch { /* an invalid legacy value must never block the app */ }
    }
    await this.put("settings", { id: "legacy-migration", completedAt: isoNow() });
  }
}
