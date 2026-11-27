import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { allocateStartingStats, perceptionLimits, races, statLimits, statPoints } from "../src/karakterFoeertekek.js";
import { subraces } from "../src/fajiSzabalyok.js";
import { creationGenderOptions } from "../src/szarmazas.js";
import { portraitFile } from "../src/teszt/ancestryTheme.js";
import { readCharacters } from "../src/karakterMentes.js";

test("all races start within their five adult limits with a total of 270", () => {
  const allocations = Object.entries(races).map(([race, racial]) => {
    const perception = perceptionLimits[race];
    const limits = statLimits(racial, 100, perception.range);
    const stats = allocateStartingStats(limits, statPoints(), perception.suggested);
    assert.equal(stats.reduce((sum, stat) => sum + stat, 0), 270, race);
    assert.ok(stats.every((stat, index) => stat >= limits[index][0] && stat <= limits[index][1]), race);
    assert.equal(stats[4], perception.suggested, race);
    return stats.join(",");
  });
  assert.equal(new Set(allocations).size, Object.keys(races).length);
});

test("every legal race, subrace and gender resolves to a dedicated WebP portrait", async () => {
  const files = new Set();
  for (const race of Object.keys(races)) {
    const genders = creationGenderOptions(race);
    for (const variant of [undefined, ...subraces[race] ?? []]) {
      for (const gender of genders.length ? genders : [""]) {
        const file = portraitFile(race, variant, gender);
        assert.ok(!files.has(file), file);
        files.add(file);
        const image = await readFile(new URL(`../public/ancestry/portraits/${file}`, import.meta.url));
        assert.equal(image.toString("ascii", 8, 12), "WEBP");
      }
    }
  }
  assert.equal(files.size, 58);
});

test("explicit GM overrides round-trip while invalid skill ranks are rejected", () => {
  const character = { id: 1, name: "KM-próba", gmOverrides: true, stats: [90, 60, 80, 80, 85],
    age: 200, skills: { Esszenciafelszabadítás: 12 }, magic: { activeEp: 150 } };
  const read = value => readCharacters({ getItem: () => JSON.stringify([value]) });
  assert.deepEqual(read(character).characters, [character]);
  assert.equal(read({ ...character, gmOverrides: false }).blocked, true);
  assert.equal(read({ ...character, skills: { Esszenciafelszabadítás: -1 } }).blocked, true);
});
