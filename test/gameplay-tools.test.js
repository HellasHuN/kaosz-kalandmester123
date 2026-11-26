import assert from "node:assert/strict";
import test from "node:test";
import * as segments from "../src/teszt/segments.js";

test("initiative adds personal speed, action time and d6 to the prior segment", () => {
  assert.equal(segments.calculateSegment({ previous: 0, speed: 7, action: 4, roll: 3 }), 14);
  assert.equal(segments.calculateSegment({ previous: 14, speed: 7, action: 0, roll: 6 }), 27);
  assert.equal(segments.calculateSegment({ previous: 14, speed: 7, action: 4, roll: 7 }), null);
});

test("Zafír trials include the untrained row and respect difficulty limits", async () => {
  const { skillTarget, percentileResult, investigationContest } = await import("../src/teszt/trials.js");
  assert.equal(skillTarget(0, 4), 5);
  assert.equal(skillTarget(3, 4), 75);
  assert.equal(skillTarget(3, 11), null);
  assert.equal(percentileResult(75, 75), "success");
  assert.equal(percentileResult(75, 76), "failure");
  assert.equal(percentileResult(115, 100, { attribute: true }), "follow-up");
  assert.equal(percentileResult(115, 100, { attribute: true, followUp: 15 }), "success");
  assert.equal(investigationContest("success", "success"), "narrator");
  assert.equal(investigationContest("success", "failure"), "discovered");
});

test("NPC drafts have role-appropriate ranks, editable values and no general character level", async () => {
  const { generateNpc } = await import("../src/teszt/npcDraft.js");
  const draft = generateNpc({ id: "one", type: "Ember", role: "Felderítő", strength: 5, habitat: "erdő" }, () => 0);
  assert.match(draft.skills, /Nyomolvasás: 5/);
  assert.match(draft.skills, /Lopakodás: 3/);
  assert.match(draft.combat, /Védekezés: 3/);
  assert.equal("level" in draft, false);
});

test("general theory reads the highest previously paid theory without changing stored ranks", async () => {
  const { academicTheoryRank } = await import("../src/teszt/academic.js");
  const skills = { "Mágiaelmélet (Smaragd kódex)": 3, "Mágiaelmélet (Azúr kódex)": 2 };
  const before = structuredClone(skills);
  assert.equal(academicTheoryRank(skills), 3);
  assert.deepEqual(skills, before);
});

test("academic benefits apply only to acquired spells and off-branch permissions are specific", async () => {
  const { academicAccess } = await import("../src/teszt/academic.js");
  const selected = { academicSpecialization: { codex: "Smaragd", branch: "tűz" }, acquisitions: [] };
  const own = { id: "own", type: "tűz", codex: "Smaragd" };
  const other = { id: "other", type: "jég", codex: "Azúr" };
  assert.deepEqual(academicAccess(selected, own), { allowed: true, bonus: 0, componentFree: false });
  assert.equal(academicAccess(selected, other).allowed, false);
  const learned = { ...selected, acquisitions: [{ form: "academic", spellId: own.id }] };
  assert.deepEqual(academicAccess(learned, own), { allowed: true, bonus: 20, componentFree: true });
  assert.equal(academicAccess({ ...selected, academicExceptions: { other: { allowed: true } } }, other).allowed, true);
});

test("house-rule practical scroll access tracks the actual inventory and needs no acquisition", async () => {
  const { readMagic, spellAccess } = await import("../src/magiaSzabalyok.js");
  const { scrollId } = await import("../src/teszt/scrolls.js");
  const spell = { id: "rough", codex: "Praktikus mágia" };
  const magic = readMagic({});
  const result = spellAccess({ equipment: { items: [{ catalogId: scrollId(spell), quantity: 1 }] } }, magic, spell, "practical");
  assert.equal(result.fromScroll, true);
  assert.equal(result.needsAcquisition, false);
  assert.equal(spellAccess({}, magic, spell, "practical").needsAcquisition, true);
});

test("Vakharc caps attack and defense separately at the trained rank", async () => {
  const { blindCombatAttribute, blindCombatRanks } = await import("../src/teszt/blindCombat.js");
  assert.deepEqual(blindCombatRanks({ attack: 5, defense: 3 }, 4), { attack: 4, defense: 3 });
  assert.equal(blindCombatAttribute(5), "Érzékszerv");
  assert.equal(blindCombatAttribute(6), "Intuíció");
});

