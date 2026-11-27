// Run against the production preview with playwright-core and Chromium installed.
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright-core");

const roster = [{ id: "nav-fixture", name: "Őrtűz", race: "Ember", gender: "Férfi", age: 31, playStatus: "playing",
  stats: [57, 58, 51, 54, 50], skills: { Birkózás: 2 } }];

async function verify(page, width) {
  const errors = [];
  const confirmations = [];
  let accept = false;
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => {
    confirmations.push(dialog.message());
    return dialog[accept ? "accept" : "dismiss"]();
  });
  const button = name => page.getByRole("button", { name, exact: true });
  const global = page.getByRole("navigation", { name: "Alkalmazásnavigáció" });
  const home = page.getByRole("heading", { name: "Főmenü", exact: true });
  const title = name => global.getByText(name, { exact: true });
  const tabs = page.getByRole("navigation", { name: "Karakterlap oldalai" });
  const search = page.getByRole("searchbox", { name: "Karakterkeresés" });
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("kaosz-karakterek")));
  const capture = async name => {
    if (process.env.SCREENSHOT_DIR && (width === 390 || width === 1440))
      await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `${name}-${width}.png`) });
  };

  async function layout(expected) {
    await title(expected).waitFor();
    assert.equal(await button("Vissza").count(), 1);
    assert.equal(await button("Főmenü").count(), 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const [back, current, menu] = await Promise.all([
      global.getByRole("button", { name: "Vissza" }).boundingBox(),
      title(expected).boundingBox(),
      global.getByRole("button", { name: "Főmenü" }).boundingBox(),
    ]);
    assert.ok(back.height >= 44 && menu.height >= 44);
    assert.ok(back.x + back.width <= current.x && current.x + current.width <= menu.x);
  }

  await page.goto(process.env.PREVIEW_URL || "http://localhost:4173/");
  await page.evaluate(records => localStorage.setItem("kaosz-karakterek", JSON.stringify(records)), roster);
  await page.reload();
  await home.waitFor();
  assert.equal(await button("Főmenü").count(), 0);
  assert.equal(await button("Vissza").count(), 0);
  await search.fill("Őrt");
  await button("Karakterbetöltés").click();
  await layout("Karakterbetöltés");
  await button("Karakterlap megnyitása").click();
  await layout("Általános");
  await tabs.waitFor();
  assert.deepEqual(await tabs.getByRole("button").allTextContents(), ["Általános", "Jártasságok", "Felszerelés", "Mágia"]);
  for (const tab of ["Jártasságok", "Felszerelés", "Mágia", "Jártasságok"]) {
    await tabs.getByRole("button", { name: tab }).click();
    await layout(tab);
  }
  const skillsSearch = page.getByRole("searchbox", { name: "Jártasság keresése", exact: true });
  await skillsSearch.fill("birk");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  assert.ok(await global.evaluate(el => el.getBoundingClientRect().top >= 0));
  await capture("karakterlap");
  await button("Beállítások").click();
  await layout("Beállítások");
  await button("Vissza").click();
  await layout("Jártasságok");
  assert.equal(await skillsSearch.inputValue(), "birk");
  await page.evaluate(() => history.back());
  await layout("Karakterbetöltés");
  await page.evaluate(() => history.forward());
  await layout("Jártasságok");
  assert.equal(await skillsSearch.inputValue(), "birk");
  await button("Főmenü").click();
  await home.waitFor();
  assert.equal(await search.inputValue(), "Őrt");
  await button("Karakteralkotás").click();
  await layout("Karakteralkotás");
  await page.getByPlaceholder("Karakter neve").fill("Mentetlen próba");
  await button("Főmenü").click();
  await layout("Karakteralkotás");
  assert.equal(await page.getByPlaceholder("Karakter neve").inputValue(), "Mentetlen próba");
  const browserPrompt = page.waitForEvent("dialog");
  await page.evaluate(() => history.back());
  await browserPrompt;
  await page.waitForFunction(() => history.state.kaoszApplicationNavigation.snapshot.page === "alkotas");
  assert.equal(await page.getByPlaceholder("Karakter neve").inputValue(), "Mentetlen próba");
  accept = true;
  await button("Vissza").click();
  await home.waitFor();
  assert.equal(confirmations.filter(text => text.includes("Nem mentett")).length, 3);
  assert.deepEqual(await saved(), roster);
  await button("Kalandmester").click();
  await layout("Kalandmester");
  await button("Világtérkép").click();
  await layout("Világtérkép");
  await page.getByLabel("Helyszín keresése").fill("kőhíd");
  await button("Beállítások").click();
  await layout("Beállítások");
  await button("Vissza").click();
  await layout("Világtérkép");
  assert.equal(await page.getByLabel("Helyszín keresése").inputValue(), "kőhíd");
  await capture("kalandmester");
  await button("Főmenü").click();
  await home.waitFor();
  await button("Játék").click();
  await layout("Játék");
  await button("Karakterlap megnyitása").click();
  await layout("Általános");
  assert.equal(await tabs.getByRole("button", { name: "Általános" }).getAttribute("aria-current"), "page");
  await button("Vissza").click();
  await layout("Játék");
  await button("Vissza").click();
  await home.waitFor();
  assert.deepEqual(await saved(), roster);
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
