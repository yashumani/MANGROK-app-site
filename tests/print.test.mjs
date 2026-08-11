import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto;
import { analyzePrintProject, buildBookHtml, buildPrintProofManifest, escapeHtml, assertSecretApproval } from "../src/print.js";
import { normalizeRecipe } from "../src/model.js";

const recipe = normalizeRecipe({
  id: "recipe_1",
  title: "<Family & Pie>",
  summary: "A <script>alert(1)</script> recipe",
  ingredients: ["1 < cup"],
  steps: ["Mix & bake"],
  origin: { story: "Story <b>" },
  secret: { ciphertext: "x", iv: "y", salt: "z", iterations: 310000, version: 1 }
});

test("print renderer escapes user content", () => {
  const html = buildBookHtml({ title: "Book <x>", recipes: [recipe] });
  assert.ok(html.includes("&lt;Family &amp; Pie&gt;"));
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.equal(escapeHtml('a"b'), "a&quot;b");
});

test("secret printing requires explicit approval", () => {
  assert.throws(() => buildBookHtml({ title: "Book", recipes: [recipe], includeSecrets: true, unlockedSecrets: { recipe_1: "secret" } }), /Confirm/);
  assert.doesNotThrow(() => assertSecretApproval(true, new Date().toISOString()));
});

test("approved secret appears once and is labelled", () => {
  const html = buildBookHtml({ title: "Book", recipes: [recipe], includeSecrets: true, secretApprovalAt: new Date().toISOString(), unlockedSecrets: { recipe_1: "hidden ratio" } });
  assert.ok(html.includes("hidden ratio"));
  assert.ok(html.includes("intentionally printed"));
});

test("print preflight fails incomplete projects and estimates even pages", () => {
  const incomplete = analyzePrintProject({ title: "", recipes: [] });
  assert.equal(incomplete.ready, false);
  assert.ok(incomplete.errors.length >= 2);
  const complete = analyzePrintProject({ title: "Family Book", dedication: "For us", recipes: [recipe], decorations: ["ingredients"] });
  assert.equal(complete.ready, true);
  assert.equal(complete.estimatedPages % 2, 0);
  assert.equal(complete.recipeCount, 1);
});

test("proof manifests contain metadata but never unlocked secret text", () => {
  const proof = buildPrintProofManifest({ title: "Family Book", recipes: [recipe], includeSecrets: true, secretApprovalAt: new Date().toISOString(), unlockedSecrets: { recipe_1: "do not include" } });
  assert.equal(proof.ready, true);
  assert.equal(proof.secretApprovalRecorded, true);
  assert.doesNotMatch(JSON.stringify(proof), /do not include/);
});
