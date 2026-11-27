import assert from "node:assert/strict";
import test from "node:test";
import * as casting from "../src/teszt/sacredCasting.js";
import { readCharacters } from "../src/karakterMentes.js";
import { readMagic } from "../src/magiaSzabalyok.js";
import { spells } from "../src/varazslatAdatok.js";

const spell = spells.find(entry => entry.id === "official:esszencia-erzekelese");
const character = {
  id: "failure-test", name: "Őrtűz", race: "Ember",
  stats: [55, 55, 55, 55, 50], skills: { "Mágiahasználat (akadémikus)": 1, Mágiaelmélet: 1, Esszenciafelszabadítás: 4 },
  magic: { activeEp: 40, acquisitions: [{ spellId: spell.id, form: "academic" }] },
};
const context = { conditionsConfirmed: true };
const recordedAt = "2026-11-27T12:00:00.000Z";

test("failed independent rolls are pending, preserve their original data and charge no Ep", () => {
  const magic = readMagic(character);
  const normal = casting.recordIndependentFailure(character, magic, spell, context, { id: "normal", roll: 60, recordedAt });
  const critical = casting.recordIndependentFailure(character, normal, spell, context, { id: "critical", roll: 100, recordedAt });
  assert.equal(critical.activeEp, 40);
  assert.deepEqual(critical.castingLog.map(({ id, spellId, status, roll, target, recordedAt, consequence }) =>
    [id, spellId, status, roll, target, recordedAt, consequence]), [
    ["normal", spell.id, "pending", 60, 25, recordedAt, undefined],
    ["critical", spell.id, "pending", 100, 25, recordedAt, undefined],
  ]);
  assert.equal(casting.recordIndependentFailure(character, critical, spell, context, { id: "normal", roll: 60, recordedAt }), critical);
  assert.equal(casting.recordIndependentFailure(character, critical, spell, context, { id: "success", roll: 1, recordedAt }), critical);
  assert.equal(casting.undoSacredCasting(critical), critical);
});

test("KM adjudication charges the specified Ep once and retains the original attempt", () => {
  const pending = casting.recordIndependentFailure(character, readMagic(character), spell, context, { id: "normal", roll: 60, recordedAt });
  const reload = magic => readCharacters({ getItem: () => JSON.stringify([{ ...character, magic }]) });
  assert.equal(reload(pending).blocked, false);
  const reloaded = readMagic(reload(pending).characters[0]);
  const adjudication = { id: "normal", epLoss: 4, consequence: "A fény kialudt.", adjudicatedAt: "2026-11-27T13:00:00.000Z" };
  assert.equal(casting.adjudicateIndependentFailure(character, reloaded, { ...adjudication, epLoss: 41 }), reloaded);
  assert.equal(casting.adjudicateIndependentFailure(character, reloaded, { ...adjudication, consequence: "  " }), reloaded);
  const settled = casting.adjudicateIndependentFailure({ ...character, skills: {} }, reloaded, adjudication);
  assert.equal(settled.activeEp, 36);
  assert.equal(settled.castingLog.length, 1);
  assert.deepEqual(settled.castingLog[0], { ...pending.castingLog[0], status: "adjudicated",
    previousEp: 40, remainingEp: 36, consequence: adjudication.consequence, adjudicatedAt: adjudication.adjudicatedAt });
  assert.equal(casting.adjudicateIndependentFailure(character, settled, adjudication), settled);
  assert.equal(casting.undoSacredCasting(settled), settled);
  assert.deepEqual(reload(settled).characters[0].magic, settled);
});
