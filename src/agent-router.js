export function routeAgentIntent({ query = "", input = {}, simulation = null } = {}) {
  const text = [query, input.goal, input.technique, input.cuisine, ...(input.ingredients || [])].join(" ").toLowerCase();
  const plan = [];
  const add = (tool, args, reason) => { if (!plan.some(step => step.tool === tool)) plan.push(Object.freeze({ tool, args, reason })); };
  if (/substitut|replace|swap|instead|without|allerg/.test(text)) {
    const ingredient = input.ingredients?.[0] || query.match(/replace\s+([\w -]+)/i)?.[1] || query;
    add("find_substitutions", { name: ingredient, cuisine: input.cuisine || "", dietary: input.dietary || [], excludeAllergens: input.excludeAllergens || [] }, "Find constrained alternatives.");
    add("search_ingredients", { query: ingredient, cuisine: input.cuisine || "" }, "Resolve canonical and regional ingredient context.");
  } else if (/ingredient|alias|regional|origin|what is|identify|cuisine/.test(text)) {
    add("search_ingredients", { query: query || input.ingredients?.join(" ") || "", cuisine: input.cuisine || "" }, "Search reviewed ingredient knowledge.");
  }
  for (const name of (input.ingredients || []).slice(0, 4)) add("ingredient_profile", { name }, "Resolve selected ingredient metadata.");
  if (/remember|preference|last time|previous|again/.test(text)) {
    add("recall_memory", { query: query || input.ingredients?.join(" ") || "" }, "Recall opt-in user-confirmed preferences.");
    add("search_sessions", { query: query || input.goal || "" }, "Find relevant prior experiment summaries.");
  }
  if (/submit ingredient|add ingredient|missing ingredient|catalog/.test(text)) add("submit_ingredient", { name: input.ingredients?.[0] || query }, "Prepare a moderated ingredient proposal.");
  add("inspect_simulation", {}, simulation?.risks?.length ? "Ground the answer in deterministic risks." : "Ground the answer in deterministic culinary analysis.");
  return Object.freeze(plan.slice(0, 12));
}

export async function executeAgentPlan(plan = [], registry, context = {}) {
  if (!registry?.execute) throw new Error("A tool registry is required.");
  const results = [];
  for (const step of plan.slice(0, 12)) {
    const result = await registry.execute(step.tool, step.args || {}, context);
    results.push(Object.freeze({ tool: step.tool, reason: step.reason || "", ...result }));
  }
  return Object.freeze(results);
}
