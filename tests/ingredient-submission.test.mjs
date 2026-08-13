import test from "node:test";
import assert from "node:assert/strict";
import { IngredientSubmissionQueue } from "../src/ingredient-submissions.js";
import { resolveIngredient } from "../src/ingredient-catalog.js";

test("submission requires confirmation and becomes a personal ingredient", async () => {
  const queue = new IngredientSubmissionQueue();
  await assert.rejects(() => queue.submit({ name: "Family mountain leaf", category: "Herbs & spices" }), /confirmation/i);
  const row = await queue.submit({ name: "Family mountain leaf", category: "Herbs & spices", cuisines: ["Family tradition"] }, { confirmed: true, syncCloud: false });
  assert.equal(row.status, "pending");
  assert.equal(resolveIngredient("Family mountain leaf")?.status, "personal");
  const rows = await queue.list();
  assert.ok(rows.some(item => item.id === row.id));
});

test("duplicate published ingredient is linked rather than silently republished", async () => {
  const queue = new IngredientSubmissionQueue();
  const row = await queue.submit({ name: "Gochujang", category: "Oils, sauces & condiments" }, { confirmed: true, syncCloud: false });
  assert.equal(row.status, "merged");
  assert.ok(row.duplicateOf);
});
