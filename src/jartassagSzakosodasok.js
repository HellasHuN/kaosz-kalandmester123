import { felszereles } from "./felszerelesAdatok.js";
import { artGenres } from "./fajiSzakosodasok.js";

// Alapkönyv, 83–87., 104–105., 119–120. o.
const groups = {
  Kard: "egyenes-kard rovid-kard szablya jatagan",
  Nehézkard: "pallos fattyukard lovagkard szeleskard handzsar",
  Vívókard: "rapir torkard",
  Tőrök: "tor kes hegyes-tor",
  Buzogányok: "buzogany lancos-buzogany keselyucsor csatacsillag harci-kalapacs fokos nehezbuzogany bunkosbot",
  Csatabárdok: "szekerce csatabard ketkezes-csatabard ketfeju-csatabard csatacsakany",
  Szálfegyver: "landzsa darda pika csaklya angolnanyars alabard csatavilla szigony hosszu-bot csephadaro",
  "Lovas lándzsa": "tarcsas-landzsa kopja",
  Hajítófegyver: "hajitotor jidori-csillag hajitotu hajitobard mesterkorong acelkereszt demonbozont doboszar gerely",
  Íjak: "hosszu-ij visszacsapo-ij kittaran-ij",
  Számszeríjak: "szamszerij pancelzuzo-szamszerij gnom-nyilpuska kathir-nyilpuska",
  Fúvócső: "fuvocso",
  Parittya: "parittya",
  Különleges: "lasszo dobohalo shil-penge fojtohurok kriss haritotor",
};
const weaponGroups = new Map(Object.entries(groups).flatMap(([group, ids]) => ids.split(" ").map((id) => [id, group])));
const branchPrices = [0, 300, 300, 600, 600, 600, 900, 900, 900, 2500];
const weaponTechniques = ["Visszatámadás", "Lefegyverzés", "Pusztító csapás", "Kifárasztás", "Cselezés"];
const specializations = new Map();
for (const genre of artGenres) {
  specializations.set(`Művészet – ${genre}`, { base: "Művészet" });
}
for (const { id, name } of felszereles) {
  const group = weaponGroups.get(id);
  if (!group) continue;
  const base = group === "Hajítófegyver" ? "Fegyverhajítás"
    : ["Íjak", "Számszeríjak", "Fúvócső", "Parittya"].includes(group) ? "Íjászat" : "Fegyverforgatás";
  const key = `${base} – ${name}`;
  specializations.set(key, { base, id, group, ...(base === "Fegyverforgatás" && { prices: [600] }) });
  if (base !== "Fegyverforgatás") continue;
  for (const [branch, label] of [["attack", "támadás"], ["defense", "védekezés"]]) {
    specializations.set(`${key} · ${label}`, { base, id, group, branch, foundation: key, prices: branchPrices });
  }
  for (const technique of weaponTechniques) specializations.set(`${technique} – ${name}`, {
    base: technique, id, group, requiresWeapon: true,
  });
}

export const specializationNames = [...specializations.keys()];
export const specialization = (name) => specializations.get(name);
export const baseSkillName = (name) => specialization(name)?.base ?? name;
export const genericSpecializations = new Set(["Művészet", "Fegyverforgatás", "Fegyverhajítás", "Íjászat", ...weaponTechniques]);
export const artSkillName = (genre) => `Művészet – ${genre}`;
export const weaponRequirement = ["Rátermettség", 40, 50, 60, 70];

// A pontosítás a szintet, az elszámolást és a függő fejlesztést együtt nevezi át.
export function clarifySpecialization(character, from, to) {
  if (!genericSpecializations.has(from) || specialization(to)?.base !== from ||
      specialization(to).branch || (from === "Fegyverforgatás" &&
        (character.skills?.[from] !== 1 || character.skillTraining?.[from]))) return null;
  if (from === "Művészet" && character.creationRacialSkills?.[from] &&
      character.racialSpecializations?.artGenre && to !== artSkillName(character.racialSpecializations.artGenre)) return null;
  const fields = ["skills", "skillJpPaid", "skillJpByLevel", "skillTraining", "skillNotes",
    "skillFoundations", "skillSunkJp", "skillEffectBaseline", "creationRacialSkills", "creationSkillsUnderGrant"];
  if (fields.some((field) => Object.hasOwn(character[field] ?? {}, to))) return null;
  const result = { ...character, skillEffectBaseline: character.skillEffectBaseline ?? character.skills };
  for (const field of fields) {
    if (!Object.hasOwn(result[field] ?? {}, from)) continue;
    result[field] = Object.fromEntries(Object.entries(result[field]).map(([name, value]) => [name === from ? to : name, value]));
  }
  if (character.estimatedSkillJp) result.estimatedSkillJp = character.estimatedSkillJp.map((name) => name === from ? to : name);
  return result;
}

