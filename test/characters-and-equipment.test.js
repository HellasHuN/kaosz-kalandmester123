import assert from "node:assert/strict";
import test from "node:test";
import { ageStage, attributes, characterStats, clampAttributeAdjustment, effectiveAttribute, statLimits, statPoints } from "../src/karakterFoeertekek.js";
import { racialAbilityCost, racialSelectionError } from "../src/fajiSzabalyok.js";
import { characterSpeed } from "../src/gyorsasag.js";
import { armorProtection } from "../src/felszereltVert.js";
import { readCharacters, writeCharacters } from "../src/karakterMentes.js";

test("the five named attributes share 270 points and legacy characters receive a fifth default", () => {
  assert.deepEqual(attributes.map(([name]) => name), ["Fizikum", "Rátermettség", "Tudat", "Esszencia", "Érzékelés"]);
  const legacy = { stats: [55, 55, 55, 55] };
  assert.deepEqual(characterStats(legacy), [55, 55, 55, 55, 50]);
  assert.equal(characterStats(legacy).reduce((sum, value) => sum + value, 0), statPoints());
  assert.equal(statPoints(), 270);
  assert.equal(characterStats({ stats: [55, 55, 55, 55, 48] })[4], 48);
});

test("an attribute adjustment respects the whole-point twenty-percent cap", () => {
  const character = { stats: [54, 55, 55, 55, 51], adjustments: [clampAttributeAdjustment(54, 12)] };
  assert.equal(clampAttributeAdjustment(54, -12), -10);
  assert.equal(effectiveAttribute(character, 0, 1), 64);
  assert.equal(effectiveAttribute(character, 0, -1), 44);
});

test("age thresholds have inclusive boundaries and fractional ages are rejected", () => {
  const limits = [13, 70, 90, 110];
  assert.deepEqual([12, "13", 69, 70, 90, 91, 13.5, 0].map(age => ageStage(age, limits)),
    ["juvenis", "adultus", "adultus", "senius", "senius", "extrém", null, null]);
  assert.deepEqual([50, 70, 80].map(statPoints), [135, 189, 216]);
});

test("senius adjustment lowers physical racial minima and raises mental maxima by floored mean", () => {
  const racial = [[30, 80], [40, 90], [25, 80], [35, 90]];
  assert.deepEqual(statLimits(racial, 50), [[15, 80], [20, 90], [25, 97], [35, 107], [0, 100]]);
});

test("racial options keep their cost and prerequisite", () => {
  assert.match(racialSelectionError("Manó", "", ["Méreg érzékelése"]), /immunitás/);
  assert.equal(racialSelectionError("Manó", "", ["Méreg érzékelése", "Teljes méreg- és betegségimmunitás"]), "");
  assert.equal(racialAbilityCost("Ember", "", ["Ember-mhyori"]), 25);
});

const armor = { catalogId: "mellvert", quantity: 1, equipped: true, values: { massKg: 6, speedModifier: 3, armorLevel: 5 } };
const zones = ["Fej", "Mellkas", "Bal láb"];

test("worn armor applies its movement penalty and Vértviselet reduces it", () => {
  const human = { race: "Ember", equipment: { items: [armor] } };
  assert.equal(characterSpeed(human).value, 10);
  assert.equal(characterSpeed({ ...human, skills: { Vértviselet: 6 } }).value, 8);
  assert.equal(characterSpeed({ ...human, equipment: { items: [{ ...armor, equipped: false }] } }).value, 7);
});

test("load penalties differ by race and apply to carried armor", () => {
  const items = [{ ...armor, equipped: false, quantity: 2 }];
  assert.equal(characterSpeed({ race: "Ember", equipment: { items } }).value, 8);
  assert.equal(characterSpeed({ race: "Ogár", equipment: { items } }).value, 9);
});

test("stacking movement-restricting armor is flagged for a narrator decision", () => {
  const result = characterSpeed({ race: "Ember", equipment: { items: [armor, { ...armor, catalogId: "borvert", values: { massKg: 4, speedModifier: 2 } }] } });
  assert.equal(result.value, null);
  assert.match(result.reason, /Mesélői döntés/);
});

test("armor protection is zoned and preserves uncertainty in old equipment", () => {
  const { protection } = armorProtection({ items: [armor] }, zones);
  assert.deepEqual(protection.Mellkas, { levels: [5], covered: true, unknown: false });
  assert.deepEqual(protection.Fej, { levels: [], covered: false, unknown: false });
  assert.equal(armorProtection({ items: { mellvert: 1 } }, zones).unknownEquipment, true);
  assert.equal(armorProtection({ items: [{ ...armor, values: {} }] }, zones).unknownLevel, true);
});

test("a mixed-era character round-trips skill ranks, custom fields, equipment and magic", () => {
  const character = {
    id: 31, name: "Próba", race: "Ember", stats: [51, 52, 53, 54], jp: 40,
    skills: { Lovaglás: 2 }, equipment: { items: { mellvert: 1 } },
    magic: { patron: "Ordinis", acquisitions: [{ spellId: "legacy", form: "sacred" }] },
    custom: { notes: "megőrzendő" },
  };
  let raw = null;
  const storage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
  assert.equal(writeCharacters(storage, [character], null), true);
  assert.deepEqual(readCharacters(storage, ["Ember"]).characters, [character]);
});

test("duplicate ids protect the original save from overwrite", () => {
  const raw = JSON.stringify([{ id: 1, name: "Első" }, { id: "1", name: "Második" }]);
  const storage = { getItem: () => raw, setItem: () => assert.fail("overwrite") };
  const result = readCharacters(storage);
  assert.equal(result.blocked, true);
  assert.deepEqual(result.characters.map(c => c.name), ["Első"]);
  assert.equal(writeCharacters(storage, result.characters, raw), false);
});
