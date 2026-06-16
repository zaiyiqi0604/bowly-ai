import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMotivationLevel } from "../dist/services/reportNormalize.js";

test("normalizeMotivationLevel accepts canonical enum values", () => {
  assert.equal(normalizeMotivationLevel("low"), "low");
  assert.equal(normalizeMotivationLevel("medium"), "medium");
  assert.equal(normalizeMotivationLevel("high"), "high");
  assert.equal(normalizeMotivationLevel("High"), "high");
});

test("normalizeMotivationLevel maps common Qwen phrases", () => {
  assert.equal(normalizeMotivationLevel("moderate"), "medium");
  assert.equal(normalizeMotivationLevel("building confidence"), "medium");
  assert.equal(normalizeMotivationLevel("very motivated"), "high");
  assert.equal(normalizeMotivationLevel("a bit tired"), "low");
});

test("normalizeMotivationLevel defaults unknown values to medium", () => {
  assert.equal(normalizeMotivationLevel("unclear"), "medium");
  assert.equal(normalizeMotivationLevel(null), "medium");
  assert.equal(normalizeMotivationLevel(42), "medium");
});
