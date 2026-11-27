// Run against the production preview with playwright-core and Chromium installed.
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright-core");

const character = { id: "chrome-demo", name: "Őrtűz", race: "Ember", gender: "Férfi", age: 30, playStatus: "playing",
  stats: [57, 58, 51, 54, 50] };

async function verify(page, width) {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => dialog.accept());
  const button = name => page.getByRole("button", { name, exact: true });
  const heading = name => page.getByRole("heading", { name, exact: true });
  const fit = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const photo = async name => {
    if (process.env.SCREENSHOT_DIR && (width === 390 || width === 1440))
      await page.screenshot({ fullPage: true, path: path.join(process.env.SCREENSHOT_DIR, `${name}-${width}.png`) });
  };
  await page.goto(process.env.PREVIEW_URL || "http://localhost:4173/");
  await page.evaluate(value => localStorage.setItem("kaosz-karakterek", JSON.stringify([value])), character);
  await page.reload();
  await heading("Főmenü").waitFor();
  await fit();
  await photo("fomenu");
  await button("Törlés").click();
  await page.getByRole("dialog", { name: "Biztosan törlöd?" }).waitFor();
  await fit();
  if (process.env.SCREENSHOT_DIR && width === 390)
    await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, "torles-390.png") });
  await button("Igen, tovább").click();
  await page.getByRole("dialog", { name: "Nem gondoltad meg magad?" }).waitFor();
  await button("Életben marad").click();
  await page.getByRole("dialog", { name: "Búcsú a kaland végén" }).waitFor();
  await button("Bezárás").click();
  await button("Karakterbetöltés").click();
  await button("Kaland megnyitása").click();
  await heading("Kaland kezdete").waitFor();
  await fit();
  await button("Kalandmester mód").click();
  await heading("Kalandmesteri irányítópult").waitFor();
  await fit();
  await photo("kalandmester");
  await button("Üzenetek").click();
  await page.getByLabel("Üzenet", { exact: true }).fill("Kalandpróba");
  await button("Küldés").click();
  await page.locator(".test-messages").getByText("Kalandpróba").waitFor();
  await page.locator(".general-hero").getByRole("heading", { name: "Őrtűz" }).waitFor();
  await fit();
  await photo("uzenetek");
  await button("Harci szegmensek").click();
  await page.getByLabel("Kézzel kiszámított szegmens rögzítése").check();
  await page.getByLabel("Szereplő", { exact: true }).fill("Őr");
  await page.getByLabel("Szegmens", { exact: true }).fill("4");
  await button("Szereplő hozzáadása").click();
  await page.getByRole("list", { name: "Szegmensek időrendben" }).getByText("Őr").waitFor();
  await fit();
  await button("Világtérkép").click();
  await page.getByText(/Bemutatótérkép saját helyszínekkel/).waitFor();
  await button("Nagyítás").click();
  await page.getByLabel("Helyszín keresése").fill("kőhíd");
  await page.locator(".test-map").getByRole("button", { name: "Kőhíd" }).click();
  await page.getByRole("status").filter({ hasText: "Kőhíd" }).waitFor();
  await fit();
  await button("Bestiárium").click();
  await heading("Bestiárium").waitFor();
  await fit();
  await button("Generátor").click();
  await page.getByLabel("Generált lény faja vagy típusa").fill("Próbaőr");
  await button("Új vázlat generálása").click();
  await page.locator("summary").filter({ hasText: "Próbaőr" }).waitFor();
  await fit();
  await button("Titkos próbák").click();
  await page.getByLabel("Kézi k100 (00 = 100)", { exact: true }).fill("11");
  await button("Próba elbírálása").click();
  await page.getByRole("status").filter({ hasText: "Dobás: 11" }).waitFor();
  await fit();
  await button("Felülbírálások").click();
  await page.getByLabel("Jóváhagyott célszám").fill("65");
  await page.getByLabel("Felülbírálás indoka").fill("Kalandpróba");
  await button("Célszám jóváhagyása").click();
  await button("Felülbírálás visszavonása").waitFor();
  await fit();
  await button("KM-jegyzetek").click();
  await page.getByLabel("KM-jegyzet", { exact: true }).fill("Feljegyzés");
  await fit();
  await button("Beállítások").click();
  await heading("Beállítások").waitFor();
  await fit();
  await photo("beallitasok");
  await button("Vissza a főmenübe").click();
  await heading("Főmenü").waitFor();
  const keys = await page.evaluate(() => ({
    roster: JSON.parse(localStorage.getItem("kaosz-karakterek")),
    adventure: JSON.parse(localStorage.getItem("kaosz-teszt-kaland")),
  }));
  assert.deepEqual(keys.roster, [character]);
  assert.equal(keys.adventure.notes, "Feljegyzés");
  assert.deepEqual(errors, []);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  try {
    for (const [width, height] of [[320, 700], [390, 844], [768, 1024], [1440, 900]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 900 });
      page.setDefaultTimeout(8500);
      await verify(page, width);
      await page.close();
      console.log(`PASS ${width}×${height}`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
