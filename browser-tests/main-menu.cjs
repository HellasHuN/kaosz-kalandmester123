// Run against npm run preview with playwright-core and Chromium installed.
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright-core");

const fixture = [
  { id: "one", name: "Szentmihályi Mira", race: "Ember", age: 28, gender: "Nő", playStatus: "playing",
    stats: [55, 55, 55, 55, 50], currentFp: 41, magic: { shield: 8, activeEp: 30 }, skills: { Esszenciafelszabadítás: 4 } },
  { id: "two", name: "Ködjáró", race: "Elf", subrace: "Erdei elf", age: 124, playStatus: "draft" },
  { id: "three", name: "Régi vándor", race: "Ork", age: 32 },
];

async function verify(page, width, height) {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => dialog.accept());
  const url = process.env.PREVIEW_URL || "http://localhost:4173/";
  const button = name => page.getByRole("button", { name, exact: true });
  const search = page.getByRole("searchbox", { name: "Karakterkeresés" });
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("kaosz-karakterek")));
  async function returnHome() {
    await button("Beállítások").click();
    await button("Vissza a főmenübe").click();
  }
  await page.goto(url);
  await page.getByText("Nincs mentett karakter.").waitFor();
  await button("Értesítések").waitFor();
  assert.equal(await page.locator(".menu-badge").count(), 0);
  await page.evaluate(records => localStorage.setItem("kaosz-karakterek", JSON.stringify(records)), fixture);
  await page.reload();
  await page.getByRole("heading", { name: "Főmenü", exact: true }).waitFor();
  const registry = page.getByRole("region", { name: /Mentett karakterek/ });
  assert.equal(await registry.locator("li").count(), 3);
  await page.getByRole("heading", { name: fixture[0].name }).waitFor();
  await page.getByText("41 / 55", { exact: true }).waitFor();
  await search.fill("elf");
  await registry.getByRole("button", { name: /Ködjáró/ }).waitFor();
  assert.equal(await registry.getByRole("listitem").count(), 1);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  assert.equal(await registry.getByRole("button", { name: /Ködjáró/ }).evaluate(el => document.activeElement === el), true);
  await page.keyboard.press("Enter");
  await page.getByRole("heading", { name: "Ködjáró", exact: true }).waitFor();
  assert.ok(await page.getByText("Nincs megadva", { exact: true }).count());
  await search.fill("");
  const firstCharacter = registry.getByRole("button", { name: /Szentmihályi/ });
  if (width < 500) await firstCharacter.tap();
  else await firstCharacter.click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (process.env.SCREENSHOT_DIR && width !== 320) {
    await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `fomenu-${width}.png`), fullPage: true });
  }
  await button("Betöltés").click();
  await page.getByRole("heading", { name: fixture[0].name }).waitFor();
  await page.getByRole("navigation", { name: "Karakterlap oldalai" }).waitFor();
  assert.deepEqual(await saved(), fixture);
  await returnHome();
  await button("Szerkesztés").click();
  await button("Véglegesítés").waitFor();
  assert.equal(await button("Véglegesítés").isEnabled(), true);
  await button("Mégse").click();
  await returnHome();
  await registry.getByRole("button", { name: /Ködjáró/ }).click();
  await button("Betöltés").click();
  assert.equal(await page.getByPlaceholder("Karakter neve").inputValue(), "Ködjáró");
  await returnHome();
  await button("Új karakter létrehozása").click();
  assert.equal(await page.getByPlaceholder("Karakter neve").inputValue(), "");
  await returnHome();
  await button("Kódex").click();
  await page.getByRole("status").filter({ hasText: /Önálló kódexnézet/ }).waitFor();
  await page.evaluate(() => {
    localStorage.setItem("kaosz-teszt-kaland", JSON.stringify({ notes: "", messages: [
      { recipient: "one", author: "km", text: "Valódi tárolt próbaüzenet", sentAt: "2026-11-26T10:00:00Z" },
    ] }));
  });
  await page.reload();
  await button("Értesítések · 1 olvasatlan üzenet").click();
  await page.getByRole("button", { name: "Üzenetek", exact: true }).waitFor();
  await page.getByText("Valódi tárolt próbaüzenet").waitFor();
  await returnHome();
  assert.equal(await page.locator(".menu-badge").count(), 0);
  await button("Chat").click();
  await page.getByRole("button", { name: "Üzenetek", exact: true }).waitFor();
  await returnHome();
  await registry.getByRole("button", { name: /Ködjáró/ }).click();
  await button("Törlés").click();
  await button("Mégsem").click();
  assert.deepEqual(await saved(), fixture);
  await button("Törlés").click();
  await button("Igen, tovább").click();
  assert.deepEqual(await saved(), fixture);
  await button("Meghalt").click();
  await button("Bezárás").click();
  assert.deepEqual(await saved(), [fixture[0], fixture[2]]);
  await page.reload();
  assert.equal(await registry.locator("li").count(), 2);
  await button("Kalandmester").click();
  await page.getByRole("heading", { name: "Kalandmesteri irányítópult" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(`PASS ${width}×${height}`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  try {
    for (const [width, height] of [[320, 700], [390, 844], [1440, 900]]) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 500, isMobile: width < 500 });
      page.setDefaultTimeout(4500);
      await verify(page, width, height);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
