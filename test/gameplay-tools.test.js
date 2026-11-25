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
