import assert from "node:assert/strict";
import test from "node:test";
import { attributeModifier, levelCost, paidLevels } from "../src/jpSzamitas.js";
import { clarifySpecialization, weaponRanks } from "../src/jartassagSzakosodasok.js";
import { skillPrerequisiteMessage } from "../src/jartassagElofeltetelek.js";
import { cancelTraining, committedJp, completeTraining, trainingQuote } from "../src/jartassagFejlesztes.js";
import { creationSkillLimit, updateCreationSkill } from "../src/alkotasiJartassagok.js";
import { freeMagicUse, gilfFreeTheory } from "../src/gilfMagia.js";
import { availableMagicEp, finishSacredSpell, freeMagicTrial, readMagic, recordAcquisition, spellCost, spellReadiness } from "../src/magiaSzabalyok.js";

const sword = "Fegyverforgatás – Egyenes kard";
const shortSword = "Fegyverforgatás – Rövid kard";
const attack = sword + " · támadás";
const defense = sword + " · védekezés";
const human = { race: "Ember", stats: [50, 40, 55, 75, 50], skills: {} };

test("weapon attacks and defenses share the first level but progress independently", () => {
  const character = { ...human, skills: { [sword]: 1, [attack]: 3 } };
  assert.match(skillPrerequisiteMessage({}, attack, 2, human), /első szint/);
  assert.deepEqual(weaponRanks(character, "egyenes-kard"), { attack: 3, defense: 1 });
  assert.equal(trainingQuote(character, defense, 0).level, 2);
  assert.match(skillPrerequisiteMessage(character.skills, "Visszatámadás – Egyenes kard", 2, character), /mindkét ág/);
});

test("a related weapon gets the existing common-level discount", () => {
  assert.equal(levelCost(human, shortSword, 1), 600);
  assert.equal(levelCost({ ...human, skills: { [sword]: 1 } }, shortSword, 1), 90);
  assert.equal(levelCost({ ...human, skills: { [sword]: 1 } }, "Fegyverforgatás – Alabárd", 1), 600);
});

test("clarifying a generic weapon preserves its recorded Jp and rejects ambiguous higher ranks", () => {
  const original = { skills: { Fegyverforgatás: 1 }, skillJpByLevel: { Fegyverforgatás: [600] } };
  const clarified = clarifySpecialization(original, "Fegyverforgatás", sword);
  assert.deepEqual(clarified.skills, { [sword]: 1 });
  assert.deepEqual(clarified.skillJpByLevel, { [sword]: [600] });
  assert.equal(clarifySpecialization({ skills: { Fegyverforgatás: 2 } }, "Fegyverforgatás", sword), null);
});

test("gilf free-magic purchase needs matching free theory and respects starting caps", () => {
  const gilf = { ...human, race: "Gilf", skills: { [gilfFreeTheory]: 3 } };
  assert.equal(creationSkillLimit(gilf, gilfFreeTheory), 4);
  assert.equal(creationSkillLimit(gilf, "Esszenciafelszabadítás"), 2);
  assert.equal(updateCreationSkill(gilf, 10000, freeMagicUse, 4), gilf.skills);
  assert.equal(updateCreationSkill(gilf, 10000, freeMagicUse, 3)[freeMagicUse], 3);
  assert.equal(creationSkillLimit(human, gilfFreeTheory), 0);
});

test("free-magic trials use the actual skill rank and difficulty", () => {
  assert.deepEqual(freeMagicTrial({ skills: { [freeMagicUse]: 2 } }, 2), { level: 2, target: 85 });
  assert.deepEqual(freeMagicTrial({ skills: { [freeMagicUse]: 2 } }, 3), { level: 2, target: 25 });
});

test("Jp attribute modifiers retain their threshold boundaries", () => {
  assert.deepEqual([29, 30, 40, 50, 69, 70, 80].map(value => attributeModifier(value, 50)), [100, 30, 15, 0, 0, -15, -30]);
  assert.deepEqual(paidLevels({ skillJpPaid: { Lovaglás: 230 } }, "Lovaglás", 2).prices, [230, 0]);
});

test("finishing training converts reserved Jp into a paid level exactly once", () => {
  const row = { level: 0, prices: [], training: { level: 1, cost: 150 } };
  assert.equal(committedJp({ Lovaglás: row }), 150);
  assert.equal(committedJp({ Lovaglás: cancelTraining(row) }), 0);
  const trained = completeTraining(row, "Lovaglás");
  assert.equal(trained.level, 1);
  assert.equal(committedJp({ Lovaglás: trained }), 150);
  assert.equal(completeTraining(trained, "Lovaglás"), trained);
});

const priest = { ...human, skills: { "Elhivatottság*": 2, Esszenciafelszabadítás: 10 } };
const sacredMagic = readMagic({ magic: { patron: "Ordinis", sacredCodices: ["Smaragd"], activeEp: 20 } });
const sacredSpell = (id, ep) => ({ id, codex: "Smaragd", difficulty: 2, ep });
const fixed = (amount) => ({ kind: "fixed", amount });

test("two sacred reservations consume only their respective Ep when they are cast", () => {
  const first = sacredSpell("first", fixed(8));
  const second = sacredSpell("second", fixed(12));
  const one = recordAcquisition(priest, sacredMagic, first, "sacred", {});
  const both = recordAcquisition(priest, one, second, "sacred", {});
  assert.equal(availableMagicEp(priest, both), 0);
  assert.equal(both.activeEp, 20);
  assert.equal(recordAcquisition(priest, both, first, "sacred", {}), both);
  const cast = finishSacredSpell(priest, both, first, { conditionsConfirmed: true }, true);
  assert.equal(cast.activeEp, 12);
  assert.equal(availableMagicEp(priest, cast), 0);
  assert.deepEqual(cast.acquisitions.map(entry => entry.spellId), ["second"]);
  assert.equal(availableMagicEp(priest, finishSacredSpell(priest, cast, second, {}, false)), 12);
});

test("variable sacred costs are recorded and altered costs cannot spend the reservation", () => {
  const spell = sacredSpell("duration", { kind: "perUnit", amount: 3, maxUnits: 4 });
  assert.equal(spellCost(spell, "sacred", { units: 5 }).ep, null);
  const acquired = recordAcquisition(priest, sacredMagic, spell, "sacred", { units: 2 });
  assert.equal(acquired.acquisitions[0].ep, 6);
  const changed = { units: 3, conditionsConfirmed: true };
  assert.equal(spellReadiness(priest, acquired, spell, "sacred", changed).state, "blocked");
  assert.equal(finishSacredSpell(priest, acquired, spell, changed, true), acquired);
});
