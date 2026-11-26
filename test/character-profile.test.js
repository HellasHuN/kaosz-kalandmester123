import assert from "node:assert/strict";
import test from "node:test";
import { profileError, readProfile } from "../src/characterProfile.js";
import { planCharacterImport } from "../src/karakterMentes.js";

test("optional profile fields are backward compatible and only changed data is validated", () => {
  const old = { id: "old", name: "Régi", heightCm: "ismeretlen", birthplace: "Kert" };
  const profile = readProfile(old);
  assert.equal(profile.birthplace, "Kert");
  assert.equal(profile.heightCm, "ismeretlen");
  assert.equal(profileError({ ...profile, eyeColor: "barna" }, profile), "");
  assert.match(profileError({ ...profile, heightCm: "-1" }, profile), /pozitív/);
  assert.equal(profileError({ ...profile, heightCm: "181.5" }, profile), "");
  const updated = { ...old, profile: { heightCm: "181.5", eyeColor: "barna" } };
  const result = planCharacterImport(JSON.stringify([updated]), []);
  assert.deepEqual(result.characters, [updated]);
});
