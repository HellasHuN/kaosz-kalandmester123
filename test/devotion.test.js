import assert from "node:assert/strict";
import test from "node:test";
import { devotionPrerequisiteMessage, firstInvalidSkillChange, skillPrerequisiteMessage } from "../src/jartassagElofeltetelek.js";
import { changeDevotionInPlay, committedJp, firstInvalidTrainingChange, serializeSkills, skillRows } from "../src/jartassagFejlesztes.js";
import { readCharacters, writeCharacters } from "../src/karakterMentes.js";
import { formRequirements, readMagic, spellAccess } from "../src/magiaSzabalyok.js";

const devotion = "Elhivatottság*";
const priest = {
  id: 1, name: "Pap", race: "Ember", religion: "Ordinis", playStatus: "playing", jp: 120,
  stats: [50, 50, 80, 40], skills: { [devotion]: 2, Áldozat: 2 },
  skillJpByLevel: { [devotion]: [400, 400], Áldozat: [200, 300] },
};
const afterLowering = { ...priest.skills, [devotion]: 1 };
const preserveDevotion = { retainAfterDevotionLoss: true };

test("KM devotion loss retains the acquired Áldozat rank in play", () => {
  assert.equal(firstInvalidSkillChange(afterLowering, priest.skills, priest, priest, {}, preserveDevotion), "");
  assert.match(firstInvalidSkillChange(afterLowering, priest.skills, priest), /Áldozat/);
});

test("new skills and higher ranks still require sufficient devotion", () => {
  const skills = { ...afterLowering, Áldozat: 3 };
  assert.match(firstInvalidSkillChange(skills, priest.skills, priest, priest, {}, preserveDevotion), /Áldozat/);
  const novice = { ...priest, skills: { [devotion]: 2 } };
  assert.match(firstInvalidSkillChange(afterLowering, novice.skills, novice, novice, {}, preserveDevotion), /Áldozat/);
  assert.match(skillPrerequisiteMessage(afterLowering, "Áldozat", 3, priest), /Elhivatottság/);
});

test("devotion loss cannot mask the removal of an unrelated prerequisite", () => {
  const original = { ...priest, skills: { ...priest.skills, Alkímia: 2, "Varázsszer-készítés": 2 } };
  const skills = { ...original.skills, [devotion]: 1, Alkímia: 1 };
  assert.match(firstInvalidSkillChange(skills, original.skills, original, original, {}, preserveDevotion), /Alkímia/);
});

test("pending training remains recorded, while new or completed training checks the current rank", () => {
  const record = { level: 2, cost: 300, method: "mentor" };
  const trainee = { ...priest, skills: { [devotion]: 2, Áldozat: 1 }, skillTraining: { Áldozat: record } };
  const skills = { ...trainee.skills, [devotion]: 1 };
  assert.equal(firstInvalidTrainingChange(trainee.skillTraining, skills, trainee, trainee), "");
  assert.match(firstInvalidTrainingChange(trainee.skillTraining, skills, trainee, { ...trainee, skillTraining: {} }), /Elhivatottság/);
  assert.match(skillPrerequisiteMessage(skills, "Áldozat", record.level, trainee), /Elhivatottság/);
  assert.equal(skillPrerequisiteMessage(trainee.skills, "Áldozat", record.level, trainee), "");
  assert.match(firstInvalidTrainingChange({ Áldozat: { ...record, cost: 200 } }, skills, trainee, trainee), /Elhivatottság/);
});

test("KM approval is required, Jp stays unchanged and the original four-stat save round-trips", () => {
  const rows = skillRows(priest);
  assert.equal(changeDevotionInPlay(priest, rows[devotion], 1, false), rows[devotion]);
  const nextRows = { ...rows, [devotion]: changeDevotionInPlay(priest, rows[devotion], 1, true) };
  const [skills, skillJpPaid, skillJpByLevel, estimatedSkillJp, , , , skillSunkJp] = serializeSkills(nextRows);
  const jp = priest.jp + committedJp(rows) - committedJp(nextRows);
  assert.equal(jp, priest.jp);
  let raw = JSON.stringify([priest]);
  const storage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
  const updated = { ...priest, skills, jp, skillJpPaid, skillJpByLevel, estimatedSkillJp, skillSunkJp };
  assert.equal(writeCharacters(storage, [updated], raw), true);
  const loaded = readCharacters(storage, ["Ember"]).characters[0];
  assert.deepEqual(loaded.skills, afterLowering);
  assert.deepEqual(loaded.stats, priest.stats);
  assert.equal(loaded.jp, priest.jp);
  assert.equal(committedJp(skillRows(loaded)), committedJp(rows));
});

test("dependent skills show a KM decision only when devotion contributes to their missing prerequisites", () => {
  for (const name of ["Áldozat", "Aszkézis", "Zónérzékelés", "Varázsszer-készítés"]) {
    const original = { ...priest, skills: { ...priest.skills, Alkímia: 2, [name]: 2 } };
    const skills = { ...original.skills, [devotion]: 1 };
    assert.equal(firstInvalidSkillChange(skills, original.skills, original, original, {}, preserveDevotion), "", name);
    assert.match(devotionPrerequisiteMessage(skills, name, 2, original), /KM/, name);
  }
  assert.equal(devotionPrerequisiteMessage({ ...afterLowering, "Mágiahasználat (akadémikus)": 2 }, "Aszkézis", 2, priest), "");
});

test("sacred magic keeps its existing requirements after devotion changes", () => {
  const magic = readMagic({ magic: { patron: "Ordinis", sacredCodices: ["Smaragd"] } });
  const spell = { id: "test", codex: "Smaragd", difficulty: 2 };
  assert.equal(spellAccess({ ...priest, skills: afterLowering }, magic, spell, "sacred").allowed, true);
  assert.match(formRequirements({ ...priest, skills: { ...afterLowering, [devotion]: 0 } }, magic, "sacred").join(), /Elhivatottság/);
});
