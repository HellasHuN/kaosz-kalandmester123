import assert from "node:assert/strict";
import test from "node:test";
import { azureSpells } from "../src/varazslatAdatok.js";
import { spellCost } from "../src/magiaSzabalyok.js";

const spell = id => azureSpells.find(item => item.id === `official:${id}`);
const cost = (id, context) => spellCost(spell(id), "academic", context).ep;

test("the Azúr catalog preserves the book sequence within every page", () => {
  assert.deepEqual(azureSpells.map(({ id }) => id.slice(9)), [
    "vizkozpont", "vizpermet", "vizfakasztas", "vizteremtes", "viztisztitas", "vizsugar",
    "oltalom-hidegtol-melegtol", "vizfagyasztas-olvasztas", "varazskulacs", "savfelho",
    "vizen-jaras", "esoidezes", "felhoidezes", "vizlegzes", "jegnyil", "jegdarda",
    "beszelo-vizek", "vizaura", "jegfal", "jegborton", "viztol-vedo-varazs",
    "dermesztes", "szokoar", "viztaszitas", "jegvihar", "orveny", "szarazsag", "hutes",
    "fagyasztas", "ostest-viz", "vizgat", "vizkopo", "arasztas", "jeghid",
  ]);
  assert.ok(azureSpells.every(({ codex, page }) => codex === "Azúr" && page >= 191 && page <= 196));
});

test("verified water costs respect duration, Ep steps and target bounds", () => {
  assert.equal(cost("vizpermet", {}), 1);
  assert.equal(cost("vizlegzes", { units: 3 }), 30);
  assert.equal(cost("dermesztes", { units: 3 }), 54);
  assert.equal(cost("dermesztes", { units: 4 }), null);
  assert.equal(cost("vizfagyasztas-olvasztas", { approvedEp: 15 }), 15);
  assert.equal(cost("vizfagyasztas-olvasztas", { approvedEp: 12 }), null);
  assert.equal(spellCost(spell("varazskulacs"), "academic", { units: 2 }).difficulty, null);
  assert.equal(cost("vizgat", { approvedEp: 20 }), 20);
  assert.equal(cost("vizgat", { approvedEp: 19 }), null);
  assert.equal(cost("esoidezes", { approvedEp: 6 }), 6);
  assert.equal(cost("esoidezes", { approvedEp: 50 }), 50);
  assert.equal(cost("esoidezes", { approvedEp: 20 }), null);
});

test("all 34 Azúr entries have distinct WebP artwork", async () => {
  const { readFile } = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  const hashes = await Promise.all(azureSpells.map(async ({ id }) => {
    const art = await readFile(new URL(`../public/magic-azure/${id.slice(9)}.webp`, import.meta.url));
    assert.equal(art.toString("ascii", 8, 12), "WEBP");
    return createHash("sha256").update(art).digest("hex");
  }));
  assert.equal(new Set(hashes).size, 34);
});
