import test from "node:test";
import assert from "node:assert/strict";
import { BookOpen, Droplets, Flame, Sparkles } from "lucide-react";
import { getCodexIcon } from "../src/codexIcons.js";
import { academicBranchesFor, validAcademicSpecialization } from "../src/teszt/academic.js";
import { codices, spells } from "../src/varazslatAdatok.js";
import { readCharacters, writeCharacters } from "../src/karakterMentes.js";
import { creationSkillCosts, creationSkillLimit, invalidCreationSkill, quoteCreationSkill, updateCreationSkill } from "../src/alkotasiJartassagok.js";
import { startingApprovalContext } from "../src/induloJartassagEngedelyek.js";
import { completeTraining, serializeSkills, skillRows, trainingQuote } from "../src/jartassagFejlesztes.js";
import { skillPrices } from "../src/jpSzamitas.js";

test("each real codex has its own icon; Azúr remains water-themed", () => {
  for (const id of ["vizaura", "vizpermet", "vizteremtes"]) {
    assert.equal(getCodexIcon(spells.find(spell => spell.id === `official:${id}`).codex), Droplets);
  }
  assert.equal(getCodexIcon("Skarlát"), Flame);
  assert.equal(getCodexIcon("Kódexfüggetlen"), Sparkles);
  assert.equal(getCodexIcon("toString"), BookOpen);
  assert.equal(new Set(codices.map(getCodexIcon)).size, codices.length);
});

test("specialization options reflect the catalog and a valid choice survives storage", () => {
  const academicSpecialization = { codex: "Azúr", branch: "speciális" };
  assert.ok(academicBranchesFor("Azúr").includes(academicSpecialization.branch));
  assert.ok(validAcademicSpecialization(academicSpecialization));
  assert.ok(validAcademicSpecialization(null));
  assert.equal(validAcademicSpecialization({ codex: "Azúr", branch: "időmágia" }), false);
  assert.equal(validAcademicSpecialization({ codex: "Kódexfüggetlen", branch: "speciális" }), false);
  let raw = null;
  const storage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
  const characters = [{ id: 1, name: "Mágus", magic: { academicSpecialization } }];
  assert.equal(writeCharacters(storage, characters, null), true);
  assert.deepEqual(readCharacters(storage).characters, characters);
});

test("ordinary creation permits rank ten regardless of race, age and old approvals", () => {
  const name = "Nyomolvasás";
  const elf = { race: "Elf", age: 60, creationStage: "adultus", stats: [65, 65, 65, 65, 65], skills: { [name]: 3 } };
  const approved = { ...elf, creationStage: "senius", startingSkillApprovals: { exceptions: { [name]: {
    approved: true, source: "individual", reason: "Egyedi engedély", level: 5, context: startingApprovalContext(elf),
  } } } };
  for (const character of [elf, { ...elf, race: "Ember" }, approved]) {
    assert.equal(creationSkillLimit(character, name), 10);
    assert.equal(updateCreationSkill(character, 50000, name, 10)[name], 10);
    assert.equal(updateCreationSkill(character, 0, name, 10), character.skills);
    assert.equal(updateCreationSkill(character, 50000, name, 11), character.skills);
  }
});

test("creation quotes price a pending skill without changing skills or historical payments", () => {
  const character = {
    race: "Ember", stats: [65, 65, 65, 65, 65],
    skills: { Esés: 2, Ugrás: 2, Zsonglőrködés: 2, "Elhivatottság*": 1 },
    skillJpByLevel: { Esés: [111, 111], "Elhivatottság*": [400] },
    skillJpPaid: { Esés: 222, "Elhivatottság*": 400 },
  };
  const before = structuredClone(character);
  const budget = 50000;
  const name = "Akrobatika";
  const quoted = quoteCreationSkill(character, budget, name, 2, character);
  assert.ok(quoted.cost > 0);
  assert.deepEqual(character, before);
  assert.equal(quoted.skills[name], 2);
  assert.match(quoteCreationSkill(character, budget, name, 3, character).error, /előfeltétele/);
  const acquired = { ...character, skills: quoted.skills };
  assert.equal(invalidCreationSkill(acquired, character, {}), undefined);
  const removed = updateCreationSkill(acquired, budget, name, 0, character);
  assert.deepEqual(removed, character.skills);
  assert.deepEqual(creationSkillCosts({ ...character, skills: removed }, character),
    creationSkillCosts(character, character));
});

test("training advances sequentially from rank 3 to the pricing table maximum", () => {
  const name = "Nyomolvasás";
  const character = { race: "Ember", stats: [65, 65, 65, 65, 65], skills: { [name]: 3 } };
  let row = skillRows(character)[name];
  const maximum = skillPrices(name).length;
  while (row.level < maximum) {
    const quote = trainingQuote(character, name, row.level);
    assert.equal(quote.level, row.level + 1);
    assert.ok(quote.cost > 0);
    assert.ok(quote.mentorLevel >= 7);
    row = completeTraining({ ...row, training: quote }, name);
    const [skills, , skillJpByLevel] = serializeSkills({ [name]: row });
    assert.equal(skills[name], quote.level);
    assert.equal(skillJpByLevel[name].at(-1), quote.cost);
  }
  assert.equal(trainingQuote(character, name, maximum), null);
});
