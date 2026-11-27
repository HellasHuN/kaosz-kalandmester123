// Run against the production preview with playwright-core and Chromium installed.
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright-core");

const fixture = {
  id: "skills-ui", name: "Déri Áron", race: "Ember", gender: "Férfi", age: 31,
  playStatus: "playing", stats: [57, 58, 51, 54, 50], currentFp: 42, jp: 2000,
  skills: { "Birkózás": 3, "Fegyverforgatás": 1 },
  skillJpByLevel: { "Birkózás": [100, 200, 300], "Fegyverforgatás": [600] },
};

async function verify(page, width) {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  let leave = false;
  page.on("dialog", dialog => dialog[leave ? "accept" : "dismiss"]());
  const button = name => page.getByRole("button", { name, exact: true });
  const sheet = page.locator(".skills-sheet");
  const row = name => sheet.getByRole("row").filter({ has: page.getByRole("rowheader", { name, exact: true }) });
  const search = sheet.getByRole("searchbox", { name: "Jártasság keresése", exact: true });
  const state = sheet.getByLabel("Állapot");
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0]);
  async function open() {
    await button("Betöltés").click();
    await button("Jártasságok").click();
    await sheet.waitFor();
  }
  async function fit() {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.ok(await search.evaluate(el => el.getBoundingClientRect().height >= 44));
  }
  await page.goto(process.env.PREVIEW_URL || "http://localhost:4173/");
  await page.evaluate(value => localStorage.setItem("kaosz-karakterek", JSON.stringify([value])), fixture);
  await page.reload();
  await open();
  await sheet.getByRole("heading", { name: fixture.name, exact: true }).waitFor();
  await row("Birkózás").getByText("3", { exact: true }).waitFor();
  assert.equal(await sheet.getByRole("button", { name: /Fejlesztés →/ }).count(), 0);
  await fit();
  if (process.env.SCREENSHOT_DIR)
    await page.screenshot({ fullPage: true, path: path.join(process.env.SCREENSHOT_DIR, `jartassagok-${width}.png`) });
  await search.fill("birk");
  assert.equal(await sheet.getByRole("rowheader").count(), 1);
  await state.selectOption("training");
  await sheet.getByText("Nincs találat a szűrésre.").waitFor();
  await state.selectOption("all");
  await search.fill("");
  await button("Szerkesztés").click();
  await sheet.getByLabel("Fegyverforgatás szakosodás pontosítása").selectOption("Fegyverforgatás – Egyenes kard");
  await sheet.getByRole("rowheader", { name: /Fegyverforgatás – Egyenes kard/ }).waitFor();
  await button("Általános").click();
  await sheet.waitFor();
  assert.deepEqual(await read(), fixture);
  leave = true;
  await button("Mégse").click();
  await row("Fegyverforgatás").waitFor();
  await button("Szerkesztés").click();
  await row("Birkózás").getByRole("button", { name: "Fejlesztés → 4" }).click();
  const form = sheet.getByRole("form", { name: "Jártasság fejlesztése" });
  await form.getByText("Birkózás · 4. szint · 400 Jp", { exact: true }).waitFor();
  await form.getByRole("spinbutton").fill("7");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Fejlesztés indítása" }).click();
  await state.selectOption("training");
  await row("Birkózás").getByText(/Folyamatban/).waitFor();
  assert.match(await sheet.locator(".skill-reference-budget").innerText(), /1600/);
  await fit();
  await button("Véglegesítés").click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].skillTraining?.Birkózás?.level === 4);
  assert.equal((await read()).skills.Birkózás, 3);
  assert.equal((await read()).jp, 1600);
  await page.reload();
  await open();
  await row("Birkózás").getByText(/Folyamatban/).waitFor();
  assert.equal((await read()).skillTraining.Birkózás.cost, 400);
  await button("Szerkesztés").click();
  await row("Birkózás").getByRole("button", { name: "Jóváhagyás", exact: true }).click();
  await sheet.getByLabel("Fegyverforgatás szakosodás pontosítása").selectOption("Fegyverforgatás – Egyenes kard");
  await button("Véglegesítés").click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].skills.Birkózás === 4);
  const updated = await read();
  assert.equal(updated.skills["Fegyverforgatás – Egyenes kard"], 1);
  assert.equal(updated.skillTraining?.Birkózás, undefined);
  assert.equal(updated.jp, 1600);
  await button("Szerkesztés").click();
  const newSkill = sheet.getByRole("searchbox", { name: "Új jártasság keresése" });
  await newSkill.fill("Orvoslás");
  await button("Orvoslás").click();
  const immediate = form.getByRole("button", { name: "KM jóváhagyása (TESZT)", exact: true });
  assert.equal(await immediate.isDisabled(), true);
  await form.getByRole("button", { name: "Mégse", exact: true }).click();
  await newSkill.fill("Úszás");
  await button("Úszás").click();
  await immediate.click();
  await button("Véglegesítés").click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("kaosz-karakterek"))[0].skills.Úszás === 1);
  const approved = await read();
  assert.equal(approved.skillApprovals.Úszás.source, "test");
  assert.equal(approved.skillTraining?.Úszás, undefined);
  assert.ok(approved.jp < updated.jp);
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
