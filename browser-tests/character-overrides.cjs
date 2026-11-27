const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");

async function verify(page) {
  const character = {
    id: "override-fixture", name: "Próbaőr", race: "Ember", gender: "Férfi", age: 30, playStatus: "playing",
    stats: [55, 55, 55, 55, 50], statAllocationVersion: 1, currentFp: 40, jp: 6000,
    skills: { Mágiaelmélet: 3 },
    magic: { activeEp: 25, shield: 8 },
    equipment: { items: [{ id: "armor", catalogId: "mellvert", quantity: 1,
      values: { speedModifier: 3, armorLevel: 5, massKg: 4 } }] },
  };
  const errors = [];
  const reasons = [];
  let reason;
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => {
    if (dialog.type() !== "prompt") return dialog.accept();
    reasons.push(dialog.message());
    return reason == null ? dialog.dismiss() : dialog.accept(reason);
  });
  const button = name => page.getByRole("button", { name, exact: true });
  const click = name => button(name).click();
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0]);
  const number = name => page.getByRole("spinbutton", { name, exact: true });
  const exact = (field, before, after, log) => {
    assert.ok(log.some(entry => entry.field === field && entry.before === before && entry.after === after && entry.reason === reason), field);
  };
  await page.goto(process.env.PREVIEW_URL || "http://localhost:4173/");
  await page.evaluate(value => localStorage.setItem("kaosz-karakterek", JSON.stringify([value])), character);
  await page.reload();
  await click("Kalandmester");
  await click("Karakterlap megnyitása");
  await click("Szerkesztés");
  await number("Életkor").fill("0");
  await click("Véglegesítés");
  assert.equal((await saved()).age, 30);
  assert.equal(reasons.length, 0);
  await number("Életkor").fill("180");
  await click("Fizikum növelése");
  await number("Intuíció").fill("101");
  await number("Aktuális aktív Ep").fill("130");
  await click("Véglegesítés");
  assert.equal((await saved()).age, 30);
  reason = "A kaland eseménye";
  await click("Véglegesítés");
  let record = await saved();
  exact("Életkor", 30, 180, record.overrideLog);
  exact("Fizikum", 55, 56, record.overrideLog);
  exact("Aktív Ep", 25, 130, record.overrideLog);
  exact("Intuíció", 50, 101, record.overrideLog);
  assert.equal(reasons.length, 2);
  await click("Jártasságok");
  await click("Szerkesztés");
  await number("Mágiaelmélet szintje").fill("12");
  await click("Véglegesítés");
  record = await saved();
  exact("Mágiaelmélet", 3, 12, record.overrideLog);
  assert.equal(record.jp, 6000);
  await click("Felszerelés");
  await click("Szerkesztés");
  await page.getByRole("spinbutton", { name: /^Vértszint/ }).fill("20");
  await click("Véglegesítés");
  record = await saved();
  exact("Mellvért (fém) · Vértszint", 5, 20, record.overrideLog);
  await click("Mágia");
  await click("Szerkesztés");
  await page.getByRole("spinbutton", { name: /^Aktuális Esszenciapajzs/ }).fill("200");
  await click("Véglegesítés");
  record = await saved();
  exact("Esszenciapajzs", 8, 200, record.overrideLog);
  await page.reload();
  await click("Betöltés");
  await page.getByText(/KM-felülírások \(7\)/).click();
  assert.equal(await page.getByText(reason, { exact: false }).count(), 7);
  assert.equal((await saved()).skills.Mágiaelmélet, 12);
  await click("Felszerelés");
  await click("Szerkesztés");
  await page.getByLabel("Megjegyzések").fill("Változatlan KM-érték.");
  await click("Véglegesítés");
  assert.equal((await saved()).equipment.items[0].values.armorLevel, 20);
  assert.equal((await saved()).overrideLog.length, 7);
  assert.deepEqual(errors, []);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  try {
    for (const [width, height] of [[390, 844], [1440, 900]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: width === 390, hasTouch: width === 390 });
      page.setDefaultTimeout(10000);
      await verify(page);
      await page.close();
      console.log(`KM-felülírás, indoklás és visszatöltés PASS ${width}×${height}`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
