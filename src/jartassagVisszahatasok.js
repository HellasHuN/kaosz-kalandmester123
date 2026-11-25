import { specialization } from "./jartassagSzakosodasok.js";
import { gilfFreeTheory } from "./gilfMagia.js";

// Alapkönyv, 123–125. oldal. Minden jelölt pont egyszer jár az adott szintért.
const shared = [
  ["Fizikum", "Állattenyésztés", "Aszkézis", "Harcőrület", "Két fegyver használata"],
  ["Rátermettség", "Akrobatika", "Cselezés", "Hátbaszúrás", "Lefegyverzés", "Lopakodás", "Lovaglás", "Ugrás"],
  ["Tudat", "Csapdakeresés/Rejtekajtó keresés", "Hallgatózás", "Hasbeszélés", "Orvoslás"],
  ["Esszencia", "Esszenciapajzs-aktivizálás"],
  ["Erő", "Bányászat", "Birkózás", "Fegyverhajítás", "Fegyvertörés", "Feldöntés", "Hajítás", "Pusztító csapás"],
  ["Szívósság", "Földművelés", "Hajózás", "Halászat", "Kifárasztás", "Kitartó futás", "Verekedés (Ökölharc)", "Vértviselet"],
  ["Ügyesség", "Bűvészet", "Falmászás", "Hamisítás", "Rejtőzés"],
  ["Reflex", "Csapdák eltávolítása", "Követés/Lerázás"],
  ["Intelligencia", "Számtan"],
  ["Lelkierő", "Emberismeret", "Érzelmi kontroll", "Hadvezetés", "Szónoklás"],
];
const outer = [
  ["Intelligencia", "Álcázás", "Állatismeret", "Anatómia/Élettan", "Fegyverismeret", "Gyógynövény ismeret",
    "Helyismeret", "Legendaismeret", "Méregismeret", "Mértan", "Stratégia", "Természetismeret", "Tolvajnyelv"],
  ["Lelkierő", "Alkudozás", "Csapdakészítés", "Idomítás", "Meggyőzés", "Sebkötözés", "Szerencsejáték"],
  ["Ügyesség", "Csomózás", "Gyógyszerkészítés", "Hangutánzás", "Jelbeszéd", "Lóápolás/állatok gondozása", "Ötvösmesterség", "Térképészet"],
  ["Tudat", "Diagnózis", "Kereskedés", "Nyomolvasás", "Pénzváltás/kölcsönzés", "Tájékozódás", "Vallatás"],
  ["Reflex", "Életmentés", "Solymászat"],
  ["Esszenciapajzs", "Méregdetekció"],
];
const allLevels = [
  ["Varázserő", "Áldozat", "Mágiahasználat (akadémikus)", "Mágiahasználat (szabad)", "Meditáció"],
  ["Esszenciapajzs", "Diabolika", "Esszenciakontroll"],
  ["Reflex", "Visszatámadás"],
];

