import assert from "node:assert/strict";
import test from "node:test";
import { planCharacterImport } from "../src/karakterMentes.js";

const original = { id: 1, name: "Régi", race: "Ember", stats: [55, 55, 55, 55] };

test("JSON import preserves existing characters and imports only new identifiers", () => {
  const newCharacter = { ...original, id: 2, name: "Új", custom: "Megőrzendő" };
  const result = planCharacterImport(JSON.stringify([{ ...original, name: "Ütközés" }, newCharacter]), [original], ["Ember"]);
  assert.deepEqual(result, { characters: [original, newCharacter], added: 1, conflicts: 1 });
});

test("one invalid entry prevents a partial import", () => {
  assert.ok(planCharacterImport(JSON.stringify([original, null]), [], ["Ember"]).error);
});

test("local test messages are scoped to the recipient and survive a reload", async () => {
  const { addMessage, conversationFor, readAdventure, writeAdventure } = await import("../src/teszt/localAdventure.js");
  let raw = null;
  const storage = { getItem: () => raw, setItem: (_, value) => { raw = value; } };
  const empty = readAdventure(storage);
  const time = "2026-11-25T19:00:00Z";
  const sent = addMessage(empty, "one", "km", "  Halk nesz.  ", time);
  const reply = addMessage(sent, "one", "player", "Körülnézek.", time);
  assert.equal(writeAdventure(storage, reply), true);
  assert.deepEqual(conversationFor(readAdventure(storage), "one").map(({ text }) => text), ["Halk nesz.", "Körülnézek."]);
  assert.deepEqual(conversationFor(readAdventure(storage), "two"), []);
  assert.equal(addMessage(reply, "one", "player", " ", time), reply);
});

test("perception is allocated from the unified 270 point budget", async () => {
  const { allocateStartingStats, perceptionLimits, statLimits } = await import("../src/karakterFoeertekek.js");
  const limits = statLimits([[20, 70], [50, 90], [55, 90], [30, 85]], 100, perceptionLimits.Elf.range);
  const stats = allocateStartingStats(limits, 270, perceptionLimits.Elf.suggested);
  assert.equal(stats.reduce((sum, n) => sum + n, 0), 270);
  assert.equal(stats[4], 60);
  assert.ok(stats.every((n, i) => n >= limits[i][0] && n <= limits[i][1]));
});

test("the house-rule search skill uses active perception and its proposed Jp schedule", async () => {
  const { levelCost, skillPrices, skillRequirement } = await import("../src/jpSzamitas.js");
  assert.deepEqual(skillPrices("Információgyűjtés"), skillPrices("Álcázás"));
  assert.deepEqual(skillRequirement("Információgyűjtés"), ["Érzékszerv", 40, 50, 60, 70]);
  const character = { stats: [50, 50, 50, 50, 40], adjustments: [0, 0, 0, 0, -8] };
  assert.equal(levelCost(character, "Információgyűjtés", 1), 115);
});

test("segment timeline is ordered, keeps ties and hides unrevealed opponents", async () => {
  const { addSegment, segmentEntries, segmentGroups } = await import("../src/teszt/segments.js");
  const entries = [
    { id: "team", name: "Csapattárs", segment: 17, visible: true },
    { id: "npc", name: "Ellenfél", segment: 2, visible: false },
    { id: "own", name: "Saját", segment: 17, visible: true },
  ];
  assert.deepEqual(segmentEntries(entries, "km").map(entry => entry.id), ["npc", "team", "own"]);
  assert.deepEqual([...segmentGroups(segmentEntries(entries, "player")).keys()], [17]);
  assert.equal(segmentGroups(segmentEntries(entries, "player")).get(17).length, 2);
  assert.equal(addSegment(entries, { id: "new", name: "Hibás", segment: 0 }), entries);
});

test("the elf nature selector offers explicit relevant skills rather than the whole catalog", async () => {
  const { suggestedElfNatureSkills } = await import("../src/fajiSzakosodasok.js");
  assert.ok(suggestedElfNatureSkills.includes("Nyomolvasás"));
  assert.ok(!suggestedElfNatureSkills.includes("Mágiahasználat (akadémikus)"));
});

test("message unread counters are independent for each role and recipient", async () => {
  const { addMessage, markConversationRead, unreadMessages } = await import("../src/teszt/localAdventure.js");
  const initial = { messages: [], notes: "" };
  const time = "2026-11-25T19:00:00Z";
  const sent = addMessage(initial, "one", "km", "Üzenet", time);
  assert.equal(unreadMessages(sent, "one", "km"), 0);
  assert.equal(unreadMessages(sent, "one", "player"), 1);
  assert.equal(unreadMessages(sent, "two", "player"), 0);
  const read = markConversationRead(sent, "one", "player");
  assert.equal(unreadMessages(read, "one", "player"), 0);
  const reply = addMessage(read, "one", "player", "Válasz", time);
  assert.equal(unreadMessages(reply, "one", "km"), 1);
});
