import test from "node:test";
import assert from "node:assert/strict";
import { createMangrokToolRegistry } from "../src/agent-tools.js";
import { routeAgentIntent, executeAgentPlan } from "../src/agent-router.js";
import { selectAgentSkills } from "../src/agent-skills.js";
import { buildMangrokAgentContext } from "../src/agent-system.js";

test("router chooses bounded culinary tools and deterministic grounding", () => {
  const plan = routeAgentIntent({ query: "What can replace cashews in this Thai sauce?", input: { ingredients: ["Cashews", "Coconut milk"], cuisine: "Thai", technique: "simmer" } });
  assert.ok(plan.some(step => step.tool === "find_substitutions"));
  assert.ok(plan.some(step => step.tool === "search_ingredients"));
  assert.equal(plan.at(-1).tool, "inspect_simulation");
  assert.ok(plan.length <= 12);
});

test("side-effect tools require explicit confirmation", async () => {
  const submissions = { submit: async value => value };
  const registry = createMangrokToolRegistry({ submissions });
  const denied = await registry.execute("submit_ingredient", { name: "Example leaf" }, { confirmedTools: new Set() });
  assert.equal(denied.ok, false);
  const allowed = await registry.execute("submit_ingredient", { name: "Example leaf" }, { confirmedTools: new Set(["submit_ingredient"]) });
  assert.equal(allowed.ok, true);
});

test("skills and agent context stay explicit and bounded", async () => {
  const skills = selectAgentSkills({ query: "Remember my Korean substitutions", input: { ingredients: ["Gochujang"] } });
  assert.ok(skills.some(skill => skill.id === "memory-recall"));
  const registry = createMangrokToolRegistry();
  const plan = [{ tool: "ingredient_profile", args: { name: "Gochujang" }, reason: "Resolve alias" }];
  const results = await executeAgentPlan(plan, registry, {});
  const context = buildMangrokAgentContext({ skills, toolManifest: registry.manifest(), toolResults: results });
  assert.ok(context.systemRules.some(rule => /sealed/i.test(rule)));
  assert.ok(context.tools.length >= 8);
  assert.equal(context.toolResults[0].tool, "ingredient_profile");
});