export const skillAttributeMilestones = Object.assign({},
  ...[[shared, [5, 7, 9]], [outer, [5, 9]], [allLevels, [5, 6, 7, 8, 9, 10]]]
    .flatMap(([groups, levels]) => groups.flatMap(([attribute, ...skills]) =>
      skills.map((skill) => ({ [skill]: Object.fromEntries(levels.map((level) => [level, attribute])) })))),
  {
    Ápolás: { 7: "Tudat" },
    Barkácsolás: { 5: "Fizikum", 7: "Ügyesség", 9: "Fizikum" },
    Alkímia: { 5: "Esszenciapajzs", 6: "Esszenciapajzs", 7: "Esszenciapajzs", 9: "Esszenciapajzs", 10: "Esszenciapajzs" },
    Csillagászat: { 5: "Esszencia", 6: "Esszencia", 7: "Esszencia", 9: "Esszencia", 10: "Esszencia" },
    Értékbecslés: { 9: "Tudat" },
    Esés: { 5: "Szívósság", 7: "Reflex", 9: "Szívósság" },
    Esszenciafelszabadítás: { 5: "Esszencia", 6: "Esszenciapajzs", 7: "Esszenciapajzs", 8: "Esszenciapajzs", 9: "Esszencia", 10: "Esszenciapajzs" },
    Esszenciapótlás: { 5: "Esszencia", 7: "Esszencia", 8: "Esszencia", 9: "Esszencia" },
    Etikett: { 7: "Lelkierő" },
    Fájdalomdüh: { 5: "Fizikum", 7: "Lelkierő", 9: "Fizikum" },
    Fájdalomtűrés: { 5: "Szívósság", 7: "Lelkierő", 9: "Fizikum", 10: "Fizikum" },
    Fegyverjavítás: { 5: "Erő", 7: "Rátermettség", 9: "Erő" },
    Fogathajtás: { 5: "Erő", 7: "Fizikum", 9: "Erő" },
    Geográfia: { 7: "Intelligencia" },
    Hitelmélet: { 5: "Tudat", 7: "Esszencia", 8: "Esszencia", 9: "Tudat" },
    Íjászat: { 5: "Lelkierő", 7: "Reflex", 9: "Lelkierő" },
    Koldulás: { 5: "Lelkierő", 7: "Intelligencia", 9: "Tudat" },
    Koncentrálás: { 5: "Esszencia", 6: "Esszencia", 7: "Esszencia", 8: "Varázserő", 9: "Esszencia", 10: "Esszencia" },
    Kovácsmesterség: { 5: "Fizikum", 7: "Erő", 9: "Fizikum" },
    Lélekpajzs: { 5: "Tudat", 7: "Lelkierő", 9: "Esszenciapajzs" },
    Mágiaelmélet: { 5: "Intelligencia", 7: "Esszencia", 8: "Esszencia", 9: "Intelligencia" },
    Mechanika: { 5: "Intelligencia", 7: "Ügyesség", 9: "Intelligencia" },
    Méregkeverés: { 5: "Szívósság", 7: "Intelligencia", 9: "Szívósság" },
    Művészet: { 7: "Tudat" },
    Nyelvtudás: { 7: "Intelligencia" },
    Oktatás: { 5: "Esszencia", 6: "Esszencia", 7: "Esszencia", 9: "Esszencia", 10: "Esszencia" },
    Ősnyelv: { 5: "Varázserő", 7: "Varázserő", 9: "Varázserő" },
    Pajzshasználat: { 5: "Erő", 7: "Szívósság", 9: "Fizikum" },
    Regenerálás: { 5: "Esszencia", 7: "Esszencia", 8: "Esszenciapajzs", 9: "Esszencia" },
    "Szájról olvasás": { 7: "Intelligencia" },
    "Szimultán harc": { 5: "Szívósság", 7: "Szívósság", 8: "Reflex", 9: "Szívósság" },
    Taktika: { 7: "Lelkierő" },
    "Tárgyak fegyverként való használata": { 5: "Reflex", 7: "Fizikum", 9: "Reflex" },
    Tolvajlás: { 5: "Rátermettség", 6: "Rátermettség", 7: "Rátermettség", 9: "Rátermettség", 10: "Rátermettség" },
    Történelemismeret: { 5: "Intelligencia", 7: "Tudat", 9: "Intelligencia" },
    Úszás: { 5: "Fizikum", 7: "Szívósság", 9: "Fizikum" },
    Vadászat: { 5: "Lelkierő", 7: "Szívósság", 9: "Lelkierő" },
    Vakharc: { 5: "Tudat", 7: "Esszencia", 9: "Tudat" },
    "Varázsszer-készítés": { 5: "Varázserő", 7: "Varázserő", 8: "Esszenciapajzs", 9: "Varázserő" },
    "Vért javítás": { 5: "Erő", 7: "Fizikum", 9: "Erő" },
    Zárnyitás: { 5: "Rátermettség", 7: "Reflex", 9: "Rátermettség" },
    Zónérzékelés: { 5: "Esszenciapajzs", 6: "Esszenciapajzs", 7: "Esszenciapajzs", 8: "Varázserő", 9: "Esszenciapajzs", 10: "Esszenciapajzs" },
    Zsongás: { 5: "Tudat", 7: "Varázserő", 9: "Varázserő" },
    Zsonglőrködés: { 5: "Reflex", 6: "Reflex", 7: "Rátermettség", 8: "Reflex", 9: "Reflex", 10: "Reflex" },
  });

export function skillAttributeBonuses(character) {
  const current = character.skills ?? {};
  // The saved attributes of an older character may already include previous increases.
  const baseline = character.skillEffectBaseline ?? current;
  const weaponMilestones = {
    attack: { 5: "Ügyesség", 7: "Fizikum", 9: "Ügyesség" },
    defense: { 5: "Reflex", 7: "Reflex", 8: "Esszenciapajzs", 9: "Reflex" },
  };
  function ranks(skills) {
    const totals = { ...skills };
    if (character.race === "Gilf") {
      totals.Mágiaelmélet = Math.max(totals.Mágiaelmélet ?? 0, totals[gilfFreeTheory] ?? 0);
    }
    for (const [name, level] of Object.entries(skills)) {
      const item = specialization(name);
      if (!item) continue;
      const key = item.branch ? `Fegyverforgatás:${item.branch}` : item.base;
      totals[key] = Math.max(totals[key] ?? 0, level);
    }
    return totals;
  }
  const active = ranks(current);
  const previousRanks = ranks(baseline);
  const bonuses = {};
  for (const [name, milestones] of Object.entries({ ...skillAttributeMilestones,
    "Fegyverforgatás:attack": weaponMilestones.attack, "Fegyverforgatás:defense": weaponMilestones.defense })) {
    const rank = active[name] ?? 0;
    const previous = previousRanks[name] ?? 0;
    for (const [level, attribute] of Object.entries(milestones)) {
      if (previous < Number(level) && rank >= Number(level)) bonuses[attribute] = (bonuses[attribute] ?? 0) + 1;
    }
  }
  return bonuses;
}
