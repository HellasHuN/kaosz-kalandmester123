import assert from "node:assert/strict";
import test from "node:test";
import { creationSkillCosts, creationSkillLimit, savedCreationSkillTotal, updateCreationSkill } from "../src/alkotasiJartassagok.js";
import { attributes, statPoints } from "../src/karakterFoeertekek.js";
import { committedJp, skillRows, trainingQuote } from "../src/jartassagFejlesztes.js";
import { formRequirements, readMagic, recordAcquisition, spellReadiness } from "../src/magiaSzabalyok.js";

const priest = {
  race: "Ember", religion: "Ordinis", stats: [40, 50, 50, 80, 50],
  skills: { "Elhivatottság*": 1, Esszenciafelszabadítás: 10, "Mágiahasználat (szabad)": 2 },
};
const magic = readMagic({ magic: { activeEp: 20, patron: "Ordinis", sacredCodices: ["Smaragd"] } });
const spell = (id, amount) => ({ id, codex: "Smaragd", difficulty: 2, ep: { kind: "fixed", amount } });

test("reserved Ep is unavailable to free magic but usable by its own sacred spell", () => {
  const sacred = spell("prayer", 18);
  const acquired = recordAcquisition(priest, magic, sacred, "sacred", {});
  const conditions = { conditionsConfirmed: true };
  assert.equal(acquired.activeEp, 20);
  assert.equal(spellReadiness(priest, acquired, sacred, "sacred", conditions).state, "ready");
  assert.equal(spellReadiness(priest, acquired, spell("free", 9), "free", conditions).state, "blocked");
});

test("an unknown legacy skill price is not refundable in play or through creation", () => {
  const old = { race: "Ember", skills: { Lovaglás: 1 }, jp: 0 };
  assert.equal(skillRows(old).Lovaglás.level, 1);
  assert.equal(committedJp(skillRows(old)), 0);
  assert.equal(savedCreationSkillTotal(old), 0);
  assert.equal(creationSkillCosts(old, old).total, 0);
});

test("character creation requires specific KM approval for paid devotion", () => {
  const novice = { ...priest, skills: {} };
  const name = "Elhivatottság*";
  assert.deepEqual(updateCreationSkill(novice, 800, name, 2), {});
  assert.deepEqual(updateCreationSkill(novice, 799, name, 2, undefined, true), {});
  assert.deepEqual(updateCreationSkill(novice, 800, name, 2, undefined, true), { [name]: 2 });
  assert.equal(creationSkillCosts({ ...novice, skills: { [name]: 2 } }).skillJpPaid[name], 800);
  assert.equal(trainingQuote(novice, name, 0), null);
  assert.ok(formRequirements(novice, magic, "sacred").length);
});

test("base creation budget and gilf starting limits are protected", () => {
  assert.equal(statPoints(), 270);
  assert.equal(attributes.length, 5);
  const gilf = { ...priest, race: "Gilf" };
  assert.equal(creationSkillLimit(gilf, "Mágiahasználat (szabad)"), 4);
  assert.equal(creationSkillLimit(gilf, "Esszenciafelszabadítás"), 2);
});

test("malformed storage starts safely and is never overwritten by a later save", async () => {
  const { readCharacters, writeCharacters } = await import("../src/karakterMentes.js");
  for (const raw of ["invalid JSON", "null", "{}"]) {
    let stored = raw;
    const storage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
    assert.deepEqual(readCharacters(storage).characters, []);
    assert.equal(writeCharacters(storage, [], raw), false);
    assert.equal(stored, raw);
  }
});

test("mixed storage exposes only usable characters and preserves the original bytes", async () => {
  const { readCharacters, writeCharacters } = await import("../src/karakterMentes.js");
  const valid = { id: 1, name: "Régi", race: "Ember", age: "25", stats: [55, 55, 55, 55], skills: { Lovaglás: 1 } };
  const raw = JSON.stringify([valid, null, { ...valid, id: 2, magic: { acquisitions: [null] } }]);
  const storage = { getItem: () => raw, setItem: () => assert.fail("Original save overwritten") };
  assert.deepEqual(readCharacters(storage), { characters: [valid], raw, blocked: true });
  assert.equal(writeCharacters(storage, [valid], raw), false);
});

test("sacred spell cancellation does not add Ep and casting consumes Ep exactly once", async () => {
  const { availableMagicEp, finishSacredSpell } = await import("../src/magiaSzabalyok.js");
  const sacred = spell("prayer", 18);
  const conditions = { conditionsConfirmed: true };
  const acquired = recordAcquisition(priest, magic, sacred, "sacred", {});
  assert.equal(recordAcquisition(priest, acquired, spell("second", 3), "sacred", {}), acquired);
  assert.equal(availableMagicEp(priest, acquired), 2);
  assert.deepEqual(finishSacredSpell(priest, acquired, sacred, {}, false), magic);
  assert.equal(finishSacredSpell(priest, acquired, sacred, {}, true), acquired);

  const cast = finishSacredSpell(priest, acquired, sacred, conditions, true);
  assert.equal(cast.activeEp, 2);
  assert.equal(cast.acquisitions.length, 0);
  assert.equal(availableMagicEp(priest, cast), 2);
  assert.equal(finishSacredSpell(priest, cast, sacred, conditions, true), cast);
});

