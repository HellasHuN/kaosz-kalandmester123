// Run against npm run preview with playwright-core and Chromium installed.
// Set SCREENSHOT_DIR to save the three verified header variants.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright-core');

const legacy = 'Mágiaelmélet (Azúr kódex)';
const fixture = {
  id: 'academic', name: 'Kódexpróba', race: 'Ember', age: '25', stats: [55, 55, 55, 55, 50],
  jp: 10000, playStatus: 'draft', statAllocationVersion: 1,
  skills: { [legacy]: 7, 'Mágiahasználat (akadémikus)': 7, Esszenciafelszabadítás: 10 },
  skillJpPaid: { [legacy]: 1234 },
  magic: { activeEp: 40, shield: 6, acquisitions: [{ spellId: 'official:tuzkozpont', form: 'academic' }] },
};

async function verify(page, width) {
  let accept = true;
  page.on('dialog', async (dialog) => {
    await (accept ? dialog.accept() : dialog.dismiss());
    accept = true;
  });
  const button = name => page.getByRole('button', { name, exact: true });
  const magic = page.locator('.magic-panel');
  const header = magic.locator('.grimoire-banner');
  const search = magic.getByRole('searchbox');
  const codex = page.getByRole('combobox', { name: 'Alapkódex', exact: true });
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('kaosz-karakterek'))[0]);
  const photo = async (name) => {
    if (process.env.SCREENSHOT_DIR && width !== 320) {
      await header.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `${name}-${width}.png`) });
    }
  };
  const assertArt = async (name, file) => {
    assert.equal(await header.getAttribute('data-specialization-codex'), name);
    const background = await header.evaluate(element => getComputedStyle(element).backgroundImage);
    assert.ok(background.includes(file));
    const asset = background.match(/url\("([^"]+)"\)/)[1];
    assert.ok((await page.request.get(asset)).ok(), 'The header artwork is served by the build');
  };
  const openDraft = async () => {
    await button('Karakterbetöltés').click();
    await button('Karakter szerkesztése').click();
    await button('Jártasságok').click();
  };
  const openSpell = async (name) => {
    await search.fill(name);
    await button(`${name} kiválasztása`).click();
    await magic.getByRole('heading', { name, exact: true }).waitFor();
  };
  await page.goto(process.env.PREVIEW_URL || 'http://localhost:4173/');
  await page.evaluate(record => localStorage.setItem('kaosz-karakterek', JSON.stringify([record])), fixture);
  await page.reload();
  await openDraft();
  await page.getByRole('searchbox').fill('Mágiaelmélet');
  assert.deepEqual(await page.locator('.skills-results button').allTextContents(), ['Mágiaelmélet']);
  await button('Mágiaelmélet').click();
  assert.deepEqual(await page.getByLabel(/Választott szint/).locator('option').allTextContents(), ['8. szint', '9. szint', '10. szint']);
  await button('Mégse').click();
  await button('Mágia').click();
  assert.equal(await header.getAttribute('data-specialization-codex'), null);
  await photo('altalanos');
  await button('Jártasságok').click();
  accept = false;
  await codex.selectOption('Skarlát');
  assert.equal(await codex.inputValue(), '');
  await codex.selectOption('Skarlát');
  await button('Mágia').click();
  await assertArt('Skarlát', 'langtenger.webp');
  await photo('skarlat');
  await openSpell('Tűzközpont');
  await magic.getByText(/Szakosodás: \+20 százalékpont/).waitFor();
  await search.fill('Vízpermet');
  assert.equal(await button('Vízpermet kiválasztása').count(), 0);
  assert.deepEqual(await read(), fixture);
  await button('KARAKTER MENTÉSE').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('kaosz-karakterek'))[0].magic.academicSpecialization?.codex === 'Skarlát');
  const saved = await read();
  assert.equal(saved.skills[legacy], 7);
  assert.equal(saved.skillJpPaid[legacy], 1234);
  assert.deepEqual(saved.magic.acquisitions, fixture.magic.acquisitions);
  await page.reload();
  await openDraft();
  assert.equal(await codex.inputValue(), 'Skarlát');
  await button('Mentett karakterek').click();
  await button('Játékba helyezés').click();
  await button('Karakterlap megnyitása').click();
  await button('Mágia').click();
  await assertArt('Skarlát', 'langtenger.webp');
  await button('Szerkesztés').click();
  await magic.getByRole('checkbox', { name: 'Kalandmesteri nézet (helyi)' }).check();
  await openSpell('Vízpermet');
  await magic.getByText(/kódexen kívüli formulához külön KM-engedély/).first().waitFor();
  await button('Formula megadása (KM)').click();
  const bonus = magic.getByRole('checkbox', { name: '+20 százalékpont engedélyezése', exact: true });
  assert.equal(await bonus.isChecked(), false);
  await magic.getByText('Smaragd célszám: 96%', { exact: true }).waitFor();
  await bonus.check();
  await magic.getByText('Smaragd célszám: 100% · Szakosodás: +20 százalékpont', { exact: true }).waitFor();
  assert.equal(await magic.getByText(/Az anyagi komponens elhagyható/).count(), 0);
  await magic.getByRole('checkbox', { name: /A helyzeti feltételek/ }).check();
  await magic.getByLabel(/Kézi k100/).fill('1');
  await button('Kézi dobás elbírálása').click();
  await magic.getByRole('status').filter({ hasText: /1 \/ 100/ }).waitFor();
  await button('Digitális k100').click();
  await magic.getByRole('status').filter({ hasText: /\/ 100/ }).waitFor();
  await magic.getByRole('spinbutton', { name: /^Aktuális aktív Ep/ }).fill('0');
  assert.equal(await button('Digitális k100').isDisabled(), true);
  await magic.getByRole('spinbutton', { name: /^Aktuális aktív Ep/ }).fill('40');
  await button('Véglegesítés').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('kaosz-karakterek'))[0].magic.academicExceptions['official:vizpermet']?.bonus === true);
  await page.reload();
  await button('Karakterbetöltés').click();
  await button('Karakterlap megnyitása').click();
  await button('Mágia').click();
  await openSpell('Vízpermet');
  await magic.getByText(/100% · Szakosodás/).waitFor();
  await button('Szerkesztés').click();
  await magic.getByRole('checkbox', { name: 'Kalandmesteri nézet (helyi)' }).check();
  await openSpell('Vízpermet');
  await bonus.uncheck();
  await magic.getByText('Smaragd célszám: 96%', { exact: true }).waitFor();
  await button('KM-engedély visszavonása').click();
  await button('Formula megadása (KM)').waitFor();
  await button('Véglegesítés').click();
  await page.waitForFunction(() => !JSON.parse(localStorage.getItem('kaosz-karakterek'))[0].magic.acquisitions
    .some(entry => entry.spellId === 'official:vizpermet'));
  await button('Szerkesztés').click();
  await codex.selectOption('Azúr');
  await magic.getByRole('checkbox', { name: /jóváhagyta a szakosodás módosítását/ }).check();
  await button('Véglegesítés').click();
  await assertArt('Azúr', 'orveny.webp');
  await photo('azur');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'] });
  try {
    for (const [width, height] of [[320, 700], [390, 844], [1440, 900]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500 });
      page.setDefaultTimeout(7000);
      await verify(page, width);
      console.log(`PASS ${width}×${height}`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
