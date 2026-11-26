import test from "node:test";
import assert from "node:assert/strict";
import { BookOpen, Droplets, Flame, Sparkles } from "lucide-react";
import { getCodexIcon } from "../src/codexIcons.js";
import { academicBranchesFor, validAcademicSpecialization } from "../src/teszt/academic.js";
import { codices, spells } from "../src/varazslatAdatok.js";
import { readCharacters, writeCharacters } from "../src/karakterMentes.js";
import { creationSkillLimit, updateCreationSkill } from "../src/alkotasiJartassagok.js";
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

test("ordinary starting caps still apply and age, race, or approved exceptions raise them", () => {
  const name = "Nyomolvasás";
  const elf = { race: "Elf", age: 60, creationStage: "adultus", stats: [65, 65, 65, 65, 65], skills: { [name]: 3 } };
  assert.equal(creationSkillLimit(elf, name), 3);
  assert.equal(updateCreationSkill(elf, 50000, name, 4), elf.skills);
  assert.equal(creationSkillLimit({ ...elf, race: "Ember" }, name), 4);
  assert.equal(creationSkillLimit({ ...elf, creationStage: "senius" }, name), 6);
  const approved = { ...elf, startingSkillApprovals: { exceptions: { [name]: {
    approved: true, source: "individual", reason: "Egyedi engedély", level: 5, context: startingApprovalContext(elf),
  } } } };
  assert.equal(creationSkillLimit(approved, name), 5);
  assert.equal(updateCreationSkill(approved, 50000, name, 5)[name], 5);
  assert.equal(updateCreationSkill(approved, 50000, name, 6), elf.skills);
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
