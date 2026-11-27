const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright-core");

const fixture = {
  id: "azure-test", name: "Esőjáró", race: "Ember", gender: "Férfi", age: 30, playStatus: "playing",
  stats: [55, 55, 55, 90, 50], skills: { Mágiaelmélet: 3, "Mágiahasználat (akadémikus)": 3, Esszenciafelszabadítás: 6 },
  magic: { activeEp: 54, academicCodices: ["Azúr"],
    acquisitions: [{ spellId: "official:esoidezes", form: "academic" }] },
};

async function verify(page, width) {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => dialog.accept());
  const button = (name, scope = page) => scope.getByRole("button", { name, exact: true });
  const codex = page.locator(".azure-codex");
  const history = page.getByRole("region", { name: "Összes mágiaelőzmény" });
  const openHistory = async () => {
    const toggle = page.getByRole("button", { name: /^Mágiaelőzmények/ });
    if (await toggle.getAttribute("aria-expanded") === "false") await toggle.click();
  };
  const dialog = page.getByRole("dialog");
  const magic = () => page.evaluate(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].magic);
  const waitEp = amount => page.waitForFunction(ep => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].magic.activeEp === ep, amount);
  const photo = async (node, name) => {
    if (process.env.AZURE_SCREENSHOT_DIR && width === 390) {
      await node.locator("img").evaluateAll(images => Promise.all(images.map(image => {
        image.loading = "eager";
        return image.decode();
      })));
      await node.screenshot({ path: path.join(process.env.AZURE_SCREENSHOT_DIR, `mukodo-${name}-390.png`) });
    }
  };
  const openCodex = async () => {
    await button("Mágia").click();
    await button("Azúr Kódex").click();
    await codex.waitFor();
  };
  const fit = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

  await page.goto(process.env.PREVIEW_URL || "http://localhost:4173/");
  await page.evaluate(value => localStorage.setItem("kaosz-karakterek", JSON.stringify([value])), fixture);
  await page.reload();
  await button("Betöltés").click();
  await openCodex();
  assert.ok(await fit());
  await photo(codex, "fooldal");
  await button("Teljes varázslatlista", codex).click();
  assert.equal(await codex.getByRole("listitem").count(), 34);
  const type = codex.getByLabel("Varázslattípus");
  await type.selectOption("területre ható");
  await codex.getByLabel("Csak ismert formulák").check();
  assert.equal(await codex.getByRole("listitem").count(), 1);
  await codex.getByLabel("Csak ismert formulák").uncheck();
  await type.selectOption("");
  const search = codex.getByRole("searchbox");
  await search.fill("és");
  assert.ok(await codex.getByRole("listitem").count() > 1);
  await search.fill("");
  await type.selectOption("területre ható");
  await photo(codex, "lista");
  await search.fill("esőidézés");
  assert.equal(await codex.getByRole("listitem").count(), 1);
  await button("Esőidézés kiválasztása", codex).click();
  await codex.getByText("6 vagy 50 Ep").waitFor();
  await codex.getByText(/nyílt területen kell állnia/).waitFor();
  await photo(codex, "adatlap");
  await button("Varázslás", codex).click();
  await button("Felhőszakadás · 50 Ep", dialog).click();
  await dialog.getByText("Nehézség: 2 · Ep: 50", { exact: true }).waitFor();
  await button("Csendes eső · 6 Ep", dialog).click();
  await dialog.getByText("Nehézség: 2 · Ep: 6", { exact: true }).waitFor();
  assert.ok(await button("Digitális k100", dialog).isDisabled());
  await dialog.getByLabel(/nyílt terület/i).check();
  for (const expected of [98, 100, 38]) {
    if (expected === 98) {
      await page.evaluate(() => { Math.random = () => 0.975; });
      await button("Digitális k100", dialog).click();
    } else {
      await dialog.getByLabel(/Kézi k100/).fill(expected === 100 ? "00" : "38");
      await button("Kézi dobás elbírálása", dialog).click();
    }
    if (expected === 38) {
      await dialog.getByText("Naplózva · 6 Ep elszámolva.").waitFor();
      await waitEp(48);
    } else {
      await dialog.getByText("KM elbírálására vár", { exact: true }).waitFor();
      await waitEp(54);
      const entry = (await magic()).castingLog.at(-1);
      assert.equal(entry.roll, expected);
      assert.equal(entry.status, "pending");
      assert.equal(entry.target, 90);
      await button("Új próba", dialog).click();
    }
  }
  assert.ok(await button("Kézi dobás elbírálása", dialog).isDisabled());
  await photo(dialog, "varazslas");
  await page.reload();
  await button("Betöltés").click();
  await openCodex();
  await openHistory();
  assert.equal(await history.getByText("KM elbírálására vár", { exact: true }).count(), 2);
  assert.equal(await history.getByRole("form").count(), 0);
  await button("Beállítások").click();
  await button("Vissza a főmenübe").click();
  const enterKm = async () => {
    await button("Kalandmester").click();
    await button("Karakterlap megnyitása").click();
    await openCodex();
    await openHistory();
    await button("Szerkesztés").click();
  };
  await enterKm();
  for (const [roll, loss] of [[98, 4], [100, 0]]) {
    const form = history.getByRole("form", { name: `Dobás elbírálása: ${roll} / 90` });
    await form.getByLabel(/Ep-veszteség/).fill(String(loss));
    await form.getByLabel(/következménye/).fill("Az eső elmaradt.");
    await button("Elbírálás rögzítése", form).click();
    await form.waitFor({ state: "detached" });
  }
  await button("Véglegesítés").click();
  await waitEp(44);
  await page.reload();
  await enterKm();
  assert.equal(await history.getByRole("form").count(), 0);
  const log = (await magic()).castingLog;
  assert.equal(log.length, 3);
  assert.deepEqual(log.slice(0, 2).map(record => [record.status, record.consequence, record.previousEp - record.remainingEp]),
    [["adjudicated", "Az eső elmaradt.", 4], ["adjudicated", "Az eső elmaradt.", 0]]);
  await button("Mégse").click();
  await button("Beállítások").click();
  await button("Vissza a főmenübe").click();
  // A second fresh player session verifies a successful downpour and its full 50 Ep charge.
  await page.evaluate(value => localStorage.setItem("kaosz-karakterek", JSON.stringify([value])), fixture);
  await page.reload();
  await button("Betöltés").click();
  await openCodex();
  await button("Adatlap", codex).click();
  await button("Varázslás", codex).click();
  await button("Felhőszakadás · 50 Ep", dialog).click();
  await dialog.getByLabel(/nyílt terület/i).check();
  await page.evaluate(() => { Math.random = () => 0.36; });
  await button("Digitális k100", dialog).click();
  await dialog.getByText("Naplózva · 50 Ep elszámolva.").waitFor();
  await waitEp(4);
  assert.equal((await magic()).castingLog.length, 1);
  assert.deepEqual(errors, []);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  try {
    for (const [width, height] of [[390, 844], [1440, 900]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: width === 390, hasTouch: width === 390 });
      page.setDefaultTimeout(10000);
      await verify(page, width);
      await page.close();
      console.log(`Azúr PASS ${width}×${height}`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
