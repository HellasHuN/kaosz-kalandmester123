const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright-core");

const fixture = {
  id: "independent-test", name: "Őrtűz", race: "Ember", gender: "Férfi", age: 30, playStatus: "playing",
  stats: [55, 55, 55, 55, 50], skills: { "Mágiahasználat (akadémikus)": 1, Mágiaelmélet: 1, Esszenciafelszabadítás: 4 },
  magic: { activeEp: 40, acquisitions: [{ spellId: "official:esszencia-erzekelese", form: "academic" }] },
};

async function verify(page, width) {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => dialog.accept());
  const button = name => page.getByRole("button", { name, exact: true });
  const codex = page.locator(".codex-neutral");
  const cast = page.getByRole("dialog");
  const search = codex.getByRole("searchbox");
  const magic = () => page.evaluate(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].magic);
  const photo = async (node, name) => {
    if (process.env.SCREENSHOT_DIR && width === 390)
      await node.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `${name}-390.png`) });
  };
  const fit = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  async function openSpell(name) {
    await codex.getByRole("button", { name: "Varázslatok", exact: true }).click();
    await search.fill(name);
    await button(`${name} kiválasztása`).click();
    await codex.getByRole("heading", { name, exact: true }).waitFor();
  }

  await page.goto(process.env.PREVIEW_URL || "http://localhost:4173/");
  await page.evaluate(value => localStorage.setItem("kaosz-karakterek", JSON.stringify([value])), fixture);
  await page.reload();
  await button("Betöltés").click();
  await button("Mágia").click();
  await button("Kódexfüggetlen").click();
  await codex.getByRole("button", { name: /Varázskönyv megnyitása/ }).waitFor();
  await fit();
  await photo(codex, "mukodo-fooldal");
  await button("Teljes varázslatlista").click();
  await codex.getByLabel("Csak ismert formulák").check();
  assert.equal(await codex.locator(".codex-neutral-index li").count(), 1);
  await codex.getByLabel("Varázslattípus").selectOption("speciális");
  assert.equal(await codex.locator(".codex-neutral-index li").count(), 1);
  await codex.getByLabel("Csak ismert formulák").uncheck();
  await codex.getByLabel("Varázslattípus").selectOption({ index: 0 });
  await photo(codex, "mukodo-lista");
  await openSpell("Esszencia érzékelése");
  await codex.getByText("Smaragd célszám: 25%", { exact: true }).waitFor();
  assert.equal(await button("Formula megadása (KM)").count(), 0);
  await photo(codex, "mukodo-adatlap");
  await button("Varázslás").click();
  await cast.waitFor();
  await cast.getByLabel(/helyzeti feltételek/).check();
  await cast.getByLabel(/Kézi k100/).fill("1");
  await cast.getByRole("button", { name: "Kézi dobás elbírálása" }).click();
  await cast.getByText("Naplózva · 9 Ep elszámolva.").waitFor();
  await photo(cast, "mukodo-varazslas");
  assert.equal((await magic()).activeEp, 31);
  assert.equal((await magic()).castingLog.length, 1);
  await button("Új próba").click();
  await page.evaluate(() => { Math.random = () => 0; });
  await cast.getByRole("button", { name: "Digitális k100" }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].magic.activeEp === 22);
  assert.equal((await magic()).castingLog.length, 2);
  await button("Új próba").click();
  await cast.getByLabel(/Kézi k100/).fill("00");
  await cast.getByRole("button", { name: "Kézi dobás elbírálása" }).click();
  await cast.getByText(/a kudarc Ep-veszteségét/i).waitFor();
  assert.equal((await magic()).activeEp, 22);
  assert.equal((await magic()).castingLog.length, 2);
  await button("Varázslási ablak bezárása").click();
  await codex.getByRole("button", { name: "Varázskönyv", exact: true }).click();
  assert.equal(await codex.locator("ol li").count(), 2);
  await button("Beállítások").click();
  await button("Vissza a főmenübe").click();
  await button("Kalandmester").click();
  await button("Karakterlap megnyitása").click();
  await button("Mágia").click();
  await button("Szerkesztés").click();
  await button("Kódexfüggetlen").click();
  await openSpell("Varázshéj");
  await button("Formula megadása (KM)").click();
  await button("Véglegesítés").click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].magic.academicExceptions?.["official:varazshej"]?.granted === true);
  await button("Szerkesztés").click();
  await button("KM-engedély visszavonása").click();
  await button("Véglegesítés").click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].magic.academicExceptions?.["official:varazshej"]?.granted === false);
  await page.reload();
  assert.equal((await magic()).castingLog.length, 2);
  assert.deepEqual(errors, []);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  try {
    for (const [width, height] of [[390, 844], [1440, 900]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500 });
      page.setDefaultTimeout(9000);
      await verify(page, width);
      await page.close();
      console.log(`PASS ${width}×${height}`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
