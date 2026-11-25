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