test("proposed perception ranges cover all supported races and contain their recommendations", async () => {
  const { perceptionLimits } = await import("../src/karakterFoeertekek.js");
  const { speedByRace } = await import("../src/gyorsasag.js");
  assert.deepEqual(Object.keys(perceptionLimits).sort(), Object.keys(speedByRace).sort());
  for (const { range: [min, max], suggested, note } of Object.values(perceptionLimits)) {
    assert.ok(0 <= min && min <= suggested && suggested <= max && max <= 100);
    assert.ok(note.trim());
  }
});

test("academic successful cast debits only free Ep and an attempt cannot be recorded twice", async () => {
  const { logAcademicCasting, undoSacredCasting } = await import("../src/teszt/sacredCasting.js");
  const { readMagic } = await import("../src/magiaSzabalyok.js");
  const character = { stats: [50, 50, 50, 60, 60], skills: { "Mágiaelmélet": 3,
    "Mágiahasználat (akadémikus)": 3, Esszenciafelszabadítás: 5 } };
  const spell = { id: "academic", name: "Próba", codex: "Smaragd", difficulty: 2, ep: { kind: "perUnit", amount: 5 } };
  const magic = readMagic({ magic: { activeEp: 20, acquisitions: [
    { form: "academic", spellId: "academic" }, { form: "sacred", spellId: "other", ep: 10 },
  ] } });
  const operation = { id: "attempt", recordedAt: "2026-11-25T20:00:00Z", roll: 5 };
  assert.equal(logAcademicCasting(character, magic, spell, { units: 3, conditionsConfirmed: true }, operation), magic);
  assert.equal(logAcademicCasting(character, magic, spell, { units: 2 }, operation), magic);
  const context = { units: 2, conditionsConfirmed: true };
  const cast = logAcademicCasting(character, magic, spell, context, operation);
  assert.equal(cast.activeEp, 10);
  assert.deepEqual(cast.acquisitions, magic.acquisitions);
  assert.equal(logAcademicCasting(character, cast, spell, context, operation), cast);
  assert.deepEqual(undoSacredCasting(cast), { ...magic, castingLog: [] });
});

test("manual percentile dice accept the 00 face without treating empty or invalid input as a roll", async () => {
  const { readPercentileRoll } = await import("../src/teszt/dice.js");
  assert.equal(readPercentileRoll("00"), 100);
  assert.equal(readPercentileRoll("100"), 100);
  assert.equal(readPercentileRoll("07"), 7);
  for (const value of ["", "0", "101", "5.5", "1e2", null]) {
    assert.ok(Number.isNaN(readPercentileRoll(value)));
  }
});

test("academic critical failure records the KM consequence and only the approved Ep loss", async () => {
  const { logAcademicFailure, undoSacredCasting } = await import("../src/teszt/sacredCasting.js");
  const { readMagic } = await import("../src/magiaSzabalyok.js");
  const character = { stats: [50, 50, 50, 60, 60], skills: { Mágiaelmélet: 3,
    "Mágiahasználat (akadémikus)": 3, Esszenciafelszabadítás: 5 } };
  const spell = { id: "academic", name: "Próba", codex: "Smaragd", difficulty: 2, ep: { kind: "fixed", amount: 6 } };
  const magic = readMagic({ magic: { activeEp: 20, acquisitions: [
    { form: "academic", spellId: "academic" }, { form: "sacred", spellId: "other", ep: 10 },
  ] } });
  const operation = { id: "failure", recordedAt: "2026-11-26T05:00:00Z", roll: 100, epLoss: 4, consequence: "A fény kialszik." };
  const context = { conditionsConfirmed: true };
  assert.equal(logAcademicFailure(character, magic, spell, context, { ...operation, epLoss: 11 }), magic);
  assert.equal(logAcademicFailure(character, magic, spell, context, { ...operation, roll: 1 }), magic);
  const cast = logAcademicFailure(character, magic, spell, context, operation);
  assert.equal(cast.activeEp, 16);
  assert.deepEqual(cast.acquisitions, magic.acquisitions);
  assert.match(cast.castingLog[0].outcome, /katasztrofális rontás/);
  assert.equal(cast.castingLog[0].consequence, operation.consequence);
  assert.equal(logAcademicFailure(character, cast, spell, context, operation), cast);
  assert.deepEqual(undoSacredCasting(cast), { ...magic, castingLog: [] });
});
