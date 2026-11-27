// Run against npm run preview with playwright-core and Chromium installed.
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright-core");

const fixture = {
  id: "armor-preview", name: "Déri Áron", race: "Ember", gender: "Férfi", age: 31,
  playStatus: "playing", stats: [57, 58, 51, 54, 50], currentFp: 42,
  equipment: { items: { "jidori-csillag": 2 }, notes: "Régi mentésből." },
};

async function verify(page, width) {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  let accept = false;
  page.on("dialog", dialog => dialog[accept ? "accept" : "dismiss"]());
  const button = name => page.getByRole("button", { name, exact: true });
  const sheet = page.locator(".equipment-sheet");
  const row = name => sheet.getByRole("row").filter({ has: page.getByRole("rowheader", { name, exact: true }) });
  const chest = sheet.locator(".armor-label").filter({ hasText: "Mellkas" });
  const speed = () => sheet.locator('output[aria-label="Aktuális gyorsaság"]').textContent();
  const search = sheet.getByRole("searchbox", { name: "Keresés a felszerelésben" });
  const catalog = sheet.getByRole("searchbox", { name: "Új tárgy keresése név vagy típus alapján" });
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0]);
  const fit = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  async function open() {
    await button("Betöltés").click();
    await button("Felszerelés").click();
    await sheet.waitFor();
  }

  await page.goto(process.env.PREVIEW_URL || "http://localhost:4173/");
  await page.evaluate(record => localStorage.setItem("kaosz-karakterek", JSON.stringify([record])), fixture);
  await page.reload();
  await open();
  assert.deepEqual(await read(), fixture);
  assert.equal(await catalog.count(), 0);
  await row("Jidori csillag").getByText("2", { exact: true }).waitFor();
  await sheet.getByText(fixture.equipment.notes, { exact: true }).waitFor();
  assert.equal(await chest.locator("strong").textContent(), "0");
  const initialSpeed = await speed();
  await search.fill("ismeretlen tárgy");
  await sheet.getByText("Nincs találat.").waitFor();
  await search.fill("fegyver");
  await row("Jidori csillag").waitFor();
  await search.fill("");
  await button("Szerkesztés").click();
  await catalog.fill("mellvért");
  await button("Mellvért (fém) hozzáadása").click();
  const armor = row("Mellvért (fém)").filter({ has: page.getByLabel("Mellvért (fém) darabszáma") });
  await armor.getByLabel(/^Vértszint/).selectOption("5");
  await armor.getByLabel(/^Tömeg/).selectOption("4");
  await armor.getByLabel(/^GyM/).selectOption("3");
  await armor.getByLabel("Viseli").check();
  assert.match(await chest.getAttribute("class"), /has-armor/);
  assert.equal(await chest.locator("strong").textContent(), "5");
  assert.notEqual(await speed(), initialSpeed);
  assert.ok(await fit());
  await button("Általános").click();
  await sheet.waitFor();
  assert.deepEqual(await read(), fixture);
  accept = true;
  await button("Véglegesítés").click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].equipment.items.some(item => item.catalogId === "mellvert"));
  await page.reload();
  await open();
  assert.equal(await chest.locator("strong").textContent(), "5");
  await row("Mellvért (fém)").getByText("20–40 arany", { exact: true }).waitFor();
  assert.ok(await fit());
  assert.ok(await sheet.locator(".armor-figure img").evaluate(async image => { await image.decode(); return image.naturalWidth > 0; }));
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({ fullPage: true, path: path.join(process.env.SCREENSHOT_DIR, `felszereles-${width}.png`) });
  await button("Szerkesztés").click();
  await button("Jidori csillag eltávolítása").click();
  await sheet.getByLabel("Megjegyzések").fill("Elvetendő.");
  await button("Mégse").click();
  await row("Jidori csillag").waitFor();
  await sheet.getByText(fixture.equipment.notes, { exact: true }).waitFor();
  await button("Szerkesztés").click();
  await button("Mellvért (fém) eltávolítása").click();
  assert.equal(await chest.locator("strong").textContent(), "0");
  await button("Véglegesítés").click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].equipment.items.length === 1);
  assert.equal((await read()).equipment.items[0].quantity, 2);
  assert.equal((await read()).equipment.notes, fixture.equipment.notes);
  const nav = page.getByRole("navigation", { name: "Karakterlap oldalai" });
  for (const [tab, heading] of [["Jártasságok", "Jártasságok"], ["Mágia", "Mágia és varázslatok"], ["Általános", fixture.name]]) {
    await nav.getByRole("button", { name: tab, exact: true }).click();
    await page.getByRole("heading", { name: heading }).first().waitFor();
    assert.ok(await fit());
  }
  await page.locator(".general-sheet:not(.skills-sheet,.equipment-sheet)").waitFor();
  assert.deepEqual(errors, []);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  try {
    for (const [width, height] of [[320, 700], [390, 844], [1440, 900]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500 });
      page.setDefaultTimeout(8000);
      await verify(page, width);
      await page.close();
      console.log(`PASS ${width}×${height}`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
