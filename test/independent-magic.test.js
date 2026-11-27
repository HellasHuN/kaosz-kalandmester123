import assert from "node:assert/strict";
import test from "node:test";
import { spells } from "../src/varazslatAdatok.js";
import { spellCost } from "../src/magiaSzabalyok.js";

const choose = id => spells.find(spell => spell.codex === "Kódexfüggetlen" && spell.id === `official:${id}`);
const cost = (id, units) => spellCost(choose(id), "academic", { units }).ep;

test("book-verified variable costs use spell-specific units and bounds", () => {
  assert.equal(cost("sebokozas", 3), 18);
  assert.equal(cost("sebokozas", 10), 60);
  assert.equal(cost("sebokozas", 11), null);
  assert.equal(cost("sebokozas", 0), null);
  assert.equal(cost("rosszakarat-joakarat", 2), 10);
  assert.equal(cost("remseges-allkapcsok", 3), 30);
  assert.equal(cost("sebgyogyitas", 3), null);
});

test("manual effect dice require exactly the approved number of valid d6 faces", async () => {
  const { readDamageDice } = await import("../src/magiaSzabalyok.js");
  assert.deepEqual(readDamageDice("1, 6 4", 3), [1, 6, 4]);
  for (const input of ["1 6", "1 6 7", "1 6 4 3", "1.5 6 4", ""]) {
    assert.equal(readDamageDice(input, 3), null);
  }
});

test("referenced and KM-supplied costs reject missing or out-of-range inputs", () => {
  const memory = choose("emlekezeterosites");
  assert.equal(spellCost(memory, "academic", { approvedEp: 9 }).ep, null);
  assert.equal(spellCost(memory, "academic", { approvedEp: 40 }).ep, 40);
  assert.equal(spellCost(memory, "academic", { approvedEp: 51 }).ep, null);
  const immunity = choose("immunitas-varazslatra");
  assert.equal(spellCost(immunity, "academic", { referenceSpellId: "official:magia-erzekelese" }).ep, 5);
  assert.equal(spellCost(immunity, "academic", { referenceSpellId: "official:varazslovedek" }).ep, null);
});

test("all independent catalog entries have distinct spell artwork", async () => {
  const { readFile } = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  const entries = spells.filter(spell => spell.codex === "Kódexfüggetlen");
  assert.equal(entries.length, 31);
  const artwork = await Promise.all(entries.map(async spell => {
    assert.ok(spell.page >= 180 && spell.page <= 185);
    const file = await readFile(new URL(`../public/magic-independent/${spell.id.slice("official:".length)}.webp`, import.meta.url));
    return createHash("sha256").update(file).digest("hex");
  }));
  assert.equal(new Set(artwork).size, entries.length);
});
