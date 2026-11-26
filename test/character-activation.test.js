import assert from "node:assert/strict";
import test from "node:test";
import { persistCharacterStatus, readCharacters } from "../src/karakterMentes.js";

const draft = { id: 1, name: "Tervezet", playStatus: "draft", custom: { kept: true } };
const legacy = { id: "legacy", name: "Régi mentés", stats: [55, 55, 55, 55] };
const active = { id: 3, name: "Aktív", playStatus: "playing" };
const characters = [draft, legacy, active];

function storageFor(initial = characters) {
  let raw = JSON.stringify(initial);
  return { getItem: () => raw, setItem: (_, value) => { raw = value; } };
}

test("draft activation persists immediately and changes only that character's status", () => {
  const storage = storageFor();
  const saved = persistCharacterStatus(storage, characters, storage.getItem(), 1, "playing");
  assert.deepEqual(saved, [{ ...draft, playStatus: "playing" }, legacy, active]);
  assert.deepEqual(readCharacters(storage).characters, saved);
  assert.equal(draft.playStatus, "draft");
});

test("legacy classification is explicit and an active character cannot become a draft", () => {
  const storage = storageFor();
  assert.equal(persistCharacterStatus(storage, characters, storage.getItem(), 3, "draft"), null);
  assert.equal(persistCharacterStatus(storage, characters, storage.getItem(), 99, "playing"), null);
  const updated = persistCharacterStatus(storage, characters, storage.getItem(), "legacy", "draft");
  assert.deepEqual(updated, [draft, { ...legacy, playStatus: "draft" }, active]);
  assert.deepEqual(persistCharacterStatus(storage, updated, storage.getItem(), "legacy", "playing")[1],
    { ...legacy, playStatus: "playing" });
});

test("activation reports storage failure without overwriting concurrent or damaged saves", () => {
  const storage = storageFor();
  const previous = storage.getItem();
  storage.setItem("", JSON.stringify([...characters, { id: 4, name: "Másik ablak" }]));
  const concurrent = storage.getItem();
  assert.equal(persistCharacterStatus(storage, characters, previous, 1, "playing"), null);
  assert.equal(storage.getItem(), concurrent);
  storage.setItem("", "{invalid");
  assert.equal(persistCharacterStatus(storage, characters, "{invalid", 1, "playing"), null);
  assert.equal(storage.getItem(), "{invalid");
  assert.equal(persistCharacterStatus({ getItem: () => previous, setItem() { throw new Error("quota"); } },
    characters, previous, 1, "playing"), null);
});
