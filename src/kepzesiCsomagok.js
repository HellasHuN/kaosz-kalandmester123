import { academicTheoryRank, generalTheory, legacyTheoryNames } from "./teszt/academic.js";
import { codexTheorySkills } from "./jpKoltsegek.js";
import { gilfStartingSkillCap } from "./gilfMagia.js";
import { baseSkillName, specialization, specializationNames, weaponTrainingRestriction } from "./jartassagSzakosodasok.js";

const academic = "Mágiahasználat (akadémikus)";
const release = "Esszenciafelszabadítás";
const shield = "Esszenciapajzs-aktivizálás";
const anatomy = "Anatómia/Élettan";
const healing = { Diagnózis: 3, Orvoslás: 3, Regenerálás: 3, Sebkötözés: 3, [anatomy]: 3, Ápolás: 3 };
const weapons = (label, levels, group) => ({ label, levels, group });
const theory = (level, forbidBlack = false) => ({ label: "Oktatott kódex", level, kind: "theory", forbidBlack });

export const trainingPackages = {
  yennon: { name: "Mark’yhennon Dicsősége Egyház", price: 1200, pages: "64", church: true,
    skills: { Meggyőzés: 2, [shield]: 2 }, requirements: "Mark’yhennon hite és vándor Hitvető szerep.",
    effects: "Egyházi segítség és küldöttkérés. Az Arany, Ámbra, Fekete és Smaragd kódex tiltott." },
  druid: { name: "Zhénia Druida Egyháza", price: 1000, pages: "64–65", church: true,
    skills: { Természetismeret: 2, Állatismeret: 2 }, requirements: "Zhénia hite és a kongregáció szabályainak elfogadása.",
    effects: "Smaragd, Azúr és Alabástrom papi kódex, feltételes isteni segítség." },
  yvorl: { name: "Yvorl Igaz Temploma", price: 1000, pages: "65", affiliation: "yvorl",
    skills: { Diabolika: 2, Fájdalomtűrés: 2 }, requirements: "Yvorl hite és hűség az Igaz Templomhoz.",
    effects: "Papi küldöttkérés és a Sötét Ajándék lehetősége." },
  maldib: { name: "Maldib (Szakadár) Káoszegyház", price: 1000, pages: "65", affiliation: "yvorl",
    skills: { Rejtőzés: 3, Álcázás: 2, Hátbaszúrás: 1 }, requirements: "Yvorl hite és a szakadár egyházhoz tartozás.",
    effects: "Papi küldöttkérés. A leírás szerint Yvorl itt nem ad Sötét Ajándékot." },
  wanderers: { name: "Szórvány Yvorl-papok", price: 500, pages: "66", affiliation: "yvorl", skills: {},
    requirements: "Egyházon kívüli Yvorl-hívő pap.", effects: "Gyakori Ódon kódex, Yvorl-papi Adományok és küldöttkérés. Fix jártasságot a leírás nem sorol fel." },
  arena: { name: "Veremharcosok", price: 7000, pages: "66–67",
    skills: { Akrobatika: 3, "Két fegyver használata": 3, Esés: 3, Ugrás: 3, Zsonglőrködés: 3,
      "Szimultán harc": 1, Birkózás: 3, Fájdalomdüh: 1, Vakharc: 1 },
    choices: [weapons("Első közelharci fegyver", [4, 4]), weapons("Második közelharci fegyver", [2, 2]),
      { label: "Hajítófegyver", kind: "thrown", level: 2 }],
    requirements: "A kerini gladiátoriskola képzése és a hozzá kapcsolódó kötelezettségek.",
    effects: "Induláskor a felsoroltakon kívüli harci jártasságok a szabály szerinti 3. szintig 30%-kal olcsóbbak, a többi jártasság 20%-kal drágább. Egy ellenféllel harcolva külön bónusz jár." },
  magnoliaOld: { name: "A Magnólia Nővérei – régi boszorkány", affiliation: "magnolia", price: 7000, pages: "68–69",
    skills: { [academic]: 3, [release]: 4, Meditáció: 2, Zónérzékelés: 2, [shield]: 3, ...healing, Életmentés: 1 },
    choices: [theory(3, true), { label: "Művészeti ág", kind: "art", level: 4 }],
    requirements: "A rend háború előtti ága, Salia követése és a rendi életvitel.",
    effects: "A gyógyító jártasságok játék közben 20%-kal olcsóbbak. Az akadémikus mágia Fekete kódexe tiltott." },
  magnoliaNew: { name: "A Magnólia Nővérei – új boszorkány", affiliation: "magnolia", price: 7000, pages: "68–69",
    skills: { [academic]: 3, [release]: 3, Zónérzékelés: 2, [shield]: 3, Diagnózis: 2, Orvoslás: 2,
      Regenerálás: 2, Sebkötözés: 3, [anatomy]: 2, Ápolás: 3 },
    choices: [theory(3), weapons("Tőr", [2, 3], "Tőrök")],
    requirements: "A rend háború utáni boszorkány ága, Saliah és Seliah követése.",
    effects: "A gyógyító jártasságok játék közben 10%-kal olcsóbbak. A mágiahasználatot a rendi erkölcs korlátozza." },
  magnoliaKnight: { name: "A Magnólia Nővérei – hölgylovag", affiliation: "magnolia", price: 7000, pages: "68–69",
    women: true, skills: { Sebkötözés: 3, [shield]: 3, Vértviselet: 3, Lovaglás: 5, "Lóápolás/állatok gondozása": 3 },
    choices: [weapons("Első könnyű fegyver", [3, 3]), weapons("Második könnyű fegyver", [3, 3]),
      weapons("Fegyver a Visszatámadáshoz", [3], "Visszatámadás"), weapons("Fegyver a Cselezéshez", [3], "Cselezés")],
    requirements: "Női karakter, a háború utáni lovagi ág. A fegyverek könnyű fegyverek vagy könnyű kopják.",
    effects: "Rendi erkölcs és szolgálat, akadémikus mágia legfeljebb alapszinten a leírás szerint." },
  liathar: { name: "Liathar Leányai", price: 3000, pages: "69–71", women: true,
    skills: { [shield]: 4, Jelbeszéd: 3 }, requirements: "Női karakter, beszervezés a Mesélővel egyeztetve.",
    effects: "A rendi álcázáshoz tartozó előnyökről és hátrányokról a Mesélő dönt." },
  heraldKnight: { name: "A Kín Hírnökei – Kislovag", affiliation: "herald", price: 5000, pages: "71–73",
    skills: { Fegyverismeret: 1, [anatomy]: 1, [release]: 1, [shield]: 1, Vértviselet: 1, Lovaglás: 3,
      "Lóápolás/állatok gondozása": 1, "Írás/Olvasás": 1 },
    choices: [weapons("Első közelharci fegyver", [1, 1]), weapons("Második közelharci fegyver", [2, 2]),
      { label: "Íjászati fegyver", kind: "bow", level: 1 }, weapons("Fegyver a Pusztító csapáshoz", [1], "Pusztító csapás")],
    requirements: "Ordinishez hű, beavatás előtti kislovag.", effects: "A beavatás és az Elhivatottság későbbi, illetve mesélői döntés." },
  heraldAdept: { name: "A Kín Hírnökei – Adeptus", affiliation: "herald", price: 5000, pages: "71–73",
    skills: { [academic]: 2, [release]: 2, Zónérzékelés: 1, [shield]: 2, "Írás/Olvasás": 2,
      Fájdalomtűrés: 4, Aszkézis: 2, Ősnyelv: 1, Alkímia: 2, Gyógyszerkészítés: 2,
      "Gyógynövény ismeret": 2, "Érzelmi kontroll": 5 },
    choices: [theory(2)], requirements: "Ordinishez hű, beavatás előtti akadémikus adeptus.",
    effects: "Beavatás és Elhivatottság csak a forrásban leírt feltételekkel." },
};

