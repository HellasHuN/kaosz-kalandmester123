// Run against npm run preview with playwright-core and Chromium installed.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

const legacy = { id: 'legacy', catalogId: 'legacy-kit', quantity: '2', values: { old: 'value' }, custom: true };
const draft = {
  id: 'draft', name: 'Felszerelés próba', race: 'Ember', age: '25', stats: [55, 55, 55, 55, 50],
  jp: 10000, playStatus: 'draft', statAllocationVersion: 1,
  equipment: { items: [legacy], notes: 'Régi megjegyzés' },
};

async function verify(page, width) {
  let acceptNext = true;
  page.on('dialog', async (dialog) => {
    await (acceptNext ? dialog.accept() : dialog.dismiss());
    acceptNext = true;
  });
  const button = (name) => page.getByRole('button', { name, exact: true });
  const search = page.getByRole('searchbox');
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('kaosz-karakterek'))[0]);
  const open = async () => {
    await button('Karakterbetöltés').click();
    await button('Karakter szerkesztése').click();
    await button('Felszerelés').click();
  };
  await page.goto(process.env.PREVIEW_URL || 'http://localhost:4173/');
  await page.evaluate((record) => localStorage.setItem('kaosz-karakterek', JSON.stringify([record])), draft);
  await page.reload();
  await open();
  assert.equal(await button('Szerkesztés').count(), 0);
  assert.equal(await button('Alkalmazás a készülő karakterre').count(), 0);
  await page.getByRole('rowheader', { name: /legacy-kit/ }).waitFor();
  assert.equal(await page.getByLabel('Megjegyzések').inputValue(), 'Régi megjegyzés');
  await search.fill('vért');
  await button('Bőrruha').waitFor();
  await search.fill('Nemezvért');
  await button('Nemezvért').click();
  assert.equal(await page.getByRole('rowheader', { name: /Nemezvért/ }).count(), 0);
  const pending = page.getByRole('region', { name: 'Kiválasztva: Nemezvért' });
  const selects = pending.getByRole('combobox');
  await button('Hozzáadás').click();
  await page.getByRole('status').filter({ hasText: /pontosítandó/ }).waitFor();
  const qty = pending.getByRole('spinbutton');
  await qty.fill('0');
  await button('Hozzáadás').click();
  await page.getByRole('status').filter({ hasText: /pozitív egész/ }).waitFor();
  await qty.fill('2');
  for (const select of await selects.all()) await select.selectOption({ index: 1 });
  await pending.getByRole('checkbox').check();
  await (width < 500 ? button('Hozzáadás').tap() : button('Hozzáadás').click());
  const armor = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: /Nemezvért/ }) });
  await armor.waitFor();
  await armor.getByRole('spinbutton').fill('0');
  assert.equal(await armor.getByRole('spinbutton').inputValue(), '2');
  await armor.getByRole('spinbutton').fill('3');
  await armor.getByRole('combobox').first().selectOption({ index: 2 });
  await armor.getByRole('checkbox').uncheck();
  await page.getByLabel('Megjegyzések').fill('Friss megjegyzés');
  await search.fill('Vödör');
  await button('Vödör').click();
  await button('Hozzáadás').click();
  await button('Vödör eltávolítása').click();
  assert.equal(await page.getByRole('rowheader', { name: /Vödör/ }).count(), 0);
  assert.deepEqual(await read(), draft);
  await button('Jártasságok').click();
  await button('Felszerelés').click();
  assert.equal(await armor.getByRole('spinbutton').inputValue(), '3');
  assert.equal(await page.getByLabel('Megjegyzések').inputValue(), 'Friss megjegyzés');
  acceptNext = false;
  await button('Beállítások').click();
  await armor.waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await button('KARAKTER MENTÉSE').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('kaosz-karakterek'))[0].equipment.notes === 'Friss megjegyzés');
  const saved = await read();
  assert.deepEqual(saved.equipment.items[0], legacy);
  assert.equal(saved.equipment.items[1].quantity, 3);
  assert.equal(saved.equipment.items[1].values.speedModifier, 2);
  assert.equal(saved.equipment.items[1].equipped, false);
  assert.equal(saved.jp, draft.jp);
  await button('KARAKTER MENTÉSE').click();
  assert.equal((await read()).equipment.notes, 'Friss megjegyzés');
  await page.reload();
  await open();
  assert.equal(await armor.getByRole('spinbutton').inputValue(), '3');
  assert.deepEqual(await read(), saved);

  await button('Mágia').click();
  await button('Szerkesztés').click();
  await button('Alkalmazás a készülő karakterre').waitFor();
  await button('Mégse').click();
  await button('Mentett karakterek').click();
  await button('Játékba helyezés').click();
  await button('Karakterlap megnyitása').click();
  await button('Felszerelés').click();
  await button('Szerkesztés').click();
  const armorQuantity = page.getByLabel('Nemezvért darabszáma');
  await armorQuantity.fill('4');
  await button('Mégse').click();
  assert.equal((await read()).equipment.items[1].quantity, 3);
  await button('Szerkesztés').click();
  await armorQuantity.fill('4');
  await button('Véglegesítés').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('kaosz-karakterek'))[0].equipment.items[1].quantity === 4);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const [width, height] of [[320, 700], [390, 844], [1440, 900]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500 });
      page.setDefaultTimeout(5000);
      await verify(page, width);
      console.log(`PASS ${width}×${height}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
