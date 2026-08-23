import test from "node:test";
import assert from "node:assert/strict";
import { REFERENCE_RECIPES, REFERENCE_RECIPE_VERSION, cloneReferenceRecipe } from "../src/atelier-reference-recipes.js";

test("reference table contains source-aware diverse starter recipes", () => {
  assert.ok(REFERENCE_RECIPES.length >= 12);
  assert.ok(new Set(REFERENCE_RECIPES.map(item => item.tradition)).size >= 10);
  for (const item of REFERENCE_RECIPES) {
    assert.ok(item.id && item.title && item.context && item.adaptation);
    assert.ok(item.ingredients.length >= 5);
    assert.ok(item.steps.length >= 4);
    assert.ok(item.sources.length >= 2);
    assert.ok(item.sources.every(source => /^https:\/\//.test(source.url)));
    assert.equal(item.reviewState, "reviewed-reference");
  }
});

test("cloning a reference creates private editable lineage without mutating the source", () => {
  const source = REFERENCE_RECIPES[0];
  const clone = cloneReferenceRecipe(source, new Date("2026-08-18T12:00:00.000Z"));
  assert.notEqual(clone.id, source.id);
  assert.equal(clone.lineage.originId, source.id);
  assert.equal(clone.lineage.originVersion, REFERENCE_RECIPE_VERSION);
  assert.equal(clone.lineage.originType, "reference-recipe");
  assert.notEqual(clone.ingredients, source.ingredients);
  clone.ingredients.push("Personal adjustment");
  assert.equal(source.ingredients.includes("Personal adjustment"), false);
});

test("raw seafood reference preserves an explicit safety boundary", () => {
  const ceviche = REFERENCE_RECIPES.find(item => item.id === "peruvian-ceviche");
  assert.ok(ceviche);
  assert.match(`${ceviche.context} ${ceviche.adaptation} ${ceviche.steps.join(" ")}`, /raw|safety|hazard|microbiolog/i);
  assert.ok(ceviche.sources.some(source => /fda/i.test(source.name)));
});
