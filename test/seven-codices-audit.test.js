import assert from "node:assert/strict";
import test from "node:test";
import { codexEdition, editionArtwork, remainingCodexNames } from "../src/magic/codexEditions.js";
import { spells } from "../src/varazslatAdatok.js";
import { academicAccess } from "../src/teszt/academic.js";
import { readMagic, spellCost, spellReadiness, spellAccess } from "../src/magiaSzabalyok.js";
import { logAcademicCasting, recordAcademicPendingFailure, adjudicateAcademicFailure } from "../src/teszt/sacredCasting.js";

const expected = { Gránit: 15, Alabástrom: 16, Smaragd: 63, Fekete: 86, Ezüst: 14, Kígyókő: 19, Arany: 10 };
const entries = spells.filter(spell => Object.hasOwn(expected, spell.codex));
const fixture = (spell, hasFormula = true) => ({
  id: "audit-mage", name: "Audit", race: "Ember", stats: [60, 60, 60, 1000, 50],
  skills: { "Mágiahasználat (akadémikus)": 10, Mágiaelmélet: 10, Esszenciafelszabadítás: 10 },
  magic: { activeEp: 1000, acquisitions: hasFormula ? [{ spellId: spell.id, form: "academic" }] : [] },
});
const ctx = { conditionsConfirmed: true };
const date = "2026-11-27T12:00:00.000Z";

test("Audit: entire seven-codex roster, IDs, artwork decode and labels", () => {
  assert.equal(entries.length, 223);
  assert.equal(new Set(entries.map(spell => spell.id)).size, entries.length);
  for (const name of remainingCodexNames) {
    const catalog = entries.filter(spell => spell.codex === name);
    assert.equal(catalog.length, expected[name], name);
    const edition = codexEdition(name);
    assert.ok(edition);
    const images = catalog.map(spell => editionArtwork(edition, spell.id));
    assert.equal(new Set(images).size, catalog.length, name);
    for (const url of images) {
      assert.ok(url.startsWith("data:image/svg+xml,"));
      const svg = decodeURIComponent(url.slice("data:image/svg+xml,".length));
      assert.match(svg, /^<svg /);
      assert.match(svg, /<\/svg>$/);
    }
    for (const spell of catalog) {
      assert.ok(spell.name && spell.page >= 180 && spell.page <= 236);
      assert.ok(spell.type && spell.components && spell.castTime && spell.duration);
    }
  }
});

test("Audit: all fixed, per-unit and variable cost records obey the engine", () => {
  let fixed = 0, units = 0, variable = 0, flight = 0;
  for (const spell of entries) {
    const ep = spell.ep;
    if (ep.kind === "fixed") {
      fixed++;
      assert.equal(spellCost(spell, "academic", ctx).ep, ep.amount, spell.id);
    } else if (ep.kind === "perUnit") {
      units++;
      assert.equal(spellCost(spell, "academic", { units: 1 }).ep, ep.amount, spell.id);
      assert.equal(spellCost(spell, "academic", { units: 2 }).ep, ep.maxUnits < 2 ? null : 2 * ep.amount, spell.id);
      assert.equal(spellCost(spell, "academic", { units: 0 }).ep, null, spell.id);
    } else if (ep.kind === "variable") {
      variable++;
      assert.equal(spellCost(spell, "academic", ctx).ep, null, spell.id);
    } else if (ep.kind === "flight") {
      flight++;
      assert.equal(spellCost(spell, "academic", { target: {self: false, kg: 201}, units: 1 }).ep, null);
    } else {
      assert.fail("Unexpected cost kind: " + ep.kind + " for " + spell.id);
    }
  }
  assert.deepEqual({ fixed, units, variable, flight }, { fixed: 129, units: 27, variable: 66, flight: 1 });
});

