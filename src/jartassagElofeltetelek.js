// A 97. oldal szerint minden szükséges jártasságnak el kell érnie a cél szintjét.
export const verifiedPrerequisites = {
  "Orvoslás": { skills: ["Anatómia/Élettan"], page: 98 },
  "Regenerálás": { skills: ["Orvoslás", "Sebkötözés"], page: 98 },
  "Életmentés": { skills: ["Orvoslás"], page: 99 },
  "Értékbecslés": { skills: ["Számtan"], page: 100 },
  "Alkudozás": { skills: ["Értékbecslés"], page: 100 },
  "Meggyőzés": { skills: ["Emberismeret"], page: 100 },
  "Idomítás": { skills: ["Állatismeret"], page: 100 },
  "Fegyverjavítás": { skills: ["Fegyverismeret"], page: 103 },
  "Vért javítás": { skills: ["Vértviselet"], page: 103 },
  "Fájdalomtűrés": { skills: ["Koncentrálás"], page: 106 },
  "Titkosírás": { skills: ["Írás/Olvasás"], page: 119 },
  "Szónoklás": { skills: ["Meggyőzés"], page: 119 },
  Solymászat: { skills: ["Állatismeret"], page: 101 },
  Vadászat: { skills: ["Állatismeret", "Természetismeret"], page: 101 },
  Akrobatika: { skills: ["Esés", "Ugrás", "Zsonglőrködés"], page: 102 },
  Fegyvertörés: { skills: ["Fegyverismeret"], page: 107 },
  "Pusztító csapás": { skills: ["Anatómia/Élettan"], page: 108 },
  Stratégia: { skills: ["Taktika"], page: 108 },
  Hadvezetés: { skills: ["Stratégia"], page: 109 },
  "Követés/Lerázás": { skills: ["Lopakodás"], page: 110 },
  Vallatás: { skills: ["Anatómia/Élettan", "Emberismeret"], page: 112 },
  Szerencsejáték: { skills: ["Bűvészet"], page: 112 },
  Méregismeret: { skills: ["Gyógynövény ismeret"], page: 112 },
  Méregkeverés: { skills: ["Méregismeret", "Anatómia/Élettan"], page: 112 },
  Méregdetekció: { skills: ["Méregismeret"], page: 113 },
  Áldozat: { skills: ["Elhivatottság*"], page: 114 },
  Esszenciapótlás: { skills: ["Esszenciafelszabadítás"], page: 115 },
  Alkímia: { skills: ["Számtan"], page: 116 },
  Diabolika: { skills: ["Ősnyelv", "Mértan"], page: 116 },
  Zsongás: { skills: ["Koncentrálás"], page: 116 },
  Lélekpajzs: { skills: ["Koncentrálás"], page: 116 },
  Mértan: { skills: ["Számtan"], page: 117 },
  Térképészet: { skills: ["Mértan", "Geográfia"], page: 117 },
  Mechanika: { skills: ["Mértan"], page: 118 },
  Csillagászat: { skills: ["Mértan"], page: 118 },
  Építészet: { skills: ["Mértan"], page: 118 },
};

export const conditionalPrerequisites = {
  Zárnyitás: { alternatives: ["Barkácsolás", "Mechanika"], page: 111 },
  Csapdakészítés: { alternatives: ["Barkácsolás", "Mechanika"], page: 111 },
  "Csapdák eltávolítása": { alternatives: ["Barkácsolás", "Mechanika"], page: 111 },
  Aszkézis: { alternatives: ["Mágiahasználat (akadémikus)", "Mágiahasználat (szabad)", "Elhivatottság*"], page: 114 },
  Meditáció: { alternatives: ["Mágiahasználat (akadémikus)", "Mágiahasználat (szabad)"], page: 114 },
  Zónérzékelés: { alternatives: ["Mágiahasználat (akadémikus)", "Mágiahasználat (szabad)", "Elhivatottság*", "Esszenciakontroll"], page: 115 },
  "Varázsszer-készítés": { alternatives: ["Mágiahasználat (akadémikus)", "Elhivatottság*"], page: 115 },
  "Esszenciapajzs-aktivizálás": { alternatives: ["Esszenciafelszabadítás", "Esszenciakontroll"], page: 116 },
};

