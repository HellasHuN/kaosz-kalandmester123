// Run against npm run preview with playwright-core and Chromium installed.
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright-core");

const saved = {
  id: "page-one", name: "Próba Karakter", playStatus: "playing", race: "Ember", gender: "Férfi", age: "28",
  stats: [60, 55, 50, 55, 50], statAllocationVersion: 1, currentFp: 42, jp: 6000,
  magic: { activeEp: 20, shield: 4 }, skills: { Esszenciafelszabadítás: 4 },
};

async function verify(page, width) {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  let accept = true;
  page.on("dialog", async dialog => {
    await (accept && dialog.type() !== "prompt" ? dialog.accept() : dialog.dismiss());
    accept = true;
  });
  const button = name => page.getByRole("button", { name, exact: true });
  const header = page.locator(".general-hero");
  const body = page.locator(".general-sheet");
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem("kaosz-karakterek")));
  const resource = name => body.getByRole("spinbutton", { name, exact: true });
  const fp = body.locator('output[aria-label="Aktuális életerő"]');
  const photo = async name => {
    if (process.env.SCREENSHOT_DIR && width !== 320)
      await page.screenshot({ fullPage: true, path: path.join(process.env.SCREENSHOT_DIR, `${name}-${width}.png`) });
  };
  const assertPortrait = async file => {
    const image = await header.evaluate(el => el.style.getPropertyValue("--ancestry-portrait"));
    assert.ok(image.includes(file), image);
    assert.ok((await page.request.get(new URL(image.match(/url\("([^"]+)"\)/)[1], page.url()).href)).ok());
  };
  const fit = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  async function backFromSheet() {
    await button("Beállítások").click();
    await button("Vissza a főmenübe").click();
  }
  await page.goto(process.env.PREVIEW_URL || "http://localhost:4173/");
  await page.evaluate(record => localStorage.setItem("kaosz-karakterek", JSON.stringify([record])), saved);
  await page.reload();
  await button("Betöltés").click();
  await body.waitFor();
  await assertPortrait("race-03.webp");
  const engravedAssets = [
    [header, "backgroundImage", "human-hero"],
    [header.locator("h2"), "backgroundImage", "title-engraving"],
    [body.locator('.general-attribute[data-attribute="0"] i'), "backgroundImage", "physique-engraving"],
    [body.locator(".general-info"), "borderImageSource", "panel-engraving"],
  ];
  for (const [element, property, name] of engravedAssets) {
    const image = await element.evaluate((el, key) => getComputedStyle(el)[key], property);
    const url = image.match(/url\("([^"]+)"\)/)?.[1];
    assert.ok(url?.includes(name), image);
    assert.ok(await page.evaluate(async source => {
      const graphic = new Image();
      graphic.src = source;
      await graphic.decode();
      return graphic.naturalWidth > 0;
    }, url), url);
  }
  assert.equal(await button("Mentett karakterek").count(), 0);
  assert.deepEqual(await body.locator(".general-attribute output").evaluateAll(els => els.map(el => el.getAttribute("aria-label"))),
    ["Fizikum","Erő","Szívósság","Rátermettség","Ügyesség","Reflex","Tudat","Intelligencia","Lelkierő",
      "Esszencia","Varázserő","Esszenciapajzs","Érzékelés","Érzékszerv","Intuíció"]);
  assert.ok(await button("Életerő növelése").isDisabled());
  assert.equal(await button("Főmenü").count(), 0);
  assert.match(await body.innerText(), /20 \/ 55/);
  await fit();
  await photo("jatekos");
  const navigation = page.getByRole("navigation", { name: "Karakterlap oldalai" });
  for (const [tab, heading] of [
    ["Jártasságok", "Jártasságok"], ["Felszerelés", "Páncélzat és védettségi zónák"], ["Mágia", "Mágia és varázslatok"],
  ]) {
    await navigation.getByRole("button", { name: tab, exact: true }).click();
    const panel = page.getByRole("heading", { name: heading });
    await panel.waitFor();
    await fit();
    if (tab === "Felszerelés") {
      assert.equal(await page.locator(".armor-label").count(), 11);
      assert.ok(await page.locator(".armor-figure img").evaluate(async image => {
        await image.decode();
        return image.naturalWidth > 0;
      }));
    }
  }
  await navigation.getByRole("button", { name: "Általános", exact: true }).click();
  await body.waitFor();
  await button("Életerő csökkentése").click();
  assert.equal(await fp.innerText(), "41");
  assert.match(await body.innerText(), /Sebszint: 4 \/ 10/);
  await button("Szerkesztés").click();
  await button("Életerő növelése").click();
  assert.equal(await fp.innerText(), "42");
  await button("Mégse").click();
  assert.equal(await fp.innerText(), "41");
  await button("Szerkesztés").click();
  await body.getByText("További adatok", { exact: true }).click();
  await body.getByLabel("Hajszín").fill("Barna");
  await body.getByLabel("Magasság", { exact: true }).fill("182");
  await button("Véglegesítés").click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].profile?.heightCm === "182");
  await photo("adatok");
  await backFromSheet();
  await page.reload();
  await button("Betöltés").click();
  await body.getByText("További adatok", { exact: true }).click();
  await body.getByText("182 cm", { exact: true }).waitFor();
  await backFromSheet();
  await button("Karakteralkotás").click();
  const race = body.getByRole("combobox", { name: /^Faj/ });
  await race.selectOption("Ember");
  await body.getByLabel("Nem", { exact: true }).selectOption("Nő");
  await assertPortrait("race-04.webp");
  const startingHealth = Number(await fp.innerText());
  await button("Életerő csökkentése").click();
  assert.equal(Number(await fp.innerText()), startingHealth - 1);
  assert.equal((await read())[0].currentFp, 41);
  await button("Életerő növelése").click();
  assert.equal(Number(await fp.innerText()), startingHealth);
  const phys = body.locator('output[aria-label="Fizikum"]');
  const before = Number(await phys.innerText());
  await button("Fizikum csökkentése").click();
  assert.equal(Number(await phys.innerText()), before - 1);
  await button("Fizikum növelése").click();
  assert.equal(Number(await phys.innerText()), before);
  await body.getByText("Előnyök és hátrányok szerkesztése", { exact: true }).click();
  await body.getByRole("checkbox", { name: /Éber alvás/ }).check();
  await body.getByText("Előnyök (1)", { exact: true }).waitFor();
  await body.getByText("Előnyök és hátrányok szerkesztése", { exact: true }).click();
  await fit();
  await photo("alkotas");
  await race.selectOption("Elf");
  await body.getByLabel(/^Alfaj/).selectOption("Erdei elf");
  await assertPortrait("variant-02.webp");
  await photo("erdei-elf");
  await race.selectOption("Gilf");
  assert.equal(await body.getByLabel("Nem", { exact: true }).locator("option[value='Férfi']").count(), 0);
  assert.equal(await body.getByLabel("Nem", { exact: true }).getByText("Férfi", { exact: true }).count(), 0);
  await assertPortrait("race-06.webp");
  await photo("gilf");
  assert.equal(await button("Kódex").count(), 0);
  accept = false;
  await button("Főmenü").click();
  await header.waitFor();
  await button("Főmenü").click();
  await button("Kalandmester").click();
  await button("Karakterlap megnyitása").click();
  assert.equal(await button("Életerő növelése").isEnabled(), true);
  await button("Szerkesztés").click();
  await resource("Aktuális aktív Ep").fill("56");
  await button("Véglegesítés").click();
  assert.equal((await read())[0].magic.activeEp, 20);
  await resource("Aktuális aktív Ep").fill("18");
  await photo("km");
  await button("Véglegesítés").click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].magic.activeEp === 18);
  assert.equal((await read())[0].profile.hairColor, "Barna");
  await button("Értesítések").click();
  await page.getByRole("button", { name: "Üzenetek", exact: true }).waitFor();
  assert.deepEqual(errors, []);
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  try {
    for (const [width,height] of [[320,700],[390,844],[1440,900]]) {
      const page = await browser.newPage({ viewport: { width,height }, isMobile: width < 500, hasTouch: width < 500 });
      page.setDefaultTimeout(6500);
      await verify(page, width);
      await page.close();
      console.log(`PASS ${width}×${height}`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
