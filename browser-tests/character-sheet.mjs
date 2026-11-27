import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const base = process.env.KAOSZ_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
const output = new URL("./screenshots/", import.meta.url);
await mkdir(output, { recursive: true });

try {
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const button = (name, root = page) => root.getByRole("button", { name, exact: true });
    const click = (name, root) => button(name, root).click();
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("kaosz-karakterek") ?? "[]")[0]);
    const nav = () => page.getByRole("navigation", { name: "Karakterlap oldalai" });
    const portrait = () => page.locator(".general-hero-portrait").evaluate(node =>
      getComputedStyle(node).getPropertyValue("--ancestry-portrait"));
    page.on("dialog", dialog => dialog.accept());
    await page.goto(base);
    await click("Új karakter létrehozása");
    const race = page.locator("select").first();
    const gender = page.getByLabel("Nem", { exact: true });
    const name = page.getByLabel("Karakter neve");
    const age = page.getByRole("spinbutton", { name: "Életkor", exact: true });
    await race.selectOption("Elf");
    await page.getByLabel("Alfaj").selectOption("Erdei elf");
    await gender.selectOption("Nő");
    assert.match(await portrait(), /variant-02.webp/);
    await gender.selectOption("Férfi");
    assert.match(await portrait(), /variant-01.webp/);
    await page.getByLabel("Alfaj").selectOption("Bérci könnyűléptű");
    assert.match(await portrait(), /variant-03.webp/);
    await race.selectOption("Félvér elf");
    await page.getByLabel("Második szülő faja").selectOption("Ember");
    assert.equal(await page.locator(".general-parent-portraits img").count(), 2);
    await race.selectOption("Ember");
    await gender.selectOption("Nő");
    await age.fill("27");
    await name.fill("Aranyhíd");
    assert.match(await portrait(), /race-04.webp/);
    await page.screenshot({ path: new URL(`creation-${width}x${height}.png`, output).pathname });
    await click("KARAKTER MENTÉSE");
    assert.equal(Number((await saved()).age), 27);
    assert.equal((await saved()).stats.reduce((a, b) => a + b, 0), 270);

    await click("Vissza a főmenübe");
    await click("Karakterbetöltés");
    await click("Játékba helyezés");
    await click("Karakterlap megnyitása");
    assert.match(await portrait(), /race-04.webp/);
    await click("Jártasságok", nav());
    await click("Felszerelés", nav());
    await click("Mágia", nav());
    await page.getByRole("heading", { name: "Varázslókönyv" }).waitFor();
    await click("Karakter", nav());
    await click("Vissza a főmenübe");

    // The fixture adds acquired magic so both casting paths can run independently of creation Jp.
    await page.evaluate(() => {
      const [character] = JSON.parse(localStorage.getItem("kaosz-karakterek"));
      character.skills = { "Mágiahasználat (akadémikus)": 1, Mágiaelmélet: 1, Esszenciafelszabadítás: 4 };
      character.jp = 5000;
      character.magic = { activeEp: 40, academicSpecialization: { codex: "Skarlát" },
        acquisitions: [{ spellId: "official:esszencia-erzekelese", form: "academic" }] };
      localStorage.setItem("kaosz-karakterek", JSON.stringify([character]));
    });
    await page.reload();
    await click("Kalandmester");
    await click("Karakterlap megnyitása");
    await click("Szerkesztés");
    await click("Fizikum növelése");
    await page.getByRole("spinbutton", { name: "Intuíció", exact: true }).fill("101");
    await age.fill("180");
    await page.getByLabel("Elkölthető Jp").fill("6000");
    await page.getByLabel("Aktuális aktív Ep", { exact: true }).fill("130");
    await click("Véglegesítés");
    assert.equal(Number((await saved()).age), 180);
    assert.equal((await saved()).stats.reduce((a, b) => a + b, 0), 271);
    assert.equal((await saved()).magic.activeEp, 130);
    assert.equal((await saved()).componentOverrides[4]["-1"], 101);
    await click("Jártasságok", nav());
    await click("Szerkesztés");
    await page.getByRole("spinbutton", { name: "Mágiaelmélet szintje" }).fill("12");
    await click("Véglegesítés");
    assert.equal((await saved()).skills.Mágiaelmélet, 12);

    await click("Mágia", nav());
    await click("Akadémikus");
    await click("Esszencia érzékelése kiválasztása");
    await page.getByLabel(/A helyzeti feltételek/).check();
    await click("Elvarázsolás");
    await page.getByText("Kézzel elbírált siker", { exact: true }).waitFor();
    assert.equal((await saved()).magic.activeEp, 121);
    assert.equal((await saved()).magic.castingLog.length, 1);
    assert.equal(await button("Elvarázsolás").isEnabled(), false);
    await page.screenshot({ path: new URL(`manual-cast-${width}x${height}.png`, output).pathname });
    await click("Új próba");
    await page.getByLabel("Varázslás módja").selectOption("digital");
    await page.evaluate(() => { Math.random = () => 0.999; });
    await click("Digitális k100");
    await page.getByText("KM elbírálására vár", { exact: true }).first().waitFor();
    assert.equal((await saved()).magic.activeEp, 121);
    assert.equal((await saved()).magic.castingLog.at(-1).status, "pending");

    await page.reload();
    await click("Karakterbetöltés");
    await click("Karakterlap megnyitása");
    assert.match(await portrait(), /race-04.webp/);
    assert.equal((await saved()).skills.Mágiaelmélet, 12);
    assert.equal((await saved()).magic.activeEp, 121);
    assert.equal((await saved()).magic.castingLog.length, 2);
    await click("Jártasságok", nav());
    await click("Szerkesztés");
    await page.getByLabel("Új jártasság keresése").fill("Úszás");
    await click("Úszás");
    await click("KM jóváhagyása (TESZT)");
    await page.getByRole("row", { name: /Úszás/ }).waitFor();
    await click("Véglegesítés");
    assert.equal((await saved()).skills.Úszás, 1);
    assert.equal((await saved()).skillApprovals.Úszás.source, "test");

    await click("Mágia", nav());
    assert.equal(await button("Vízpermet kiválasztása").count(), 0);
    await page.getByLabel("Külső formulák megtekintése és engedélyezése").check();
    await click("Szerkesztés");
    await click("Vízpermet kiválasztása");
    await click("KM jóváhagyása (TESZT)");
    await click("Véglegesítés");
    assert.equal((await saved()).magic.academicExceptions["official:vizpermet"].source, "test");
    await page.reload();
    await click("Karakterbetöltés");
    await click("Karakterlap megnyitása");
    await click("Mágia", nav());
    await button("Vízpermet kiválasztása").waitFor();
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`Chromium ${width}×${height} OK`);
  }
} finally {
  await browser.close();
}