test("an indeterminate legacy reservation prevents spending without erasing the request", async () => {
  const { availableMagicEp, freeEnergyStatus } = await import("../src/magiaSzabalyok.js");
  const outdated = { ...magic, acquisitions: [{ spellId: "unknown", form: "sacred" }] };
  assert.equal(availableMagicEp(priest, outdated), null);
  assert.equal(freeEnergyStatus(priest, outdated, 1).state, "review");
  assert.equal(recordAcquisition(priest, outdated, spell("prayer", 18), "sacred", {}), outdated);
  assert.deepEqual(outdated.acquisitions, [{ spellId: "unknown", form: "sacred" }]);
});

test("an approved roleplay change in devotion preserves committed Jp", async () => {
  const { changeDevotionInPlay } = await import("../src/jartassagFejlesztes.js");
  const name = "Elhivatottság*";
  const [row] = Object.values(skillRows({
    skills: { [name]: 1 }, skillJpByLevel: { [name]: [400] },
  }));
  assert.equal(changeDevotionInPlay(priest, row, 2, false), row);
  assert.equal(changeDevotionInPlay({ skills: {} }, row, 2, true), row);
  const gained = changeDevotionInPlay(priest, row, 2, true);
  assert.deepEqual(gained.prices, [400, 0]);
  const lost = changeDevotionInPlay(priest, gained, 0, true);
  assert.equal(lost.level, 0);
  assert.equal(committedJp({ [name]: lost }), 400);
  assert.equal(committedJp({ [name]: changeDevotionInPlay(priest, lost, 1, true) }), 400);
});

test("a documented charge following an unknown rank survives reload and remains refundable", async () => {
  const { completeTraining, serializeSkills } = await import("../src/jartassagFejlesztes.js");
  const rows = skillRows({ skills: { Lovaglás: 1 }, skillJpPaid: { Lovaglás: 150 },
    skillJpByLevel: { Lovaglás: [150] }, estimatedSkillJp: ["Lovaglás"] });
  assert.deepEqual(rows.Lovaglás.prices, [null]);
  const completed = completeTraining({ ...rows.Lovaglás, training: { level: 2, cost: 220 } }, "Lovaglás");
  const [skills, skillJpPaid, skillJpByLevel, estimatedSkillJp] = serializeSkills({ Lovaglás: completed });
  assert.deepEqual(skillJpByLevel.Lovaglás, [null, 220]);
  const reloaded = skillRows({ skills, skillJpPaid, skillJpByLevel, estimatedSkillJp });
  assert.equal(committedJp(reloaded), 220);
  assert.equal(reloaded.Lovaglás.level, 2);
});

test("valid historical storage can be written, but a concurrently changed value cannot", async () => {
  const { readCharacters, writeCharacters } = await import("../src/karakterMentes.js");
  const character = { id: 1, name: "Régi", race: "Ember", stats: [55, 55, 55, 55], skills: { Lovaglás: 1 }, other: "retained" };
  let raw = JSON.stringify([character]);
  const storage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
  const original = readCharacters(storage, ["Ember"]);
  assert.equal(original.blocked, false);
  const next = { ...character, jp: 10 };
  assert.equal(writeCharacters(storage, [next], original.raw), true);
  assert.equal(writeCharacters(storage, [], original.raw), false);
  assert.deepEqual(readCharacters(storage).characters, [next]);
});

test("a KM can record the exact cost of an unresolved legacy request exactly once", async () => {
  const { approveLegacyReservation, availableMagicEp, finishSacredSpell, unresolvedSacredReservations } =
    await import("../src/magiaSzabalyok.js");
  const entry = { spellId: "legacy", form: "sacred", savedNote: "retain" };
  const original = { ...magic, acquisitions: [entry], freeEffects: [{ id: "historical" }] };
  assert.deepEqual(unresolvedSacredReservations(original), [entry]);
  assert.equal(finishSacredSpell(priest, original, { id: entry.spellId }, {}, false), original);
  assert.equal(approveLegacyReservation(original, entry, 8, false), original);
  assert.equal(approveLegacyReservation(original, entry, null, true), original);
  const approved = approveLegacyReservation(original, entry, 8, true);
  assert.deepEqual(approved.acquisitions, [{ ...entry, ep: 8, epApproved: true }]);
  assert.equal(approved.activeEp, 20);
  assert.equal(availableMagicEp(priest, approved), 12);
  assert.equal(approved.freeEffects, original.freeEffects);
  assert.deepEqual(unresolvedSacredReservations(approved), []);
  assert.equal(approveLegacyReservation(approved, approved.acquisitions[0], 8, true), approved);
});

test("an unrelated edit keeps the old price data without making it refundable", async () => {
  const { preserveUnchangedSkillCosts } = await import("../src/jpSzamitas.js");
  const original = { skills: { Lovaglás: 1 }, skillJpPaid: { Lovaglás: 150 },
    skillJpByLevel: { Lovaglás: [150] }, estimatedSkillJp: ["Lovaglás"] };
  const changes = preserveUnchangedSkillCosts(original, original.skills,
    { Lovaglás: 0 }, { Lovaglás: [null] }, ["Lovaglás"]);
  assert.deepEqual({ skills: original.skills, ...changes }, original);
  assert.equal(committedJp(skillRows({ ...original, ...changes })), 0);
});

test("a church package retains its original price and grants, without granting devotion", async () => {
  const { packageGrants, packageJp } = await import("../src/kepzesiCsomagok.js");
  const trainingPackages = { druid: { approved: true } };
  const grants = packageGrants(trainingPackages);
  assert.deepEqual(grants, { Természetismeret: 2, Állatismeret: 2 });
  assert.equal(packageJp(trainingPackages), 1000);
  assert.equal(creationSkillCosts({ race: "Ember", skills: grants, trainingPackages }).total, 1000);
});
