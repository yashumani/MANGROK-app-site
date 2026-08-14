import { INGREDIENT_CATALOG, INGREDIENT_CATALOG_STATS, INGREDIENT_CATALOG_VERSION, INGREDIENT_CATEGORIES, INGREDIENT_CUISINES, INGREDIENT_REGIONS, INGREDIENT_ALLERGENS } from "./ingredient-catalog-data.js";

const personal = new Map();
let publishedIndex = null;
let publishedRows = null;

export function getIngredientCatalog({ includePersonal = true } = {}) {
  const rows = getPublishedRows();
  return includePersonal ? Object.freeze([...rows, ...personal.values()]) : rows;
}

export function ingredientCatalogStats() {
  const personalRows = [...personal.values()];
  return Object.freeze({
    version: INGREDIENT_CATALOG_VERSION,
    total: INGREDIENT_CATALOG.length + personalRows.length,
    published: INGREDIENT_CATALOG.length,
    personal: personalRows.length,
    aliases: INGREDIENT_CATALOG_STATS.aliases + personalRows.reduce((sum, row) => sum + row.aliases.length, 0),
    cuisines: INGREDIENT_CUISINES.length,
    categories: INGREDIENT_CATEGORIES.length,
    regions: INGREDIENT_REGIONS.length,
    allergenTags: INGREDIENT_ALLERGENS.length
  });
}

export function ingredientCategories() {
  return Object.freeze(["All", ...new Set([...INGREDIENT_CATEGORIES, ...[...personal.values()].map(row => row.category)])]);
}
export function cuisineTraditions() {
  return Object.freeze(["All traditions", ...new Set([...INGREDIENT_CUISINES, ...[...personal.values()].flatMap(row => row.cuisines)])]);
}
export function resolveIngredient(value) {
  const key = normalizeIngredientKey(value);
  if (!key) return null;
  for (const row of personal.values()) if (row.key === key || row.aliasKeys.includes(key)) return row;
  const index = getPublishedIndex();
  const id = index.get(key);
  return id === undefined ? null : getPublishedRows()[id] || null;
}

export function searchIngredients({ query = "", category = "All", cuisine = "All traditions", dietary = [], excludeAllergens = [], region = "", part = "", process = "", form = "", status = "", limit = 100, offset = 0 } = {}) {
  const needle = normalizeIngredientKey(query);
  const dietarySet = new Set(toList(dietary).map(normalizeIngredientKey));
  const excluded = new Set(toList(excludeAllergens).map(normalizeIngredientKey));
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const rows = getIngredientCatalog().filter(row => {
    if (category !== "All" && row.category !== category) return false;
    if (cuisine !== "All traditions" && !row.cuisines.some(item => normalizeIngredientKey(item) === normalizeIngredientKey(cuisine))) return false;
    if (status && row.status !== status) return false;
    if (region && !row.regions.some(item => normalizeIngredientKey(item).includes(normalizeIngredientKey(region)))) return false;
    if (part && !row.parts.some(item => normalizeIngredientKey(item) === normalizeIngredientKey(part))) return false;
    if (process && !row.processes.some(item => normalizeIngredientKey(item) === normalizeIngredientKey(process))) return false;
    if (form && !row.forms.some(item => normalizeIngredientKey(item) === normalizeIngredientKey(form))) return false;
    if (dietarySet.size && ![...dietarySet].every(item => row.dietary.map(normalizeIngredientKey).includes(item))) return false;
    if (excluded.size && row.allergens.some(item => excluded.has(normalizeIngredientKey(item)))) return false;
    if (!needle) return true;
    return row.searchText.includes(needle) || tokenScore(row.searchText, needle) > 0;
  }).map(row => ({ row, score: scoreRow(row, needle, cuisine) })).sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name));
  const items = rows.slice(safeOffset, safeOffset + safeLimit).map(value => value.row);
  return Object.freeze({ items: Object.freeze(items), total: rows.length, offset: safeOffset, limit: safeLimit, truncated: safeOffset + items.length < rows.length, query });
}

export function suggestIngredientSubstitutions(value, { cuisine = "", dietary = [], excludeAllergens = [], limit = 8 } = {}) {
  const source = resolveIngredient(value);
  if (!source) return Object.freeze({ source: null, items: [], reason: "Ingredient not found in the reviewed catalog." });
  const candidates = searchIngredients({ category: source.category, cuisine: cuisine || "All traditions", dietary, excludeAllergens, limit: 200 }).items
    .filter(row => row.id !== source.id)
    .map(row => ({ ...row, substitutionScore: similarity(source, row, cuisine), tradeoffs: substitutionTradeoffs(source, row) }))
    .sort((a, b) => b.substitutionScore - a.substitutionScore || a.name.localeCompare(b.name))
    .slice(0, Math.max(1, Math.min(20, Number(limit) || 8)));
  return Object.freeze({ source, items: Object.freeze(candidates), reason: "Candidates share category, cuisine, dietary, allergen, process, part, or form context. Verify the culinary function before use." });
}

