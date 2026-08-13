export const AGENT_SKILLS = Object.freeze({
  "ingredient-explorer": Object.freeze({
    id: "ingredient-explorer",
    description: "Find canonical ingredients, aliases, cuisine traditions, and provenance.",
    triggers: ["ingredient", "what is", "alias", "cuisine", "regional"]
  }),
  "substitution-guide": Object.freeze({
    id: "substitution-guide",
    description: "Suggest substitutions while respecting dietary and allergen constraints.",
    triggers: ["substitute", "replacement", "swap", "instead of", "without"]
  }),
  "technique-guard": Object.freeze({
    id: "technique-guard",
    description: "Check cookware, heat, timing, and technique contradictions.",
    triggers: ["heat", "pan", "cook", "timing", "technique", "burn", "split"]
  }),
  "recipe-evolution": Object.freeze({
    id: "recipe-evolution",
    description: "Generate explainable variations from a parent recipe formula.",
    triggers: ["evolve", "variation", "lighter", "faster", "spicier", "gourmet"]
  }),
  "memory-recall": Object.freeze({
    id: "memory-recall",
    description: "Recall user-confirmed preferences and prior session summaries.",
    triggers: ["remember", "last time", "my preference", "previous", "again"]
  }),
  "catalog-curation": Object.freeze({
    id: "catalog-curation",
    description: "Prepare an ingredient proposal for moderated catalog review.",
    triggers: ["submit ingredient", "add ingredient", "missing ingredient", "catalog"]
  })
});

export function selectAgentSkills({ query = "", input = {}, intent = "" } = {}) {
  const text = [query, intent, input?.goal, input?.technique, ...(input?.ingredients || [])].join(" ").toLowerCase();
  const selected = Object.values(AGENT_SKILLS).filter(skill => skill.triggers.some(trigger => text.includes(trigger)));
  if (!selected.some(skill => skill.id === "technique-guard")) selected.push(AGENT_SKILLS["technique-guard"]);
  if (!selected.some(skill => skill.id === "ingredient-explorer")) selected.push(AGENT_SKILLS["ingredient-explorer"]);
  return selected.slice(0, 5);
}

export function skillManifest(skills) {
  return (skills || []).map(skill => ({ id: skill.id, description: skill.description }));
}
