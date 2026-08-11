import test from "node:test";
import assert from "node:assert/strict";
import {
  INGREDIENT_LIBRARY,
  EQUIPMENT_LIBRARY,
  KITCHEN_LIBRARY_COUNTS,
  kitchenCategories,
  findKitchenItem
} from "../src/kitchen-library.js";

test("visual kitchen library provides broad ingredient and equipment coverage", () => {
  assert.ok(INGREDIENT_LIBRARY.length >= 150);
  assert.ok(EQUIPMENT_LIBRARY.length >= 80);
  assert.equal(KITCHEN_LIBRARY_COUNTS.total, INGREDIENT_LIBRARY.length + EQUIPMENT_LIBRARY.length);
});

test("kitchen library names are unique within each mode", () => {
  assert.equal(new Set(INGREDIENT_LIBRARY.map(item => item.name.toLowerCase())).size, INGREDIENT_LIBRARY.length);
  assert.equal(new Set(EQUIPMENT_LIBRARY.map(item => item.name.toLowerCase())).size, EQUIPMENT_LIBRARY.length);
});

test("categories and lookup remain predictable", () => {
  assert.equal(kitchenCategories("ingredients")[0], "All");
  assert.ok(kitchenCategories("equipment").includes("Utensils"));
  assert.equal(findKitchenItem("tomato")?.name, "Tomato");
  assert.equal(findKitchenItem("chef knife", "equipment")?.category, "Utensils");
  assert.equal(findKitchenItem("not in library"), null);
});
