const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs/promises");
const { chromium } = require("playwright-core");

const examples = {
  Gránit: [15, "Nyomtalan lábak"],
  Alabástrom: [16, "Szikrazápor"],
  Smaragd: [63, "Növénykeresés"],
  Fekete: [86, "Lélek megszabadítása"],
  Ezüst: [14, "A messzeség kapui"],
  Kígyókő: [19, "Hevítő vér"],
  Arany: [10, "Lángoló rúna"],
};

async function verify(page, width, name, edition, spells, rules) {
  const [count, example] = examples[name];
  const formula = spells.find(spell => spell.codex === name && spell.name === example);
  const fixture = {
    id: "codex-test", name: "Próbamágus", race: "Ember", gender: "Férfi", age: 30, playStatus: "playing",
    stats: [55, 55, 55, 100, 50],
    skills: { Mágiaelmélet: formula.difficulty, "Mágiahasználat (akadémikus)": formula.difficulty, Esszenciafelszabadítás: 10 },
    magic: { activeEp: 100, acquisitions: [{ spellId: formula.id, form: "academic" }] },
  };
  const ep = formula.ep.amount;
  const target = rules.academicMagicTrial(fixture, rules.readMagic(fixture), formula, formula.difficulty).target;
  const roll = target + 1;
  assert.ok(roll < 100);
  assert.equal(rules.spellReadiness(fixture, rules.readMagic(fixture), formula, "academic", { conditionsConfirmed: true }).state, "ready");
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => dialog.accept());
  const button = (label, scope = page) => scope.getByRole("button", { name: label, exact: true });
  const codex = page.locator(".codex-edition");
  const cast = page.getByRole("dialog");
  const storage = () => page.evaluate(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].magic);
  const open = async () => {
    await button("Mágia").click();
    await page.getByLabel("További akadémikus kódexek").selectOption(name);
    await codex.getByRole("heading", { name: `${name} Kódex` }).waitFor();
  };
  const photo = async (element, label) => {
    if (!process.env.SEVEN_SCREENSHOT_DIR || width !== 390) return;
    const dir = path.join(process.env.SEVEN_SCREENSHOT_DIR, `${edition.slug}-kodex`);
    await fs.mkdir(dir, { recursive: true });
    await element.locator("img").evaluateAll(images => Promise.all(images.map(image => {
      image.loading = "eager";
      return image.decode();
    })));
    await element.screenshot({ path: path.join(dir, `mukodo-${label}-390.png`) });
  };
  const fit = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

  await page.goto(process.env.PREVIEW_URL);
  await page.evaluate(character => localStorage.setItem("kaosz-karakterek", JSON.stringify([
    character, { ...character, id: "second-mage", name: "Második mágus", magic: { activeEp: 31 } },
  ])), fixture);
  await page.reload();
  await button("Betöltés").click();
  await open();
  assert.ok(await fit());
  await photo(codex, "fooldal");
  await button("Teljes varázslatlista", codex).click();
  const items = codex.locator("li");
  assert.equal(await items.count(), count);
  assert.deepEqual(await items.locator("strong").allTextContents(), spells.filter(spell => spell.codex === name).map(spell => spell.name));
  const type = codex.getByLabel("Varázslattípus");
  const known = codex.getByLabel("Csak ismert formulák");
  await type.selectOption(formula.type);
  assert.equal(await items.count(), spells.filter(spell => spell.codex === name && spell.type === formula.type).length);
  await known.check();
  assert.equal(await items.count(), 1);
  await known.uncheck();
  await type.selectOption("");
  const search = codex.getByRole("searchbox");
  await search.fill(formula.name.slice(0, 2));
  await photo(codex, "lista");
  await search.fill(formula.name);
  await button(`${formula.name} kiválasztása`, codex).click();
  await codex.getByText(`Alapkönyv, ${formula.page}. oldal`).waitFor();
  assert.equal(await button("Formula megadása (KM)", codex).count(), 0);
  await photo(codex, "adatlap");
  await button("Varázslás", codex).click();
  await cast.getByText(`Nehézség: ${formula.difficulty} · Ep: ${ep}`, { exact: true }).waitFor();
  assert.ok(await button("Digitális k100", cast).isDisabled());
  await cast.getByLabel(/helyzeti feltételek/i).check();
  assert.ok(await fit());
  for (const value of [roll, 100, 1]) {
    if (value === roll) {
      await page.evaluate(n => { Math.random = () => (n - .5) / 100; }, roll);
      await button("Digitális k100", cast).click();
    } else {
      await cast.getByLabel(/Kézi k100/).fill(value === 100 ? "00" : "1");
      await button("Kézi dobás elbírálása", cast).click();
    }
    if (value === 1) {
      await cast.getByText(`Naplózva · ${ep} Ep elszámolva.`).waitFor();
      assert.equal((await storage()).activeEp, 100 - ep);
      assert.ok(await button("Kézi dobás elbírálása", cast).isDisabled());
      await photo(cast, "varazslas");
    } else {
      await cast.getByText("KM elbírálására vár", { exact: true }).waitFor();
      const magic = await storage();
      assert.equal(magic.activeEp, 100);
      assert.equal(magic.castingLog.at(-1).roll, value);
      assert.equal(magic.castingLog.at(-1).target, target);
      await button("Új próba", cast).click();
    }
  }

  await page.reload();
  await button("Betöltés").click();
  await open();
  await button("Varázslási napló megnyitása", codex).click();
  assert.equal(await codex.getByText("KM elbírálására vár", { exact: true }).count(), 2);
  assert.equal(await codex.getByRole("form").count(), 0);
  await button("Beállítások").click();
  await button("Vissza a főmenübe").click();
  const openKm = async () => {
    await button("Kalandmester").click();
    await button("Karakterlap megnyitása").click();
    await open();
    await button("Varázskönyv", codex).click();
    await button("Szerkesztés").click();
  };
  await openKm();
  for (const [value, loss] of [[roll, 2], [100, 0]]) {
    const form = codex.getByRole("form", { name: `Dobás elbírálása: ${value} / ${target}` });
    await form.getByLabel(/Ep-veszteség/).fill(String(loss));
    await form.getByLabel(/következménye/).fill("A hatás elmaradt.");
    await button("Elbírálás rögzítése", form).click();
    await form.waitFor({ state: "detached" });
  }
  await button("Véglegesítés").click();
  const expected = 98 - ep;
  await page.waitForFunction(value => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].magic.activeEp === value, expected);
  await page.reload();
  await openKm();
  assert.equal(await codex.getByRole("form").count(), 0);
  const saved = await storage();
  assert.equal(saved.castingLog.length, 3);
  assert.deepEqual(saved.castingLog.slice(0, 2).map(record => [record.status, record.previousEp - record.remainingEp]),
    [["adjudicated", 2], ["adjudicated", 0]]);
  await button("Mégse").click();
  await button("Beállítások").click();
  await button("Vissza a főmenübe").click();
  await page.getByRole("button", { name: /Második mágus/ }).click();
  await button("Betöltés").click();
  await open();
  await codex.getByText(`0 ismert formula / ${count}`, { exact: false }).waitFor();
  await button("Varázslási napló megnyitása", codex).click();
  await codex.getByText(/Még nincs rögzített/).waitFor();
  assert.equal((await storage()).activeEp, expected);
  assert.deepEqual(errors, []);
}

(async () => {
  const { spells } = await import("../src/varazslatAdatok.js");
  const { codexEdition } = await import("../src/magic/codexEditions.js");
  const rules = await import("../src/magiaSzabalyok.js");
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  try {
    for (const [width, height] of [[390, 844], [1440, 900]]) {
      for (const name of Object.keys(examples).filter(name => !process.argv.slice(2).length || process.argv.slice(2).includes(name))) {
        const page = await browser.newPage({ viewport: { width, height }, isMobile: width === 390, hasTouch: width === 390 });
        page.setDefaultTimeout(12000);
        await verify(page, width, name, codexEdition(name), spells, rules);
        await page.close();
        console.log(`${name} PASS ${width}×${height}`);
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
