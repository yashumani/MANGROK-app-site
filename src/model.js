export const APP_VERSION = 2;
export const PRIVACY = Object.freeze({
  private: "Only me",
  family: "Family vault",
  trusted: "Trusted circle",
  open: "Open recipe"
});
export const ROLES = Object.freeze({ viewer: "Viewer", contributor: "Contributor", custodian: "Custodian" });

export function uid(prefix = "id") {
  const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${value}`;
}

export function isoNow() { return new Date().toISOString(); }

export function blankRecipe() {
  const now = isoNow();
  return {
    id: uid("recipe"), ownerId: "local", title: "", summary: "", ingredients: [], steps: [], tags: [],
    privacy: "private", favorite: false, servings: "", prepMinutes: null, cookMinutes: null,
    origin: { creator: "", place: "", year: "", story: "", custodian: "" },
    secret: null, secretHint: "", attachments: [], sharedCircleIds: [],
    createdAt: now, updatedAt: now, revision: 1
  };
}

function lines(value) {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  return String(value ?? "").split(/\r?\n/).map(v => v.trim()).filter(Boolean);
}
function tags(value) {
  if (Array.isArray(value)) return value.map(v => String(v).trim().toLowerCase()).filter(Boolean);
  return String(value ?? "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
}
function minutes(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

export function normalizeRecipe(input = {}) {
  const base = blankRecipe();
  const privacy = Object.hasOwn(PRIVACY, input.privacy) ? input.privacy : "private";
  const createdAt = validDate(input.createdAt) ? input.createdAt : base.createdAt;
  const updatedAt = validDate(input.updatedAt) ? input.updatedAt : isoNow();
  return {
    ...base,
    id: String(input.id || base.id), ownerId: String(input.ownerId || "local"),
    title: String(input.title ?? "").trim().slice(0, 180),
    summary: String(input.summary ?? "").trim().slice(0, 1200),
    ingredients: lines(input.ingredients).slice(0, 250), steps: lines(input.steps).slice(0, 250),
    tags: [...new Set(tags(input.tags))].slice(0, 30), privacy,
    favorite: Boolean(input.favorite), servings: String(input.servings ?? "").trim().slice(0, 60),
    prepMinutes: minutes(input.prepMinutes), cookMinutes: minutes(input.cookMinutes),
    origin: {
      creator: String(input.origin?.creator ?? "").trim().slice(0, 180),
      place: String(input.origin?.place ?? "").trim().slice(0, 180),
      year: String(input.origin?.year ?? "").trim().slice(0, 30),
      story: String(input.origin?.story ?? "").trim().slice(0, 8000),
      custodian: String(input.origin?.custodian ?? "").trim().slice(0, 180)
    },
    secret: normalizeSecret(input.secret), secretHint: String(input.secretHint ?? "").trim().slice(0, 240),
    attachments: Array.isArray(input.attachments) ? input.attachments.map(normalizeAttachment).slice(0, 40) : [],
    sharedCircleIds: Array.isArray(input.sharedCircleIds) ? [...new Set(input.sharedCircleIds.map(String))] : [],
    createdAt, updatedAt, revision: Math.max(1, Number.parseInt(input.revision, 10) || 1)
  };
}

function normalizeSecret(secret) {
  if (!secret || typeof secret !== "object") return null;
  const ciphertext = String(secret.ciphertext ?? "");
  const iv = String(secret.iv ?? "");
  const salt = String(secret.salt ?? "");
  if (!ciphertext || !iv || !salt) return null;
  return { ciphertext, iv, salt, iterations: Math.max(100000, Number(secret.iterations) || 310000), version: Number(secret.version) || 1 };
}
function normalizeAttachment(item = {}) {
  return {
    id: String(item.id || uid("asset")), recipeId: String(item.recipeId || ""),
    kind: ["photo", "card", "audio", "video", "document"].includes(item.kind) ? item.kind : "document",
    name: String(item.name || "Attachment").slice(0, 240), type: String(item.type || "application/octet-stream").slice(0, 120),
    size: Math.max(0, Number(item.size) || 0), local: item.local !== false, cloudPath: item.cloudPath ? String(item.cloudPath) : null,
    createdAt: validDate(item.createdAt) ? item.createdAt : isoNow()
  };
}
function validDate(value) { return typeof value === "string" && !Number.isNaN(Date.parse(value)); }

export function validateRecipe(recipe) {
  const errors = [];
  if (!recipe.title) errors.push("Recipe title is required.");
  if (!recipe.ingredients.length) errors.push("Add at least one ingredient.");
  if (!recipe.steps.length) errors.push("Add at least one preparation step.");
  return errors;
}

export function recipeMatches(recipe, query = "", privacy = "all", favoritesOnly = false) {
  if (privacy !== "all" && recipe.privacy !== privacy) return false;
  if (favoritesOnly && !recipe.favorite) return false;
  const needle = String(query).trim().toLowerCase();
  if (!needle) return true;
  const haystack = [recipe.title, recipe.summary, ...recipe.ingredients, ...recipe.tags,
    recipe.origin.creator, recipe.origin.place, recipe.origin.story, recipe.origin.custodian].join(" ").toLowerCase();
  return haystack.includes(needle);
}

export function sortRecipes(recipes, mode = "updated") {
  const copy = [...recipes];
  if (mode === "title") return copy.sort((a, b) => a.title.localeCompare(b.title));
  if (mode === "oldest") return copy.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function makeVersion(recipe, note = "Saved recipe", actorId = "local") {
  return { id: uid("version"), recipeId: recipe.id, revision: recipe.revision, snapshot: structuredClone(recipe), note, actorId, createdAt: isoNow() };
}

export function buildBackup(data = {}) {
  return {
    type: "mangrok.vault", version: 3, exportedAt: isoNow(), appVersion: APP_VERSION,
    recipes: (data.recipes || []).map(normalizeRecipe), circles: data.circles || [], books: data.books || [],
    legacyPlans: data.legacyPlans || [], notifications: data.notifications || [], assets: data.assets || [], versions: data.versions || []
  };
}

export function parseBackup(value) {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!parsed || parsed.type !== "mangrok.vault" || ![1, 2, 3].includes(Number(parsed.version))) {
    throw new Error("This is not a supported Mangrok vault backup.");
  }
  return buildBackup({
    recipes: parsed.recipes || [], circles: parsed.circles || [], books: parsed.books || [],
    legacyPlans: parsed.legacyPlans || [], notifications: parsed.notifications || [],
    assets: parsed.assets || [], versions: parsed.versions || []
  });
}

export function canRoleEdit(role) { return role === "contributor" || role === "custodian"; }
export function canRoleShare(role) { return role === "custodian"; }
