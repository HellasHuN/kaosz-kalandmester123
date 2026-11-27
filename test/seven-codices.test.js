import assert from "node:assert/strict";
import test from "node:test";
import { codexEdition, editionArtwork, remainingCodexNames } from "../src/magic/codexEditions.js";
import { spells } from "../src/varazslatAdatok.js";
import { spellCost } from "../src/magiaSzabalyok.js";

test("all seven editions have their own seals and all 223 catalog formulas have an illustration", () => {
  const totals = [15, 16, 63, 86, 14, 19, 10];
  const seals = [];
  const art = [];
  for (const [index, codex] of remainingCodexNames.entries()) {
    const edition = codexEdition(codex);
    const catalog = spells.filter(spell => spell.codex === codex);
    assert.equal(catalog.length, totals[index]);
    seals.push(editionArtwork(edition));
    for (const formula of catalog) {
      assert.ok(formula.page > 0);
      art.push(editionArtwork(edition, formula.id));
    }
  }
  assert.equal(new Set(seals).size, 7);
  assert.equal(new Set(art).size, 223);
});

test("the editions use existing flight, unit and unresolved variable cost rules", () => {
  const flight = spells.find(entry => entry.id === "official:repules");
  const quote = target => spellCost(flight, "academic", { units: 2, target }).ep;
  assert.equal(quote({ self: true }), 10);
  for (const [kg, ep] of [[100, 20], [101, 40], [150, 40], [151, 80], [200, 80], [201, null]]) {
    assert.equal(quote({ self: false, kg }), ep);
  }
  const unit = spells.find(entry => remainingCodexNames.includes(entry.codex) && entry.ep?.kind === "perUnit");
  const variable = spells.find(entry => remainingCodexNames.includes(entry.codex) && entry.ep?.kind === "variable");
  assert.equal(spellCost(unit, "academic", { units: 2 }).ep, 2 * unit.ep.amount);
  assert.equal(spellCost(variable, "academic", { units: 2, approvedEp: 20 }).ep, null);
});
