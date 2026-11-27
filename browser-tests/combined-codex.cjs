const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");

async function verify(page) {
  const errors = [];
  const confirmations = [];
  page.on("pageerror", error => errors.push(error.message));
  let acceptExit = false;
  page.on("dialog", dialog => {
    confirmations.push(dialog.message());
    return acceptExit ? dialog.accept() : dialog.dismiss();
  });
  const button = (name, root = page) => root.getByRole("button", { name, exact: true });
  const tab = page.getByRole("navigation", { name: "Karakterlap oldalai" });
  const magic = page.locator(".magic-panel");
  const catalog = page.locator(".codex-neutral");
  const fixture = {
    id: "integration", name: "Próbamágus", race: "Ember", age: 30, gender: "Férfi", playStatus: "playing",
    stats: [55, 55, 55, 90, 50],
    skills: { Mágiaelmélet: 7, "Mágiahasználat (akadémikus)": 7, Esszenciafelszabadítás: 6 },
    magic: {
      academicSpecialization: { codex: "Skarlát" }, activeEp: 80,
      acquisitions: [{ spellId: "official:esoidezes", form: "academic" }, { spellId: "official:esszencia-erzekelese", form: "academic" }],
    },
  };
  const { spells, codices } = await import("../src/varazslatAdatok.js");
  const known = spells.find(spell => spell.codex === "Kódexfüggetlen" && spell.ep?.kind === "fixed" && spell.difficulty <= 7);
  fixture.magic.acquisitions[1].spellId = known.id;
  const fit = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  await page.goto(process.env.PREVIEW_URL || "http://localhost:4173/");
  await page.evaluate(character => localStorage.setItem("kaosz-karakterek", JSON.stringify([character])), fixture);
  await page.reload();
  await button("Betöltés").click();
  for (const name of ["Jártasságok", "Felszerelés", "Mágia"]) {
    await button(name, tab).click();
    assert.ok(await fit(), name);
  }
  assert.deepEqual(confirmations, []);
  const forms = magic.getByRole("navigation", { name: "Mágiaformák" });
  assert.equal(await button("Akadémikus", forms).getAttribute("aria-pressed"), "true");
  await button("Praktikus", forms).click();
  await magic.getByRole("heading", { name: "Praktikus mágia" }).waitFor();
  await button("Akadémikus", forms).click();
  for (const name of codices.filter(name => name !== "Praktikus mágia")) {
    const title = name === "Kódexfüggetlen" ? name : `${name} Kódex`;
    if (["Kódexfüggetlen", "Skarlát", "Azúr"].includes(name)) await button(title, magic).click();
    else await magic.getByLabel("További akadémikus kódexek").selectOption(name);
    await catalog.getByRole("heading", { name: title, exact: true }).waitFor();
    await button("Teljes varázslatlista", catalog).click();
    const entries = catalog.getByRole("listitem");
    assert.equal(await entries.count(), spells.filter(spell => spell.codex === name).length, title);
    await entries.first().getByRole("button").click();
    await catalog.getByRole("heading", { name: "Varázslat adatlapja" }).waitFor();
    await catalog.locator(".codex-neutral-detail img").evaluate(image => image.decode());
    assert.ok(await fit(), title);
  }
  await button("Összesített kódex", magic).click();
  await button("Teljes varázslatlista", catalog).click();
  assert.equal(await catalog.getByRole("listitem").count(), 2);
  await catalog.getByRole("searchbox").fill(known.name);
  assert.equal(await catalog.getByRole("listitem").count(), 1);
  await button(`${known.name} kiválasztása`, catalog).click();
  await button("Varázslás", catalog).click();
  const cast = page.getByRole("dialog");
  await cast.getByLabel(/helyzeti feltételek/i).check();
  await button("Elvarázsolás", cast).click();
  await cast.getByText("Kézzel elbírált siker", { exact: true }).waitFor();
  await button("Varázslási ablak bezárása", cast).click();
  await magic.getByRole("button", { name: /^Mágiaelőzmények/ }).click();
  const history = magic.getByRole("region", { name: "Összes mágiaelőzmény" });
  await history.getByRole("searchbox").fill(known.name);
  await history.getByText(known.name, { exact: true }).waitFor();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].magic);
  assert.equal(saved.castingLog.length, 1);
  assert.equal(saved.activeEp, fixture.magic.activeEp - known.ep.amount);
  await button("Beállítások").click();
  const back = button("Vissza");
  const bounds = await back.boundingBox();
  const navigation = await page.getByRole("navigation", { name: "Alkalmazásnavigáció" }).boundingBox();
  assert.ok(bounds.x - navigation.x < 20 && bounds.y < 120);
  await back.click();
  assert.equal(await button("Mágia", tab).getAttribute("aria-current"), "page");
  await button("Beállítások").click();
  await button("Vissza a főmenübe").click();
  await button("Vissza a főmenübe").waitFor();
  assert.equal(confirmations.length, 1);
  acceptExit = true;
  await button("Vissza a főmenübe").click();
  await page.getByRole("heading", { name: "Főmenü", exact: true }).waitFor();
  assert.equal(confirmations.length, 2);
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
      console.log(`10 kódex, összesítés, előzmények és navigáció PASS ${width}×${height}`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
