import test from "node:test";
import assert from "node:assert/strict";
import { coordinatesOf, distanceMeters, filterPlaces, priceValue, validateCriteria } from "../js/domain/search.js";
import { SEARCH_LIMITS } from "../js/config.js";

test("coordinates and price representations are normalized", () => {
  assert.deepEqual(coordinatesOf({ lat: () => 25, lng: () => 121 }), { lat: 25, lng: 121 });
  assert.equal(coordinatesOf({ lat: "x", lng: 121 }), null);
  assert.equal(priceValue("PRICE_LEVEL_MODERATE"), 2);
  assert.equal(priceValue(undefined), null);
});

test("distance uses meters and honors hard boundary", () => {
  const center = { lat: 25, lng: 121 };
  const near = { displayName: "near", location: { lat: 25.001, lng: 121 }, rating: 5 };
  const far = { displayName: "far", location: { lat: 25.02, lng: 121 }, rating: 5 };
  assert.ok(distanceMeters(center, near.location) > 100 && distanceMeters(center, near.location) < 115);
  const result = filterPlaces([near, far], center, { radius: 100, minRating: 0, minPrice: 0, maxPrice: 4 }, 15);
  assert.deepEqual(result.map(({ place }) => place.displayName), ["near"]);
});

test("filter applies rating, price, unknown-price and invalid-location edges", () => {
  const center = { lat: 25, lng: 121 };
  const base = { location: center, rating: 4.6 };
  const places = [{ ...base, displayName: "ok", priceLevel: "MODERATE" }, { ...base, displayName: "unknown" }, { ...base, displayName: "low", rating: 3 }, { displayName: "bad" }];
  const criteria = { radius: 100, minRating: 4, minPrice: 1, maxPrice: 3, includeUnknownPrice: false };
  assert.deepEqual(filterPlaces(places, center, criteria).map(({ place }) => place.displayName), ["ok"]);
  assert.deepEqual(filterPlaces(places, center, { ...criteria, includeUnknownPrice: true }).map(({ place }) => place.displayName), ["ok", "unknown"]);
});

test("criteria validation covers range and ordering", () => {
  assert.equal(validateCriteria({ radius: 100, minRating: 4, minPrice: 1, maxPrice: 3 }, SEARCH_LIMITS), null);
  assert.match(validateCriteria({ radius: 99, minRating: 4, minPrice: 1, maxPrice: 3 }, SEARCH_LIMITS), /半徑/);
  assert.match(validateCriteria({ radius: 100, minRating: 6, minPrice: 1, maxPrice: 3 }, SEARCH_LIMITS), /評分/);
  assert.match(validateCriteria({ radius: 100, minRating: 4, minPrice: 4, maxPrice: 1 }, SEARCH_LIMITS), /最低價位/);
});
