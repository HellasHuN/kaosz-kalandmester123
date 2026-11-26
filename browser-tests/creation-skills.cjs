// Run against npm run preview with playwright-core and Chromium installed.
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const seed = {id:'historical',name:'Jártasság próba',race:'Ember',age:'25',statAllocationVersion:1,
 stats:[55,55,55,55,50],jp:50000,playStatus:'draft',
 skills:{'Elhivatottság*':1,'Esés':2,'Ugrás':2,'Zsonglőrködés':2},
 skillJpPaid:{'Elhivatottság*':400,'Esés':222},skillJpByLevel:{'Elhivatottság*':[400],'Esés':[111,111]},
 startingSkillApprovals:{exceptions:{'Nyomolvasás':{approved:true,level:5}}}};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
 try {
  for(const [width,height] of [[320,700],[390,844],[1440,900]]) {
   const page=await browser.newPage({viewport:{width,height},isMobile:width<500,hasTouch:width<500});
   page.setDefaultTimeout(5000);
   const errors=[],alerts=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('dialog',async d=>{alerts.push(d.message());await d.accept();});
   const button=name=>page.getByRole('button',{name,exact:true});
   const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kaosz-karakterek')));
   const balance=()=>page.locator('.creation-skill-balance strong').innerText().then(Number);
   const row=name=>page.getByRole('row').filter({has:page.getByRole('rowheader',{name:new RegExp('^'+name)})});
   const search=page.getByRole('searchbox',{name:'Új jártasság keresése'});
   const choose=async name=>{await search.fill(name);await button(name).click();};
   const level=page.getByLabel('Választott szint');
   const add=async()=>width<500?button('Hozzáadás').tap():button('Hozzáadás').click();
   async function assertNoOverflow() {
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth &&
      [...document.querySelectorAll(".creation-skills .skills-reference-scroll")]
        .every((element) => element.scrollWidth <= element.clientWidth + 1));
    assert.ok(fits, "The page and acquired-skills table fit the viewport");
   }
   const open=async()=>{await button('Karakterbetöltés').click();await button('Karakter szerkesztése').click();await button('Jártasságok').click();};
   await page.goto(process.env.PREVIEW_URL || 'http://localhost:4173/');
   await page.evaluate(record=>localStorage.setItem('kaosz-karakterek',JSON.stringify([record])),seed);
   await page.reload();
   await open();
   assert.deepEqual(await read(),[seed]);
   assert.match(await row('Esés').innerText(),/222/);
   assert.equal(await row('Elhivatottság').count(),0);
   assert.equal(await page.getByRole('region',{name:'Elhivatottság',exact:true}).count(),1);
   await search.fill('Elhivatottság');
   assert.equal(await button('Elhivatottság*').count(),0);
   assert.equal(await page.getByText('Nincs választható találat.').count(),1);
   const initial=await balance();
   await choose('Akrobatika');
   assert.equal(await row('Akrobatika').count(),0);
   assert.equal(await balance(),initial);
   assert.equal(await level.locator('option').count(),10);
   await level.selectOption('10');
   assert.equal(await balance(),initial);
   await add();
   await page.getByRole('status').filter({hasText:/előfeltétele/}).waitFor();
   assert.equal(await level.inputValue(),'10');
   assert.equal(await row('Akrobatika').count(),0);
   await level.selectOption('2');
   const cost=Number((await page.locator('.creation-skill-pending p strong').innerText()).split(' ')[0]);
   assert.ok(cost>0);
   await button('Mégse').click();
   assert.equal(await row('Akrobatika').count(),0);
   assert.equal(await balance(),initial);
   await choose('Akrobatika');
   await level.selectOption('2');
   await add();
   assert.equal(await row('Akrobatika').getByRole('combobox').inputValue(),'2');
   assert.equal(await balance(),initial-cost);
   await button('Akrobatika törlése').click();
   assert.equal(await balance(),initial);
   await choose('Nyomolvasás');
   await level.selectOption('10');
   await assertNoOverflow();
   await add();
   assert.equal(await row('Nyomolvasás').getByRole('combobox').inputValue(),'10');
   await button('KARAKTER ELLENŐRZÉSE').click();
   await button('KARAKTER MENTÉSE').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kaosz-karakterek'))[0].skills.Nyomolvasás===10);
   const [saved]=await read();
   assert.deepEqual(saved.startingSkillApprovals,seed.startingSkillApprovals);
   assert.deepEqual(saved.skillJpByLevel.Esés,[111,111]);
   assert.equal(saved.skills['Elhivatottság*'],1);
   await page.reload();
   await open();
   assert.equal(await row('Nyomolvasás').getByRole('combobox').inputValue(), '10');
   assert.deepEqual(await read(), [saved]);
   await page.evaluate(record=>localStorage.setItem('kaosz-karakterek',JSON.stringify([record])),{...seed,jp:0});
   await page.reload();
   await open();
   await choose('Nyomolvasás');
   await level.selectOption('10');
   await add();
   await page.getByRole('status').filter({hasText:/Nincs elég elkölthető Jp/}).waitFor();
   assert.equal(await level.inputValue(),'10');
   assert.equal(await row('Nyomolvasás').count(),0);
   assert.equal(await balance(),0);
   await assertNoOverflow();
   assert.deepEqual(errors,[]);
   console.log('PASS '+width+'×'+height,alerts);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
