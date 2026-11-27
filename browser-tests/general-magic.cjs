// Run against npm run preview with playwright-core and Chromium installed.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

const character = {
  id: 'mage', name: 'Mágia próba', race: 'Ember', age: '25', stats: [55, 55, 55, 55, 50],
  jp: 10000, playStatus: 'draft', statAllocationVersion: 1,
  skills: { Mágiaelmélet: 7, 'Mágiahasználat (akadémikus)': 7, 'Mágiahasználat (szabad)': 7,
    Esszenciafelszabadítás: 10 },
  magic: { activeEp: 40, shield: 6, acquisitions: [
    { spellId: 'official:tuzkozpont', form: 'academic' },
    { spellId: 'official:magia-erzekelese', form: 'sacred', ep: 5 },
  ] },
};

async function verify(page) {
  let acceptDialog = true;
  page.on('dialog', async (dialog) => {
    await (acceptDialog ? dialog.accept() : dialog.dismiss());
    acceptDialog = true;
  });
  const button = (name) => page.getByRole('button', { name, exact: true });
  const magic = page.locator('.magic-panel');
  const forms = magic.getByRole('navigation', { name: 'Mágiaformák' });
  const search = magic.getByRole('searchbox');
  const codex = magic.getByRole('combobox', { name: /^Kódex/ });
  const type = magic.getByRole('combobox', { name: /^Varázslattípus/ });
  const activeEp = magic.getByRole('spinbutton', { name: /^Aktuális aktív Ep/ });
  const gm = magic.getByRole('checkbox', { name: 'KM-katalógus' });
  const tűzközpont = button('Tűzközpont kiválasztása');
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('kaosz-karakterek'))[0]);
  async function assertResources(ep) {
    const resources = magic.getByRole('region', { name: 'Erőforrások' });
    await resources.getByText('Szabad Ep a kikérések után', { exact: true }).waitFor();
    assert.equal(await resources.locator('[data-resource="available"] strong').innerText(), String(ep - 5));
    assert.equal(await resources.locator('[data-resource="release"] strong').innerText(), '55 Ep');
  }
  async function checkCatalog(ep) {
    await assertResources(ep);
    await forms.getByRole('button', { name: 'Szabad', exact: true }).click();
    await magic.getByRole('region', { name: 'Szabad mágia', exact: true }).waitFor();
    assert.equal(await magic.getByRole('region', { name: 'Akadémikus mágia', exact: true }).count(), 0);
    await forms.getByRole('button', { name: 'Akadémikus', exact: true }).click();
    await codex.selectOption('Skarlát');
    await type.selectOption('speciális');
    await search.fill('Tűzközpont');
    await tűzközpont.click();
    await magic.getByRole('heading', { name: 'Tűzközpont', exact: true }).waitFor();
    assert.equal(await tűzközpont.getAttribute('aria-pressed'), 'true');
    assert.equal(await button('Rögzítés törlése').count(), 0);
    assert.equal(await magic.locator('.scarlet-grimoire').count(), 0);
    await type.selectOption('személyre ható');
    await magic.getByText('Nincs megjeleníthető találat.').waitFor();
    await button('Megjelenítési szűrők törlése').click();
    assert.equal(await type.inputValue(), '');
    assert.equal(await codex.inputValue(), '');
    assert.equal(await search.inputValue(), '');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }

  await page.goto(process.env.PREVIEW_URL || 'http://localhost:4173/');
  await page.evaluate((record) => localStorage.setItem('kaosz-karakterek', JSON.stringify([record])), character);
  await page.reload();
  await button('Karakterbetöltés').click();
  await button('Karakter szerkesztése').click();
  await button('Mágia').click();
  await checkCatalog(40);
  await button('Szerkesztés').click();
  await activeEp.fill('35');
  await assertResources(35);
  await button('Alkalmazás a készülő karakterre').click();
  assert.equal((await read()).magic.activeEp, 40);
  await button('Felszerelés').click();
  await button('Mágia').click();
  await assertResources(35);
  await button('KARAKTER MENTÉSE').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('kaosz-karakterek'))[0].magic.activeEp === 35);
  await button('Mentett karakterek').click();
  await button('Játékba helyezés').click();
  await button('Főmenü').click();
  await button('Kalandmester').click();
  await button('Karakterlap megnyitása').click();
  await button('Mágia').click();
  await checkCatalog(35);
  await button('Szerkesztés').click();
  assert.equal(await forms.getByRole('button', { name: 'Vadmágia', exact: true }).count(), 0);
  await gm.check();
  await forms.getByRole('button', { name: 'Vadmágia', exact: true }).click();
  await magic.locator('.grimoire-form-description').getByText(/Szükséges adottság: Spontán mágia/).waitFor();
  await activeEp.fill('30');
  acceptDialog = false;
  await button('Általános').click();
  await assertResources(30);
  await button('Mégse').click();
  await assertResources(35);
  await button('Szerkesztés').click();
  await activeEp.fill('32');
  await button('Véglegesítés').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('kaosz-karakterek'))[0].magic.activeEp === 32);
  assert.deepEqual((await read()).magic.acquisitions, character.magic.acquisitions);
  await button('Szerkesztés').click();
  await forms.getByRole('button', { name: 'Akadémikus', exact: true }).click();
  await search.fill('Tűzközpont');
  await tűzközpont.click();
  await magic.getByRole('checkbox', { name: /A helyzeti feltételek/ }).check();
  await magic.getByLabel(/Kézi k100/).fill('1');
  await button('Kézi dobás elbírálása').click();
  await magic.getByRole('status').filter({ hasText: /Sikeres létrehozási próba/ }).waitFor();
  const log = button('Sikeres elmondás és Ep-levonás rögzítése');
  await log.click();
  assert.equal(await log.count(), 0);
  await assertResources(22);
  assert.equal((await read()).magic.activeEp, 32);
  await search.fill('Lánghívás');
  await button('Lánghívás kiválasztása').click();
  await button('Rögzítés: megtanult formula').click();
  await button('Rögzítés törlése').waitFor();
  await button('Véglegesítés').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('kaosz-karakterek'))[0].magic.activeEp === 22);
  assert.equal((await read()).magic.castingLog.length, 1);
  assert.ok((await read()).magic.acquisitions.some(({ spellId }) => spellId === 'official:langhivas'));
  await button('Beállítások').click();
  await button('Vissza a főmenübe').click();
  await button('Játék').click();
  await button('Karakterlap megnyitása').click();
  await button('Mágia').click();
  await button('Szerkesztés').click();
  await magic.getByLabel(/Alapkódex/).selectOption('Azúr');
  await button('Véglegesítés').click();
  assert.equal((await read()).magic.academicSpecialization ?? null, null);
  await magic.getByRole('group', { name: /Akadémikus szakosodás/ }).getByRole('button', { name: 'KM jóváhagyása (TESZT)', exact: true }).click();
  await button('Véglegesítés').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('kaosz-karakterek'))[0].magic.academicSpecialization?.codex === 'Azúr');
  assert.deepEqual((await read()).magic.academicSpecialization, { codex: 'Azúr' });
  await page.reload();
  await button('Karakterbetöltés').click();
  await button('Karakterlap megnyitása').click();
  await button('Mágia').click();
  await assertResources(22);

  await button('Beállítások').click();
  await button('Vissza a főmenübe').click();
  await button('Karakteralkotás').click();
  await page.getByPlaceholder('Karakter neve').fill('Új mágikus próba');
  await page.getByRole('region', { name: 'Karakter adatai' }).getByLabel(/^Faj/).selectOption('Ember');
  await page.getByLabel(/^Életkor/).selectOption('25');
  const redistribute = button('Főértékek újraelosztása a kerethez');
  if (await redistribute.count()) await redistribute.click();
  await button('Mágia').click();
  await magic.getByRole('region', { name: 'Praktikus mágia' }).waitFor();
  await button('Szerkesztés').click();
  await activeEp.fill('10');
  await button('Alkalmazás a készülő karakterre').click();
  await button('KARAKTER MENTÉSE').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('kaosz-karakterek'))
    .some((entry) => entry.name === 'Új mágikus próba' && entry.magic.activeEp === 10));
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const [width, height] of [[320, 700], [390, 844], [1440, 900]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500 });
      page.setDefaultTimeout(5000);
      await verify(page);
      console.log(`PASS ${width}×${height}`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