test("Audit: all eligible fixed-cost formulas succeed once, decline duplicate charge, and persist one critical failure until KM adjudication", () => {
  let eligible = 0;
  const coveredCodices = new Set();
  for (const spell of entries) {
    if (spell.ep.kind !== "fixed" || !Number.isInteger(spell.difficulty) || spell.difficulty > 12) continue;
    const character = fixture(spell), magic = readMagic(character);
    if (spellReadiness(character, magic, spell, "academic", ctx).state !== "ready") continue;
    eligible++;
    coveredCodices.add(spell.codex);
    const operation = { id: "cast-" + spell.id, roll: 1, recordedAt: date, fpConfirmed: true };
    const success = logAcademicCasting(character, magic, spell, ctx, operation);
    assert.notEqual(success, magic, spell.id + " should cast");
    assert.equal(success.activeEp, 1000 - spell.ep.amount, spell.id);
    assert.equal(success.castingLog.length, 1, spell.id);
    assert.equal(logAcademicCasting(character, success, spell, ctx, operation), success, spell.id + " charged twice");
    const pending = recordAcademicPendingFailure(character, magic, spell, ctx, { id: "failed-" + spell.id, roll: 100, recordedAt: date });
    assert.notEqual(pending, magic, spell.id + " should record failure");
    assert.equal(pending.activeEp, 1000, spell.id);
    assert.equal(pending.castingLog[0].status, "pending", spell.id);
    assert.equal(recordAcademicPendingFailure(character, pending, spell, ctx, { id: "failed-" + spell.id, roll: 100, recordedAt: date }), pending);
    const after = adjudicateAcademicFailure(character, pending, { id: "failed-" + spell.id, epLoss: 2, consequence: "Audit KM", adjudicatedAt: date });
    assert.notEqual(after, pending, spell.id + " pending adjudication");
    assert.equal(after.activeEp, 998, spell.id);
    assert.equal(after.castingLog[0].status, "adjudicated", spell.id);
    assert.equal(adjudicateAcademicFailure(character, after, { id: "failed-" + spell.id, epLoss: 2, consequence: "Audit KM", adjudicatedAt: date }), after);
  }
  assert.ok(eligible >= 70, "Too few real spells were exercised: " + eligible);
  assert.equal(coveredCodices.size, 7);
  console.log("AUDIT: complete successful casting, duplicate-charge and critical/KM adjudication scenarios for", eligible, "distinct formulas.");
});

test("Audit: deny unavailable formulas and preserve human-approved Fp costs", () => {
  let fpChecks = 0, denied = 0;
  for (const spell of entries) {
    if (spell.ep.kind !== "fixed" || !Number.isInteger(spell.difficulty)) continue;
    const character = fixture(spell), magic = readMagic(character);
    if (spellReadiness(character, magic, spell, "academic", ctx).state !== "ready") continue;
    const unknown = fixture(spell, false), unknownMagic = readMagic(unknown);
    assert.notEqual(spellReadiness(unknown, unknownMagic, spell, "academic", ctx).state, "ready", spell.id);
    assert.equal(logAcademicCasting(unknown, unknownMagic, spell, ctx,
      { id: "unknown", roll: 1, recordedAt: date, fpConfirmed: true }), unknownMagic);
    denied++;
    if (spell.fp != null && spell.fp !== 0) {
      const operation = { id: "fp-" + spell.id, roll: 1, recordedAt: date };
      assert.equal(logAcademicCasting(character, magic, spell, ctx, operation), magic, spell.id + " bypassed Fp");
      assert.notEqual(logAcademicCasting(character, magic, spell, ctx, { ...operation, fpConfirmed: true }), magic);
      const manual = logAcademicCasting(character, magic, spell, ctx,
        { id: "manual-" + spell.id, method: "manual", recordedAt: date });
      assert.equal(manual.castingLog.at(-1).method, "manual");
      assert.equal(manual.activeEp, magic.activeEp - spell.ep.amount);
      fpChecks++;
    }
  }
  assert.ok(denied >= 70);
  assert.ok(fpChecks >= 30);
  console.log("AUDIT: acquisition checks", denied, "and KM-controlled Fp-cost checks", fpChecks);
});

test("Audit: a specialization must not lock out already known Kódexfüggetlen formulas", () => {
  const spell = spells.find(s => s.codex === "Kódexfüggetlen");
  const character = fixture(spell);
  const magic = readMagic(character);
  magic.academicSpecialization = { codex: "Fekete" };
  assert.equal(academicAccess(magic, spell).allowed, true, "Kódexfüggetlen must remain accessible despite specialization");
  assert.equal(spellAccess(character, magic, spell, "academic").allowed, true);
});
