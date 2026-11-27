// Run against the built preview with playwright-core and Chromium installed.
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright-core");

const fixture = [
  { id: "human-one", name: "Őrtűz", playStatus: "playing", race: "Ember", gender: "Férfi", age: 31, stats: [57, 58, 51, 54, 50] },
  { id: "elf-one", name: "Ágas", playStatus: "draft", race: "Elf", subrace: "Erdei elf", gender: "Nő", age: 100 },
  { id: "old-one", name: "Régi vándor", race: "Gilf", gender: "Nő", age: 61 },
];

async function verify(page, width) {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => dialog.accept());
  const button = name => page.getByRole("button", { name, exact: true });
  const navigation = name => page.getByRole("navigation", { name });
  const fit = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("kaosz-karakterek")));
  const photo = async name => {
    if (process.env.SCREENSHOT_DIR && width === 390)
      await page.screenshot({ fullPage: true, path: path.join(process.env.SCREENSHOT_DIR, `${name}-390.png`) });
    if (process.env.SCREENSHOT_DIR && width === 1440 && name === "karakterlap-magia")
      await page.screenshot({ fullPage: true, path: path.join(process.env.SCREENSHOT_DIR, `${name}-1440.png`) });
  };
  await page.goto(process.env.PREVIEW_URL || "http://localhost:4173/");
  await page.evaluate(records => localStorage.setItem("kaosz-karakterek", JSON.stringify(records)), fixture);
  await page.reload();
  await button("Karakterbetöltés").click();
  const library = page.getByRole("region", { name: "Karakterbetöltés" });
  await library.getByText("Erdei elf", { exact: false }).waitFor();
  await library.getByText(/Régi mentés · besorolásra vár/).waitFor();
  const portraits = await library.locator(".character-library-portrait").evaluateAll(items =>
    items.map(item => getComputedStyle(item).backgroundImage.match(/url\("([^"]+)"\)/)?.[1]));
  assert.equal(portraits.length, 3);
  for (const url of portraits) assert.ok(url && (await page.request.get(url)).ok());
  await fit();
  await photo("karakterbetoltes");
  await library.getByRole("button", { name: "Karakter eltávolítása", exact: true }).click();
  await button("Igen, tovább").click();
  await button("Életben marad").click();
  if (await button("Bezárás").count()) await button("Bezárás").click();
  assert.deepEqual(await saved(), fixture);
  await library.getByRole("button", { name: "Karakterlap megnyitása", exact: true }).click();
  const sheetNav = navigation("Karakterlap oldalai");
  for (const tab of ["Jártasságok", "Felszerelés", "Mágia", "Általános"]) {
    const link = sheetNav.getByRole("button", { name: tab, exact: true });
    await link.click();
    assert.equal(await link.getAttribute("aria-current"), "page");
    await page.locator(".general-hero").getByRole("heading", { name: "Őrtűz" }).waitFor();
    await fit();
    if (tab === "Mágia") {
      await page.getByRole("heading", { name: "Mágia és varázslatok" }).waitFor();
      await photo("karakterlap-magia");
    }
  }
  await button("Beállítások").click();
  await button("Főmenü").click();
  await button("Karakteralkotás").click();
  await page.getByPlaceholder("Karakter neve").fill("Új próba");
  await page.getByLabel(/^Faj/).first().selectOption("Ember");
  await page.getByLabel(/^Életkor/).selectOption("25");
  const creationNav = navigation("A karakteralkotás részei");
  for (const [tab, screenshot] of [["Jártasságok", "alkotas-jartassagok"], ["Felszerelés", "alkotas-felszereles"], ["Mágia", "alkotas-magia"]]) {
    const link = creationNav.getByRole("button", { name: tab, exact: true });
    await link.click();
    assert.equal(await link.getAttribute("aria-pressed"), "true");
    await page.locator(".general-hero").getByRole("heading", { name: "Új próba" }).waitFor();
    await fit();
    await photo(screenshot);
  }
  await creationNav.getByRole("button", { name: "Karakteradatok", exact: true }).click();
  assert.equal(await page.getByPlaceholder("Karakter neve").inputValue(), "Új próba");
  assert.deepEqual(await saved(), fixture);
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
