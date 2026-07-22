import test from "node:test";
import assert from "node:assert/strict";
import { FOOD_TYPES, POPULAR_FOOD_TYPES } from "../js/config/food-types.js";

test("Food and Drink Table A catalog is complete, unique, and searchable", () => {
  assert.equal(FOOD_TYPES.length, 166);
  assert.equal(new Set(FOOD_TYPES.map(type => type.id)).size, FOOD_TYPES.length);
  assert.ok(FOOD_TYPES.every(type => type.id && type.label && type.group));
  assert.ok(POPULAR_FOOD_TYPES.every(id => FOOD_TYPES.some(type => type.id === id)));
  assert.ok(FOOD_TYPES.some(type => type.id === "taiwanese_restaurant"));
  assert.ok(FOOD_TYPES.some(type => type.id === "yakitori_restaurant"));
});