const codes = {
  "Anatómia/Élettan": "M/0", "Gyógynövény ismeret": "M/0", "Gyógyszerkészítés": "M/0",
  Ápolás: "Gy", Életmentés: "Gy", Értékbecslés: "M/1", Alkudozás: "Gy", Meggyőzés: "Gy",
  Lovaglás: "Gy", "Lóápolás/állatok gondozása": "M/0", Idomítás: "Gy",
  Fegyverjavítás: "M/1", "Vért javítás": "M/1", Vértviselet: "Gy", Fájdalomtűrés: "M/1",
  Titkosírás: "Gy", Szónoklás: "M/1",
  Stratégia: "M/0", Hadvezetés: "Gy", "Követés/Lerázás": "Gy",
  Vallatás: "M/1", Szerencsejáték: "M/1", Méregismeret: "M/0", Méregkeverés: "M/1",
  Méregdetekció: "M/0", Áldozat: "M/1", Esszenciapótlás: "M/0", Alkímia: "M/0", Diabolika: "M/0",
  Zsongás: "M/1", Lélekpajzs: "M/1", Mértan: "M/0", Térképészet: "M/1", Mechanika: "M/0",
  Csillagászat: "M/0", Építészet: "M/0", Zárnyitás: "M/1", Csapdakészítés: "M/1",
  "Csapdák eltávolítása": "M/1", Aszkézis: "Gy", Meditáció: "M/1", Zónérzékelés: "M/0",
  "Varázsszer-készítés": "Gy", "Esszenciapajzs-aktivizálás": "M/1",
  Diagnózis: "M/0", Orvoslás: "M/0", Regenerálás: "M/1", Sebkötözés: "Gy",
  Fogathajtás: "Gy", Hajózás: "M/1", Barkácsolás: "Gy", Csomózás: "M/0", Hasbeszélés: "Gy",
  Solymászat: "M/1", Galambászat: "Gy", Vadászat: "M/1", Állatismeret: "M/1", Természetismeret: "Gy",
  Helyismeret: "Gy", Nyomolvasás: "Gy", Tájékozódás: "Gy", Akrobatika: "Gy", Úszás: "M/1",
  "Kitartó futás": "Gy", Hajítás: "Gy", Esés: "Gy", Ugrás: "Gy",
  Fegyvertörés: "Gy", "Pusztító csapás": "Gy", Kifárasztás: "Gy", Lefegyverzés: "Gy",
  Vakharc: "M/0", "Verekedés (Ökölharc)": "Gy", Birkózás: "Gy", Harcőrület: "Gy",
  Fegyverismeret: "M/0", Taktika: "Gy", Cselezés: "M/0", Feldöntés: "Gy", Koldulás: "M/1",
  Álcázás: "M/1", Rejtőzés: "M/1", Lopakodás: "Gy", "Szájról olvasás": "Gy",
  Tolvajnyelv: "M/0", Jelbeszéd: "M/0", Hangutánzás: "Gy", Hallgatózás: "Gy", Tolvajlás: "M/1",
  Falmászás: "M/1", "Csapdakeresés/Rejtekajtó keresés": "Gy", Hátbaszúrás: "Gy", Hamisítás: "M/1",
  Mágiaelmélet: "M/0", Hitelmélet: "M/0", "Mágiahasználat (akadémikus)": "M/0", "Mágiahasználat (szabad)": "M/0",
  Esszenciakontroll: "Gy", Esszenciafelszabadítás: "M/1", Koncentrálás: "Gy", Oktatás: "M/1",
  Anyanyelvismeret: "Gy", "Közös nyelv": "M/0", Nyelvtudás: "M/0", Ősnyelv: "M/0",
  "Írás/Olvasás": "M/0", Számtan: "M/0", Geográfia: "M/0", Legendaismeret: "M/0",
  Történelemismeret: "M/0", Heraldika: "M/0", Emberismeret: "M/1", "Érzelmi kontroll": "M/1",
  Művészet: "Gy", Etikett: "M/0",
};

