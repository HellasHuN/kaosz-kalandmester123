import assert from "node:assert/strict";
import test from "node:test";
import { spells } from "../src/varazslatAdatok.js";
import { spellCost } from "../src/magiaSzabalyok.js";

const scarlet = spells.filter(spell => spell.codex === "Skarlát");
const quote = (id, context) => spellCost(scarlet.find(spell => spell.id === `official:${id}`), "academic", context);
test("Skarlát costs enforce the relevant book increments", () => {
  assert.deepEqual(quote("tuzgolyo", { approvedEp: 30 }), { ep: 30, difficulty: 5 });
  assert.equal(quote("tuzgolyo", { approvedEp: 35 }).ep, 35);
  assert.equal(quote("tuzgolyo", { approvedEp: 32 }).ep, null);
  assert.equal(quote("tuzgolyo", { approvedEp: 25 }).ep, null);
  assert.equal(quote("tuzgat", { approvedEp: 20 }).ep, 20);
  assert.equal(quote("tuzgat", { approvedEp: 19 }).ep, null);
  assert.equal(quote("langcsapok", { units: 2 }).ep, 30);
  assert.equal(quote("izzo-tenyer", { units: 2 }).ep, 8);
  assert.equal(quote("langpenge", { units: 3 }).ep, 30);
  assert.equal(quote("tuzgat", {}).ep, null);
  assert.equal(quote("taszito-langok", { approvedEp: 35 }).ep, null);
});

test("Tűzgyűrű checks target-specific cost, difficulty and eligibility", async () => {
  const { readMagic, spellReadiness } = await import("../src/magiaSzabalyok.js");
  const spell = scarlet.find(spell => spell.id === "official:tuzgyuru");
  assert.deepEqual(quote("tuzgyuru", { target: { self: true } }), { ep: 22, difficulty: 5 });
  assert.deepEqual(quote("tuzgyuru", { target: { self: false } }), { ep: 44, difficulty: 7 });
  assert.deepEqual(quote("tuzgyuru", {}), { ep: null, difficulty: null });
  const character = { stats: [55, 55, 55, 70, 50], skills: { Mágiaelmélet: 5,
    "Mágiahasználat (akadémikus)": 5, Esszenciafelszabadítás: 10 } };
  const magic = readMagic({ magic: { activeEp: 65, acquisitions: [{ spellId: spell.id, form: "academic" }] } });
  assert.equal(spellReadiness(character, magic, spell, "academic", { conditionsConfirmed: true, target: { self: true } }).state, "ready");
  assert.equal(spellReadiness(character, magic, spell, "academic", { conditionsConfirmed: true, target: { self: false } }).state, "denied");
});

test("all 38 book catalog entries have individual WebP art", async () => {
  const { readFile } = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  assert.equal(scarlet.length, 38);
  const hashes = await Promise.all(scarlet.map(async spell => {
    assert.ok(spell.page >= 185 && spell.page <= 191);
    const art = await readFile(new URL(`../public/magic-scarlet/${spell.id.slice("official:".length)}.webp`, import.meta.url));
    assert.equal(art.toString("ascii", 8, 12), "WEBP");
    return createHash("sha256").update(art).digest("hex");
  }));
  assert.equal(new Set(hashes).size, scarlet.length);
});
