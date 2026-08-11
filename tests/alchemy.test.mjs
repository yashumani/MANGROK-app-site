import test from "node:test";import assert from "node:assert/strict";import { simulateAlchemy,profileIngredient,buildAlchemyPrompt,mergeAIInsight } from "../src/culinary-engine.js";import { parseStructuredResponse } from "../src/local-ai.js";import { buildBookHtml } from "../src/print.js";
test("ingredient profiles and deterministic simulation are useful",()=>{assert.ok(profileIngredient("Lemon").acidic>.5);assert.ok(profileIngredient("Mushroom").umami>.5);const r=simulateAlchemy({ingredients:["Chicken","Garlic","Lemon","Tomato","Olive oil","Basil"],equipment:["Cast-iron skillet","Tongs"],technique:"sear",heat:"medium-high",timeMinutes:18});assert.ok(r.confidence>=60);assert.ok(r.stages.length>=3);assert.equal(r.evolutions.length,4)});
test("unsafe timing is flagged",()=>{const r=simulateAlchemy({ingredients:["Chicken","Garlic"],equipment:["Frying pan"],technique:"sear",heat:"low",timeMinutes:4});assert.ok(r.risks.some(x=>x.severity==="high"))});
test("prompt and local model response stay structured",()=>{const r=simulateAlchemy({ingredients:["Tomato","Basil"],equipment:["Mixing bowl"],technique:"mix",heat:"off"});assert.equal(buildAlchemyPrompt(r.input,r).length,2);assert.deepEqual(parseStructuredResponse('```json\n{"title":"Dish"}\n```'),{title:"Dish"});assert.equal(mergeAIInsight(r,{confidenceAdjustment:50}).confidence,Math.min(99,r.confidence+10))});
test("print output accepts illustration ids and remains escaped",()=>{const recipe={id:"r",title:"<Pie>",summary:"",ingredients:["x"],steps:["y"],privacy:"private",origin:{}};const html=buildBookHtml({title:"Book",recipes:[recipe],decorations:["ingredients"]});assert.match(html,/cover-art/);assert.match(html,/&lt;Pie&gt;/);assert.doesNotMatch(html,/<Pie>/)});

test("Alchemy navigation is activated and the primary UI stays image-first",async()=>{
  const {readFile}=await import("node:fs/promises");
  const [html,ui,kitchen]=await Promise.all([
    readFile(new URL("../index.html",import.meta.url),"utf8"),
    readFile(new URL("../src/alchemy-ui.js",import.meta.url),"utf8"),
    readFile(new URL("../src/kitchen-ui.js",import.meta.url),"utf8")
  ]);
  assert.match(ui,/dataset\.alchemyNav/);
  assert.match(ui,/dataset\.alchemyMobile/);
  assert.match(ui,/button=>\{button\.onclick=open\}/);
  assert.doesNotMatch(`${html}\n${ui}\n${kitchen}`,/[🍅🌿🍳🔪🥬🫙⚙⌂◎▤◇♢＋✦]/u);
  assert.match(kitchen,/GENERATED_IMAGES/);
});
