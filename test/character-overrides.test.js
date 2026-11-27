import assert from "node:assert/strict";
import test from "node:test";
import { recordCharacterOverrides } from "../src/characterOverrides.js";

test("character overrides require a reason and append changes without mutating prior entries", () => {
  const prior = [{ field: "Életkor", before: 30, after: 150, reason: "Varázslat", recordedAt: "2026-11-26" }];
  const changes = [{ field: "Aktív Ep", before: 40, after: 130 }, { field: "Jártasság", before: 5, after: 12 }];
  assert.equal(recordCharacterOverrides(prior, changes, " "), null);
  assert.equal(recordCharacterOverrides(prior, changes, null), null);
  assert.equal(recordCharacterOverrides(prior, [], null), prior);
  assert.deepEqual(recordCharacterOverrides(prior, changes, "  KM döntés  ", "2026-11-27"),
    [...prior, ...changes.map(change => ({ ...change, reason: "KM döntés", recordedAt: "2026-11-27" }))]);
  assert.equal(prior.length, 1);
});