export function specializationRefinementOptions(character, name) {
  return specializationNames.filter((key) => specialization(key).base === name && clarifySpecialization(character, name, key));
}

export function specializationLearningRank(name, level, character) {
  const item = specialization(name);
  if (!item?.branch) return level;
  const racial = racialWeaponTraining(character ?? {});
  return Math.max(1, level, racial?.id === item.id ? racial[item.branch] : 0);
}

export function hasWeaponFoundation(character, item) {
  return !item?.foundation || (character.skills?.[item.foundation] ?? 0) >= 1 ||
    racialWeaponTraining(character)?.id === item.id;
}

export function weaponRanks(character, id) {
  const entries = [...specializations].filter(([, item]) => item.id === id && item.base === "Fegyverforgatás");
  const ranks = { attack: 0, defense: 0 };
  const racial = racialWeaponTraining(character);
  if (racial?.id === id) {
    ranks.attack = racial.attack;
    ranks.defense = racial.defense;
  }
  for (const [name, item] of entries) {
    const rank = character.skills?.[name] ?? 0;
    if (item.branch) ranks[item.branch] = Math.max(ranks[item.branch], rank);
    else {
      ranks.attack = Math.max(ranks.attack, rank);
      ranks.defense = Math.max(ranks.defense, rank);
    }
  }
  return ranks;
}

export function racialWeaponSkillModifier(character, item, level, branch) {
  if (item.base === "Fegyverforgatás") {
    if (character.race === "Gnóm") return 10;
    if (character.race === "Gennymanó" && branch !== "defense") return level <= 3 ? 50 : level <= 6 ? 10 : 0;
  }
  if (item.base === "Íjászat" && character.race === "Gennymanó" &&
      (["Fúvócső", "Parittya"].includes(item.group) ||
       (item.group === "Íjak" && character.racialSpecializations?.weaponApproval))) return -40;
  return 0;
}

export function sameGroupWeaponDiscount(character, item, level) {
  if ((item.base !== "Fegyverforgatás" && !item.requiresWeapon) || item.group === "Különleges") return false;
  const racial = racialWeaponTraining(character);
  if (!item.requiresWeapon && racial?.id && racial.id !== item.id && weaponGroups.get(racial.id) === item.group &&
      (!item.branch || racial[item.branch] >= level)) return true;
  return [...specializations].some(([name, other]) => {
    if (other.id === item.id || other.group !== item.group || other.base !== item.base) return false;
    if (item.requiresWeapon) return (character.skills?.[name] ?? 0) >= level;
    if (!item.branch) return !other.branch && (character.skills?.[name] ?? 0) >= 1;
    return other.branch === item.branch && (character.skills?.[name] ?? 0) >= level;
  });
}

export function racialWeaponTraining(character) {
  const choices = character.racialSpecializations;
  const { attack, defense } = choices?.weaponTraining ?? {};
  if (!attack || !defense) return null;
  const aquatic = character.race === "Gyíklény" && character.subrace === "Tecath";
  const name = aquatic ? "Vízi lándzsaforgatás" : choices.weaponName?.trim();
  if (!name) return null;
  const match = !aquatic && felszereles.find((item) => item.kind === "weapon" &&
    item.name.toLocaleLowerCase("hu") === name.toLocaleLowerCase("hu"));
  return { name, attack, defense, id: match?.id };
}

export function weaponTrainingRestriction(character, name) {
  const item = specialization(name);
  if (character?.race !== "Gennymanó" || !item?.id) return "";
  const weapon = felszereles.find(({ id }) => id === item.id);
  const minimum = (value) => Array.isArray(value) ? value[0] : value;
  if (item.base === "Íjászat" && item.group === "Íjak" &&
      (!character.racialSpecializations?.weaponApproval || minimum(weapon.stats.strength) > 3)) {
    return "A gennymanó csak KM-engedéllyel, legfeljebb 3-as erejű íjat tanulhat.";
  }
  if ((item.base === "Fegyverforgatás" || item.requiresWeapon) &&
      (minimum(weapon.stats.speed) > 3 || minimum(weapon.stats.strength) > 3)) {
    return "A fegyver meghaladja a gennymanó 3-as gyorsaság- vagy erőkorlátját. Mágikus kivételhez KM-döntés szükséges.";
  }
  return "";
}