export function packageChoiceOptions(choice) {
  if (choice.kind === "theory") return Object.keys(codexTheorySkills).filter((name) => !choice.forbidBlack || name !== "Fekete");
  return specializationNames.filter((name) => {
    const item = specialization(name);
    if (choice.kind === "art") return item.base === "Művészet";
    if (choice.kind === "thrown") return item.base === "Fegyverhajítás";
    if (choice.kind === "bow") return item.base === "Íjászat";
    if (!choice.levels || item.branch || item.requiresWeapon || item.base !== "Fegyverforgatás") return false;
    return choice.group !== "Tőrök" || item.group === "Tőrök";
  });
}

function legacyTheoryChoice(choice, value) {
  return choice.kind === "theory" && packageChoiceOptions(choice).some(codex => codexTheorySkills[codex] === value);
}

function validPackageChoice(choice, value) {
  return packageChoiceOptions(choice).includes(value) || legacyTheoryChoice(choice, value);
}

export function packageSkills(id, record) {
  const entry = trainingPackages[id];
  const result = { ...entry?.skills };
  for (const [index, choice] of (entry?.choices ?? []).entries()) {
    const name = record?.choices?.[index];
    if (!validPackageChoice(choice, name)) continue;
    if (choice.kind === "theory") result[legacyTheoryChoice(choice, name) ? name : generalTheory] = choice.level;
    else if (!choice.levels) result[name] = choice.level;
    else if (choice.levels.length === 1) result[`${choice.group} – ${name.split(" – ")[1]}`] = choice.levels[0];
    else {
      result[name] = 1;
      for (const [index, branch] of ["támadás", "védekezés"].entries()) {
        if (choice.levels[index] > 1) result[`${name} · ${branch}`] = choice.levels[index];
      }
    }
  }
  return result;
}

