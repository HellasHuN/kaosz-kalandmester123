import { test } from "node:test";
import assert from "node:assert/strict";
import { addTrialOverride, revokeTrialOverride, trialOverride } from "../src/teszt/trialOverrides.js";

test("a KM célértéke karakterhez és főértékhez kötött, visszavonható és naplózott", () => {
  const character = { id: 4, name: "Léna" };
  const legacy = { id: "old", character: "Léna", rule: "Fizikum", approved: "80" };
  const [old, entry] = addTrialOverride([legacy], character, "Fizikum", 50, 75, "Kalandhatás", "new", "2026-11-26");
  assert.equal(old, legacy);
  assert.equal(entry.previous, "50");
  assert.equal(trialOverride([old, entry], 4, "Fizikum"), entry);
  assert.equal(trialOverride([old, entry], 5, "Fizikum"), undefined);
  assert.equal(trialOverride([old, entry], 4, "Tudat"), undefined);
  const revoked = revokeTrialOverride([old, entry], "new", "2026-11-27");
  assert.equal(revoked[1].revokedAt, "2026-11-27");
  assert.equal(trialOverride(revoked, 4, "Fizikum"), undefined);
  assert.equal(entry.revokedAt, undefined);
  const replaced = addTrialOverride([old, entry], character, "Fizikum", 75, 60, "Új döntés", "newer", "2026-11-28");
  assert.equal(replaced[1].revokedAt, "2026-11-28");
  assert.equal(revokeTrialOverride(replaced, "newer", "2026-11-29").filter(x => !x.revokedAt).length, 1);
  assert.equal(addTrialOverride(revoked, character, "Fizikum", 50, 1.5, "Indok", "bad", "date"), revoked);
});
