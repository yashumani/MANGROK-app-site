import { resolveIngredient, searchIngredients, suggestIngredientSubstitutions } from "./ingredient-catalog.js";

export class AgentToolRegistry {
  constructor() { this.tools = new Map(); }
  register(definition) {
    const tool = normalizeTool(definition);
    if (this.tools.has(tool.name)) throw new Error(`Tool already registered: ${tool.name}`);
    this.tools.set(tool.name, tool); return this;
  }
  manifest() { return [...this.tools.values()].map(({ name, description, inputSchema, sideEffect, confirmationRequired }) => ({ name, description, inputSchema, sideEffect, confirmationRequired })); }
  async execute(name, args = {}, context = {}) {
    const startedAt = Date.now();
    try {
      const tool = this.tools.get(name);
      if (!tool) throw new Error(`Unknown agent tool: ${name}`);
      if (tool.confirmationRequired && !context.confirmedTools?.has?.(name)) throw new Error(`${name} requires explicit confirmation.`);
      const safeArgs = validateArgs(tool.inputSchema, args);
      const output = await tool.handler(safeArgs, context);
      return { ok: true, output, durationMs: Date.now() - startedAt };
    } catch (error) {
      return { ok: false, error: String(error?.message || error).slice(0, 500), durationMs: Date.now() - startedAt };
    }
  }
}

export function createMangrokToolRegistry({ memory = null, submissions = null } = {}) {
  return new AgentToolRegistry()
    .register({ name: "search_ingredients", description: "Search canonical ingredients, aliases, cuisines, categories, granular forms, and provenance.", inputSchema: { query: "string", category: "string?", cuisine: "string?", region: "string?", part: "string?", process: "string?", form: "string?", limit: "number?" }, handler: args => searchIngredients(args) })
    .register({ name: "ingredient_profile", description: "Resolve an ingredient name or alias to the canonical catalog entry.", inputSchema: { name: "string" }, handler: ({ name }) => resolveIngredient(name) || { found: false, name } })
    .register({ name: "find_substitutions", description: "Find explainable substitutions filtered by cuisine, dietary constraints, allergens, form, and process.", inputSchema: { name: "string", cuisine: "string?", dietary: "array?", excludeAllergens: "array?", limit: "number?" }, handler: ({ name, ...options }) => suggestIngredientSubstitutions(name, options) })
    .register({ name: "recall_memory", description: "Recall user-confirmed preferences and corrections from bounded memory.", inputSchema: { query: "string", scopes: "array?", limit: "number?" }, handler: args => memory ? memory.recall(args.query, args) : [] })
    .register({ name: "search_sessions", description: "Search prior Mangrok agent session summaries.", inputSchema: { query: "string", limit: "number?" }, handler: args => memory ? memory.searchSessions(args.query, args) : [] })
    .register({ name: "save_memory", description: "Save one concise preference, correction, or session summary after confirmation.", inputSchema: { scope: "string", key: "string", content: "string", confidence: "number?" }, sideEffect: true, confirmationRequired: true, handler: (args, context) => memory?.remember(args, { confirmed: true, cloud: Boolean(context.cloudMemory) }) })
    .register({ name: "submit_ingredient", description: "Submit a missing ingredient to the moderated queue and retain it as personal knowledge.", inputSchema: { name: "string", category: "string?", aliases: "array?", cuisines: "array?", regions: "array?", dietary: "array?", allergens: "array?", sourceUrl: "string?", sourceLicense: "string?", notes: "string?" }, sideEffect: true, confirmationRequired: true, handler: (args, context) => submissions?.submit(args, { confirmed: true, syncCloud: Boolean(context.syncCloud) }) })
    .register({ name: "inspect_simulation", description: "Read the deterministic Mangrok culinary simulation that grounds the LLM.", inputSchema: {}, handler: (_args, context) => context.simulation || null });
}

function normalizeTool(value) {
  const name = String(value?.name || "").trim();
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(name)) throw new Error("Invalid tool name.");
  if (typeof value.handler !== "function") throw new Error(`Tool ${name} requires a handler.`);
  return Object.freeze({ name, description: String(value.description || "").slice(0, 500), inputSchema: value.inputSchema || {}, sideEffect: Boolean(value.sideEffect), confirmationRequired: Boolean(value.confirmationRequired), handler: value.handler });
}
function validateArgs(schema, input) {
  const args = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const out = {};
  for (const [key, type] of Object.entries(schema || {})) {
    const optional = String(type).endsWith("?"); const wanted = String(type).replace(/\?$/, ""); const value = args[key];
    if (value === undefined || value === null || value === "") { if (!optional) throw new Error(`Missing required tool argument: ${key}`); continue; }
    if (wanted === "string") out[key] = String(value).slice(0, 1000);
    else if (wanted === "number") { const number = Number(value); if (!Number.isFinite(number)) throw new Error(`Invalid numeric argument: ${key}`); out[key] = number; }
    else if (wanted === "array") out[key] = (Array.isArray(value) ? value : [value]).map(item => String(item).slice(0, 200)).slice(0, 50);
    else if (wanted === "boolean") out[key] = Boolean(value);
    else out[key] = value;
  }
  return out;
}
