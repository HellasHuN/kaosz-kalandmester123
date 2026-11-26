import assert from "node:assert/strict";
import test from "node:test";
import { academicAccess, academicTheoryRank, generalTheory, validAcademicSpecialization } from "../src/teszt/academic.js";
import { spells } from "../src/varazslatAdatok.js";
import { creationSkillNames } from "../src/alkotasiJartassagok.js";

const skarlat = spells.filter(spell => spell.codex === "Skarlát");
const azure = spells.find(spell => spell.codex === "Azúr" && spell.type === skarlat[0].type);
const independent = spells.find(spell => spell.codex === "Kódexfüggetlen");
const magic = { academicSpecialization: { codex: "Skarlát", branch: azure.type },
  acquisitions: [{ spellId: azure.id, form: "academic" }] };

test("codex alone controls automatic eligibility and benefits", () => {
  assert.ok(validAcademicSpecialization({ codex: "Skarlát" }));
  assert.ok(new Set(skarlat.map(spell => spell.type)).size > 1);
  for (const spell of skarlat) assert.deepEqual(academicAccess(magic, spell), { allowed: true, bonus: 20, componentFree: true });
  for (const spell of [azure, independent]) assert.deepEqual(academicAccess(magic, spell), { allowed: false, bonus: 0, componentFree: false });
});

test("the general theory catalog has one entry and legacy ranks are combined by maximum", () => {
  assert.deepEqual(creationSkillNames.filter(name => name.startsWith(generalTheory)), [generalTheory]);
  assert.equal(academicTheoryRank({ [generalTheory]: 2, "Mágiaelmélet (szabad)": 6, "Mágiaelmélet (Azúr kódex)": 4 }), 6);
});

test("individual grants override only codex eligibility and preserve previously learned formulas", async () => {
  const { setAcademicGrant } = await import("../src/teszt/academic.js");
  const { academicMagicTrial, readMagic, spellAccess, spellReadiness } = await import("../src/magiaSzabalyok.js");
  const character = { stats: [55, 55, 55, 55, 50], skills: { [generalTheory]: 5, "Mágiahasználat (akadémikus)": 5 } };
  const spell = spells.find(entry => entry.id === "official:vizpermet");
  const initial = readMagic({ magic: { academicSpecialization: { codex: "Skarlát" }, activeEp: 0 } });
  const granted = setAcademicGrant(character, initial, spell, true);
  assert.equal(spellAccess(character, granted, spell, "academic").recorded, true);
  assert.equal(spellAccess(character, granted, spell, "academic").allowed, true);
  assert.equal(academicMagicTrial(character, granted, spell, 1).target, 96);
  const boosted = { ...granted, academicExceptions: {
    [spell.id]: { ...granted.academicExceptions[spell.id], bonus: true },
  } };
  assert.equal(academicMagicTrial(character, boosted, spell, 1).target, 100);
  assert.equal(academicAccess(boosted, spell).componentFree, false);
  assert.equal(spellReadiness(character, boosted, spell, "academic", { conditionsConfirmed: true }).state, "blocked");
  assert.equal(spellAccess({ skills: {} }, boosted, spell, "academic").allowed, false);
  assert.deepEqual(setAcademicGrant(character, boosted, spell, false).acquisitions, []);
  const historical = { ...initial, acquisitions: granted.acquisitions };
  assert.deepEqual(setAcademicGrant(character, setAcademicGrant(character, historical, spell, true), spell, false).acquisitions,
    historical.acquisitions);
  const general = { ...initial, academicSpecialization: null };
  assert.equal(spellAccess(character, setAcademicGrant(character, general, spell, true), spell, "academic").recorded, true);
});

test("general theory advancement reuses prior ranks without duplicate cost or rewritten history", async () => {
  const { creationSkillCosts, updateCreationSkill } = await import("../src/alkotasiJartassagok.js");
  const { trainingQuote, completeTraining } = await import("../src/jartassagFejlesztes.js");
  const { skillPrerequisiteMessage } = await import("../src/jartassagElofeltetelek.js");
  const legacy = "Mágiaelmélet (Azúr kódex)";
  const character = { race: "Ember", stats: [55, 55, 55, 55, 50], skills: { [legacy]: 4 },
    skillJpByLevel: { [legacy]: [101, 102, 103, 204] } };
  assert.equal(updateCreationSkill(character, 10000, generalTheory, 4, character), character.skills);
  const skills = updateCreationSkill(character, 10000, generalTheory, 5, character);
  const costs = creationSkillCosts({ ...character, skills }, character);
  assert.deepEqual(costs.skillJpByLevel[legacy], [101, 102, 103, 204]);
  const quote = trainingQuote(character, generalTheory, 0);
  assert.deepEqual(costs.skillJpByLevel[generalTheory], [0, 0, 0, 0, quote.cost]);
  assert.equal(quote.level, 5);
  assert.deepEqual(completeTraining({ level: 0, prices: [], training: quote }, generalTheory).prices, [0, 0, 0, 0, quote.cost]);
  assert.equal(skillPrerequisiteMessage(character.skills, "Mágiahasználat (szabad)", 4, character), "");
  assert.match(skillPrerequisiteMessage(character.skills, "Mágiahasználat (szabad)", 5, character), /Mágiaelmélet/);
});
