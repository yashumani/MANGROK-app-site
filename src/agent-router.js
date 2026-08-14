import { selectAgentSkills } from "./agent-skills.js";

export function routeCulinaryAgent({ input = {}, simulation = null, question = "" } = {}) {
  const text = [question, input.notes, input.goal, input.technique, ...(input.ingredients || [])].join(" ").toLowerCase();
  const intents = [];
  addIntent(intents, "ingredient-research", /ingredient|alias|regional|what is|identify|origin/.test(text), 80);
  addIntent(intents, "substitution", /substitut|replace|swap|instead|allerg|vegan|vegetarian/.test(text), 90);
  addIntent(intents, "catalog-submission", /submit|catalog|missing ingredient|new ingredient/.test(text), 95);
  addIntent(intents, "memory", /remember|prefer|usually|avoid|last time|previous/.test(text), 70);
  addIntent(intents, "fermentation", /ferment|starter|culture|koji|nuruk|brine|yeast/.test(text), 85);
  addIntent(intents, "recipe-evolution", /evolve|variation|lighter|faster|gourmet|spicy/.test(text) || Boolean(input.goal && input.goal !== "balanced"), 60);
  addIntent(intents, "technique-analysis", true, 50 + Math.min(30, simulation?.risks?.length * 5 || 0));
  intents.sort((a, b) => b.confidence - a.confidence);
  const skills = selectAgentSkills({ input, simulation, question });
  const tools = new Set(["inspect_simulation", "ingredient_profile"]);
  for (const intent of intents) {
    if (intent.id === "ingredient-research") tools.add("search_ingredients");
    if (intent.id === "substitution") tools.add("find_substitutions");
    if (intent.id === "catalog-submission") tools.add("submit_ingredient");
    if (intent.id === "memory") { tools.add("recall_memory"); tools.add("search_sessions"); }
    if (intent.id === "fermentation") tools.add("ingredient_profile");
  }
  return Object.freeze({
    primaryIntent: intents[0]?.id || "technique-analysis",
    intents: Object.freeze(intents),
    skills,
    tools: Object.freeze([...tools]),
    riskLevel: simulation?.risks?.some(risk => risk.severity === "high") ? "high" : simulation?.risks?.length ? "medium" : "low"
  });
}

function addIntent(target, id, condition, confidence) {
  if (condition) target.push(Object.freeze({ id, confidence }));
}