export function packageError(character, id, record) {
  const entry = trainingPackages[id];
  if (!entry || (entry.women && character.gender !== "Nő")) return "A karakter nem felel meg a csomag belépési feltételeinek.";
  if (record.approved !== true) return "A képzést és a belépési feltételeket a Mesélőnek jóvá kell hagynia.";
  const choices = entry.choices ?? [];
  if (choices.some((choice, index) => !validPackageChoice(choice, record.choices?.[index]))) return "Minden szakosodást válassz ki.";
  const weapons = choices.flatMap((choice, index) => choice.levels?.length === 2 ? [record.choices[index]] : []);
  if (new Set(weapons).size !== weapons.length) return "A két fegyver különböző legyen.";
  if (choices.some((choice, index) => choice.levels?.length === 1 && !weapons.includes(record.choices[index]))) {
    return "A harci technikához válassz a csomag közelharci fegyverei közül.";
  }
  return Object.entries(packageSkills(id, record)).map(([name, level]) =>
    level > gilfStartingSkillCap(character, name) ? `${name}: a csomag szintje meghaladja a gilf induló faji korlátot.`
      : weaponTrainingRestriction(character, name)).find(Boolean) ?? "";
}

export function packageGrants(packages = {}) {
  const result = {};
  for (const [id, record] of Object.entries(packages)) {
    if (!trainingPackages[id] || record.approved !== true) continue;
    for (const [name, level] of Object.entries(packageSkills(id, record))) result[name] = Math.max(result[name] ?? 0, level);
  }
  return result;
}

export function packageJp(packages = {}) {
  return Object.entries(packages).reduce((sum, [id, record]) =>
    sum + (record.approved === true && trainingPackages[id] ? (record.paidJp ?? trainingPackages[id].price) : 0), 0);
}

export function addTrainingPackage(character, id, record, purchased, racialGrants, remaining) {
  const packages = character.trainingPackages ?? {};
  const entry = trainingPackages[id];
  const error = packageError(character, id, record);
  if (error) return { error };
  if (packages[id] || Object.keys(packages).some((key) =>
    entry.affiliation && trainingPackages[key]?.affiliation === entry.affiliation)) {
    return { error: "A választott tagság ütközik a meglévő tagsággal." };
  }
  const supplied = packageSkills(id, record);
  const existing = packageGrants(packages);
  if (Object.keys(supplied).some((name) => purchased[name])) {
    return { error: "A csomag külön megvett jártasságot is tartalmaz. A felvétel előtt rendezd az érintett vásárlást, mert a könyv nem ad átfedési tarifát." };
  }
  if ((Object.keys(packages).length || Object.keys(supplied).some((name) => existing[name] || racialGrants[name])) && !record.overlapApproved) {
    return { error: "Rögzítsd a Mesélő döntését a tagságok vagy szintek átfedéséről és a teljes csomagárakról." };
  }
  if (remaining == null || remaining < entry.price) return { error: "Nincs elég Jp a csomaghoz." };
  return { packages: { ...packages, [id]: { ...record, paidJp: entry.price } } };
}

export function removeTrainingPackage(packages, id, purchased) {
  const next = { ...packages };
  delete next[id];
  const retained = packageGrants(next);
  if (Object.entries(packageSkills(id, packages[id])).some(([name, level]) => {
    if (legacyTheoryNames.has(name) && purchased[generalTheory] > level) {
      return Math.max(academicTheoryRank({ ...purchased, [generalTheory]: 0 }), academicTheoryRank(retained)) < level;
    }
    return purchased[name] > level && (retained[name] ?? 0) < level;
  })) {
    return { error: "Előbb rendezd a csomagszintre épülő, külön vásárolt fejlesztést." };
  }
  return { packages: next };
}

// Alapkönyv 104–109. o., A vér jártasságai.
const combatSkills = new Set(["Fegyverforgatás", "Fegyverhajítás", "Íjászat", "Pajzshasználat",
  "Tárgyak fegyverként való használata", "Két fegyver használata", "Szimultán harc", "Vértviselet",
  "Fájdalomtűrés", "Fájdalomdüh", "Visszatámadás", "Lefegyverzés", "Fegyvertörés", "Vakharc",
  "Verekedés (Ökölharc)", "Birkózás", "Harcőrület", "Pusztító csapás", "Kifárasztás",
  "Fegyverismeret", "Taktika", "Stratégia", "Hadvezetés", "Cselezés", "Feldöntés"]);

export function packageCreationModifier(character, name, level) {
  const record = character.trainingPackages?.arena;
  if (!record?.approved || Object.hasOwn(packageSkills("arena", record), name)) return 0;
  return combatSkills.has(baseSkillName(name)) ? (level <= 3 ? -30 : 0) : 20;
}

const healingSkills = new Set([...Object.keys(healing), "Életmentés", "Gyógynövény ismeret", "Gyógyszerkészítés"]);

export function packagePlayModifier(character, name) {
  if (!healingSkills.has(name)) return 0;
  if (character.trainingPackages?.magnoliaOld?.approved) return -20;
  return character.trainingPackages?.magnoliaNew?.approved ? -10 : 0;
}