const codexNames = new Set(Object.values(codexTheorySkills));
export function verifiedLearningCode(name) {
  const base = baseSkillName(name);
  if (["Fegyverforgatás", "Fegyverhajítás", "Íjászat"].includes(base)) return "M/1";
  return codes[codexNames.has(name) || name === gilfFreeTheory ? "Mágiaelmélet" : base];
}

export function learningMethods(name, current, foundation) {
  const code = verifiedLearningCode(name);
  const methods = ["mentor"];
  if (foundation === "practice" && current === 1) return methods;
  if (!code || code === "Gy") methods.push("practice");
  if (code === "M/1" && current === 0) methods.push("practice-foundation");
  if ((!code || code === "M/1") && current > 0) methods.push("practice-after-mentor");
  return methods;
}

export function missingSkillPrerequisites(skills, name, level, character) {
  const item = specialization(name);
  if (item?.foundation && (!hasWeaponFoundation({ ...character, skills }, item) ||
      character?.skillFoundations?.[item.foundation] === "practice")) return [item.foundation];
  if (name === "Mechanika" && character?.race === "Gnóm" && level <= 6) return [];
  if (name === "Mértan" && character?.race === "Gnóm" && level <= 3) return [];
  const missing = (verifiedPrerequisites[baseSkillName(name)]?.skills ?? []).filter((skill) => (skills?.[skill] ?? 0) < level);
  if (character?.race === "Gilf" && name === freeMagicUse && (skills?.[gilfFreeTheory] ?? 0) < level) {
    missing.push(gilfFreeTheory);
  }
  const weaponRestriction = weaponTrainingRestriction(character, name);
  if (weaponRestriction) missing.push(weaponRestriction);
  if (item?.requiresWeapon) {
    const ranks = weaponRanks({ ...character, skills }, item.id);
    if (Math.min(ranks.attack, ranks.defense) < level) missing.push(`Fegyverforgatás (${name.split(" – ")[1]}, mindkét ág)`);
  }
  if (name === "Varázsszer-készítés" && (skills?.Alkímia ?? 0) < level) missing.push("Alkímia");
  if (name === "Esszenciapajzs-aktivizálás" && level < 8) return missing;
  let alternatives = conditionalPrerequisites[name]?.alternatives;
  if (level >= 6 && alternatives?.[0] === "Barkácsolás") alternatives = ["Mechanika"];
  if (alternatives && !alternatives.some((skill) => (skills?.[skill] ?? 0) >= level)) missing.push(alternatives.join(" vagy "));
  return missing;
}

export function skillPrerequisiteMessage(skills, name, level, character) {
  if (name === gilfFreeTheory && character?.race !== "Gilf") return "A szabad Mágiaelmélet ezen a jártasságsoron gilf karakterhez tartozik.";
  const missing = missingSkillPrerequisites(skills, name, level, character);
  const weaponRestriction = weaponTrainingRestriction(character, name);
  if (weaponRestriction) return weaponRestriction;
  if (specialization(name)?.foundation && missing.includes(specialization(name).foundation)) {
    return `${name}: előbb szerezd meg a közös első szintet mentorral.`;
  }
  return missing.length ? `${name} ${level}. szint előfeltétele: ${missing.join(", ")} legalább ${level}. szinten.` : "";
}

export function firstInvalidSkillChange(skills, original = {}, character, previousCharacter = character, packageLevels = {}) {
  for (const [name, level] of Object.entries(skills)) {
    if (!level || level <= (packageLevels[name] ?? 0)) continue;
    const missing = missingSkillPrerequisites(skills, name, level, character);
    const previousMissing = missingSkillPrerequisites(original, name, level, previousCharacter);
    if (missing.length && (level > (original[name] ?? 0) || missing.some((skill) => !previousMissing.includes(skill)))) {
      return skillPrerequisiteMessage(skills, name, level, character);
    }
  }
  return "";
}
import { codexTheorySkills } from "./jpKoltsegek.js";
import { freeMagicUse, gilfFreeTheory } from "./gilfMagia.js";
import { baseSkillName, hasWeaponFoundation, specialization, weaponRanks, weaponTrainingRestriction } from "./jartassagSzakosodasok.js";

