import assert from "node:assert/strict";
import test from "node:test";
import { addTrainingPackage, packageGrants, packageJp, removeTrainingPackage, trainingPackages } from "../src/kepzesiCsomagok.js";

const character = { race: "Ember", gender: "Nő" };
const alabard = "Fegyverforgatás – Alabárd";
const angolnanyars = "Fegyverforgatás – Angolnanyárs";
const theory = "Mágiaelmélet (Alabástrom kódex)";
const packages = {
  yennon: [1200, [], { Meggyőzés: 2 }],
  druid: [1000, [], { Természetismeret: 2 }],
  yvorl: [1000, [], { Diabolika: 2 }],
  maldib: [1000, [], { Rejtőzés: 3 }],
  wanderers: [500, [], {}],
  arena: [7000, [alabard, angolnanyars, "Fegyverhajítás – Acélkereszt"], { [alabard + " · támadás"]: 4, [angolnanyars + " · védekezés"]: 2 }],
  magnoliaOld: [7000, [theory, "Művészet – Szobrászat"], { [theory]: 3, "Művészet – Szobrászat": 4 }],
  magnoliaNew: [7000, [theory, "Fegyverforgatás – Tőr"], { "Fegyverforgatás – Tőr · védekezés": 3 }],
  magnoliaKnight: [7000, [alabard, angolnanyars, alabard, angolnanyars], { Lovaglás: 5, "Visszatámadás – Alabárd": 3 }],
  liathar: [3000, [], { Jelbeszéd: 3 }],
  heraldKnight: [5000, [alabard, angolnanyars, "Íjászat – Hosszú íj", alabard], { Lovaglás: 3 }],
  heraldAdept: [5000, [theory], { [theory]: 2, "Érzelmi kontroll": 5 }],
};

test("the catalog contains the twelve supported packages", () => {
  assert.deepEqual(Object.keys(trainingPackages).sort(), Object.keys(packages).sort());
});

for (const [id, [price, choices, expectedGrants]] of Object.entries(packages)) {
  test(`${id}: requires approval and sufficient Jp, charges once and grants selected skills`, () => {
    assert.match(addTrainingPackage(character, id, { choices }, {}, {}, price).error, /jóvá/);
    const record = { choices, approved: true };
    assert.match(addTrainingPackage(character, id, record, {}, {}, price - 1).error, /Jp/);
    const result = addTrainingPackage(character, id, record, {}, {}, price);
    assert.equal(result.error, undefined);
    assert.equal(result.packages[id].paidJp, price);
    assert.equal(packageJp(result.packages), price);
    const grants = packageGrants(result.packages);
    for (const [skill, rank] of Object.entries(expectedGrants)) assert.equal(grants[skill], rank, skill);
    assert.equal(grants["Elhivatottság*"], undefined);
    if (id === "wanderers") assert.deepEqual(grants, {});
  });
}

test("competing Yvorl affiliations cannot be stacked", () => {
  const enrolled = { ...character, trainingPackages: { yvorl: { approved: true } } };
  assert.match(addTrainingPackage(enrolled, "maldib", { approved: true, overlapApproved: true }, {}, {}, 1000).error, /ütközik/);
});

test("a package with separately purchased ranks built on its grants cannot be removed", () => {
  const chosen = { druid: { approved: true } };
  assert.match(removeTrainingPackage(chosen, "druid", { Természetismeret: 3 }).error, /fejlesztést/);
  assert.deepEqual(removeTrainingPackage(chosen, "druid", {}).packages, {});
});