export function registerPersonalIngredient(input = {}) {
  const name = String(input.name || input.canonicalName || "").trim().slice(0, 120);
  const key = normalizeIngredientKey(name);
  if (!key) throw new Error("Ingredient name is required.");
  const published = resolveIngredient(name);
  if (published && published.status === "published") return Object.freeze({ ...published, duplicateOf: published.id });
  const row = freezeRow({
    id: String(input.id || `personal-${cryptoId()}`), name, category: String(input.category || "Personal ingredients").slice(0, 80),
    aliases: toList(input.aliases).slice(0, 30), cuisines: toList(input.cuisines).slice(0, 30), regions: toList(input.regions).slice(0, 30),
    tags: toList(input.tags).slice(0, 30), parts: toList(input.parts).slice(0, 20), processes: toList(input.processes).slice(0, 20),
    forms: toList(input.forms).slice(0, 20), allergens: toList(input.allergens).slice(0, 20), dietary: toList(input.dietary).slice(0, 20),
    rarity: String(input.rarity || "personal"), status: "personal", source: "user-confirmed personal ingredient", sourceId: "", sourceLicense: "private", notes: String(input.notes || "").slice(0, 1200)
  });
  personal.set(row.id, row);
  return row;
}
export function removePersonalIngredient(id) { return personal.delete(String(id)); }
export function listPersonalIngredients() { return Object.freeze([...personal.values()]); }
export function catalogFacetOptions() {
  const rows = getIngredientCatalog();
  return Object.freeze({
    categories: ingredientCategories(), cuisines: cuisineTraditions(),
    regions: Object.freeze(["All regions", ...new Set(rows.flatMap(row => row.regions).filter(Boolean))].sort()),
    parts: Object.freeze(["All parts", ...new Set(rows.flatMap(row => row.parts).filter(Boolean))].sort()),
    processes: Object.freeze(["All processes", ...new Set(rows.flatMap(row => row.processes).filter(Boolean))].sort()),
    forms: Object.freeze(["All forms", ...new Set(rows.flatMap(row => row.forms).filter(Boolean))].sort())
  });
}
export function normalizeIngredientKey(value) { return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

function getPublishedRows() { if (!publishedRows) publishedRows = Object.freeze(INGREDIENT_CATALOG.map(freezeRow)); return publishedRows; }
function getPublishedIndex() {
  if (publishedIndex) return publishedIndex;
  publishedIndex = new Map();
  getPublishedRows().forEach((row, index) => {
    publishedIndex.set(normalizeIngredientKey(row.name), index);
    for (const alias of row.aliases) if (!publishedIndex.has(normalizeIngredientKey(alias))) publishedIndex.set(normalizeIngredientKey(alias), index);
  });
  return publishedIndex;
}
function freezeRow(value) {
  const row = { ...value,
    aliases: Object.freeze([...new Set(toList(value.aliases))]), cuisines: Object.freeze([...new Set(toList(value.cuisines))]), regions: Object.freeze([...new Set(toList(value.regions))]),
    tags: Object.freeze([...new Set(toList(value.tags))]), parts: Object.freeze([...new Set(toList(value.parts))]), processes: Object.freeze([...new Set(toList(value.processes))]),
    forms: Object.freeze([...new Set(toList(value.forms))]), allergens: Object.freeze([...new Set(toList(value.allergens))]), dietary: Object.freeze([...new Set(toList(value.dietary))]) };
  row.key = normalizeIngredientKey(row.name); row.aliasKeys = Object.freeze(row.aliases.map(normalizeIngredientKey));
  row.searchText = normalizeIngredientKey([row.name, row.category, ...row.aliases, ...row.cuisines, ...row.regions, ...row.parts, ...row.processes, ...row.forms, ...row.tags].join(" "));
  return Object.freeze(row);
}
function scoreRow(row, needle, cuisine) {
  if (!needle) return row.status === "personal" ? 10 : 1;
  const key = normalizeIngredientKey(row.name);
  let score = key === needle ? 1000 : key.startsWith(needle) ? 700 : row.aliasKeys.includes(needle) ? 650 : row.searchText.includes(needle) ? 300 : tokenScore(row.searchText, needle) * 40;
  if (cuisine && cuisine !== "All traditions" && row.cuisines.some(item => normalizeIngredientKey(item) === normalizeIngredientKey(cuisine))) score += 80;
  if (row.rarity === "heritage" || row.rarity === "foraged") score += 8;
  return score;
}
function tokenScore(text, needle) { return needle.split(" ").filter(Boolean).filter(token => text.includes(token)).length; }
function similarity(left, right, cuisine) { let score = left.category === right.category ? 40 : 0; score += overlap(left.parts, right.parts) * 12 + overlap(left.processes, right.processes) * 10 + overlap(left.forms, right.forms) * 8 + overlap(left.cuisines, right.cuisines) * 7; if (cuisine && right.cuisines.some(item => normalizeIngredientKey(item) === normalizeIngredientKey(cuisine))) score += 18; return score; }
function substitutionTradeoffs(left, right) { const notes = []; if (!overlap(left.processes, right.processes)) notes.push("Processing differs."); if (!overlap(left.forms, right.forms)) notes.push("Physical form differs."); if (right.allergens.length) notes.push(`Check allergens: ${right.allergens.join(", ")}.`); return notes; }
function overlap(a, b) { const set = new Set(a.map(normalizeIngredientKey)); return b.map(normalizeIngredientKey).filter(value => set.has(value)).length; }
function toList(value) { return (Array.isArray(value) ? value : value ? [value] : []).map(item => String(item).trim()).filter(Boolean); }
function cryptoId() { return globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2); }
