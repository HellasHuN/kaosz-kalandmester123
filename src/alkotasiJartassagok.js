import { jpKoltsegek } from "./jpKoltsegek.js";
import { attributeModifier, levelCost, paidLevels, skillPrices } from "./jpSzamitas.js";
import { racialSkillModifier, racialWeaponCost } from "./fajiSzakosodasok.js";
import { inheritedModifier } from "./felverOrokles.js";
import { traitSkillLimit, traitSkillModifier } from "./karakterTulajdonsagok.js";
import { seniorStartingCap, startingApprovalContext, startingSkillException } from "./induloJartassagEngedelyek.js";
import { packageCreationModifier, packageGrants, packageJp } from "./kepzesiCsomagok.js";
import { freeMagicUse, gilfFreeTheory, gilfStartingSkillCap } from "./gilfMagia.js";
import { skillPrerequisiteMessage } from "./jartassagElofeltetelek.js";
import { artSkillName, baseSkillName, genericSpecializations, hasWeaponFoundation, racialWeaponTraining, specialization,
  specializationLearningRank, specializationNames } from "./jartassagSzakosodasok.js";

export const creationSkillNames = [...Object.keys(jpKoltsegek).filter((name) =>
  name !== "Mágiaelmélet" && name !== "Elhivatottság*" && !genericSpecializations.has(name)), ...specializationNames];

const racialStartingSkills = {
  "Elf": { "Természetismeret": 5 },
  "Gnóm": { "Mechanika": 6, "Barkácsolás": 6, "Mértan": 3 },
  "Gennymanó": { "Tolvajlás": 4, "Lopakodás": 4, "Falmászás": 4 },
  "Gyíklény": { "Úszás": 6 },
};
const nightSkills = new Set(["Koldulás", "Álcázás", "Rejtőzés", "Lopakodás", "Követés/Lerázás",
  "Szájról olvasás", "Tolvajnyelv", "Jelbeszéd", "Hangutánzás", "Hallgatózás", "Tolvajlás", "Zárnyitás",
  "Falmászás", "Csapdakészítés", "Csapdakeresés/Rejtekajtó keresés", "Csapdák eltávolítása",
  "Hátbaszúrás", "Vallatás", "Hamisítás", "Szerencsejáték", "Méregismeret", "Méregkeverés", "Méregdetekció"]);

export function creationGrantedSkills(character, original) {
  if (original && original.race === character.race && !original.creationRacialSkills &&
      original.subrace === character.subrace) return {};
  return {
    ...(!original || original.creationRacialSkills?.Anyanyelvismeret ? { Anyanyelvismeret: 5 } : {}),
    ...racialStartingSkills[character.race],
    ...(character.race === "Elf" && character.subrace === "Erdei elf" ?
      { [character.racialSpecializations?.artGenre && !original?.creationRacialSkills?.Művészet
        ? artSkillName(character.racialSpecializations.artGenre) : "Művészet"]: 6 } : {}),
    ...(character.race === "Elf" && character.subrace === "Bérci könnyűléptű" ? { "Tájékozódás": 5 } : {}),
  };
}

export function purchasedCreationSkills(character) {
  const purchased = { ...character?.skills };
  for (const [name, grant] of Object.entries(combineCreationGrants(character?.creationRacialSkills, packageGrants(character?.trainingPackages)))) {
    if (purchased[name] > grant) continue;
    const retained = character.creationSkillsUnderGrant?.[name];
    if (retained) purchased[name] = retained;
    else delete purchased[name];
  }
  return purchased;
}

export function combineCreationGrants(racial = {}, packages = {}) {
  const result = { ...racial };
  for (const [name, level] of Object.entries(packages)) result[name] = Math.max(result[name] ?? 0, level);
  return result;
}

export function skillsUnderRacialGrant(purchased, grants) {
  return Object.fromEntries(Object.entries(purchased).filter(([name, level]) => level <= (grants[name] ?? 0)));
}

export function ordinaryCreationSkillLimit(character, name) {
  const item = specialization(name);
  if (item?.base === "Fegyverforgatás" && !item.branch) return 1;
  const senior = seniorStartingCap(character);
  let racial = character.race === "Ember" ? 4 : 3;
  if (["Anyanyelvismeret", "Közös nyelv"].includes(name)) return jpKoltsegek[name].length;
  if (character.race === "Gnóm" && ["Mértan", "Számtan"].includes(name)) racial = 6;
  if (character.race === "Gennymanó" && nightSkills.has(name)) racial = 4;
  if (character.race === "Gilf" && (name === freeMagicUse || name === gilfFreeTheory)) racial = 4;
  if (character.race === "Elf" && name === "Természetismeret") racial = 5;
  if (character.race === "Elf" && character.racialSpecializations?.approvedNatureSkills?.includes(name)) racial = Math.max(racial, 4);
  if (character.race === "Gyíklény" && character.subrace === "Tecath" && name === "Halászat") racial = 4;
  if (character.race === "Gyíklény" && character.subrace === "Tecath" &&
      name === "Vadászat" && character.racialSpecializations?.waterHunting) racial = 4;
  if (character.race === "Tündérke" && ["Természetismeret", "Gyógynövény ismeret", "Tájékozódás"].includes(name)) racial = 6;
  return Math.max(senior, racial);
}

export function creationSkillLimit(character, name) {
  const base = ordinaryCreationSkillLimit(character, name);
  const item = specialization(name);
  const approved = item?.base === "Fegyverforgatás" && !item.branch ? base : startingSkillException(character, name, base);
  return Math.min(approved, gilfStartingSkillCap(character, name), skillPrices(name)?.length ?? 10,
    traitSkillLimit(character, baseSkillName(name)));
}

export function invalidStartingSkill(character, original, grants) {
  const unchangedLegacyContext = original &&
    JSON.stringify(startingApprovalContext(character)) === JSON.stringify(startingApprovalContext(original));
  return Object.entries(character.skills).find(([name, level]) =>
    level > Math.max(grants[name] ?? 0, creationSkillLimit(character, name)) &&
    !(unchangedLegacyContext && (original.skills?.[name] ?? 0) >= level &&
      !original.startingSkillApprovals?.exceptions?.[name]?.approved &&
      !(original.creationStage === "senius" && original.startingSkillApprovals?.senior?.approved && level === 7) &&
      JSON.stringify(original.disadvantages ?? []) === JSON.stringify(character.disadvantages ?? [])))?.[0];
}

function creationLevelCost(character, name, level, groupSkills) {
  const base = baseSkillName(name);
  const inherited = inheritedModifier(character, base);
  const modifier = base !== name && base === "Íjászat" && character.race === "Gennymanó"
    ? 0 : racialSkillModifier(character, base);
  const beforeLevel = { ...character, skills: { ...character.skills, [name]: level - 1 },
    skillEffectBaseline: character.skillEffectBaseline ?? character.skills ?? {} };
  return Math.max(0, levelCost(beforeLevel, name, level,
    (inherited || modifier) + traitSkillModifier(character, base) + packageCreationModifier(character, name, level), groupSkills));
}

export function creationSkillCosts(character, original) {
  const skillJpByLevel = Object.fromEntries(Object.entries(original?.skillJpByLevel ?? {})
    .filter(([name]) => !skillPrices(name)));
  const skillJpPaid = Object.fromEntries(Object.entries(original?.skillJpPaid ?? {})
    .filter(([name]) => !skillPrices(name)));
  const estimatedSkillJp = (original?.estimatedSkillJp ?? []).filter((name) => !skillPrices(name));
  const specializationJp = racialWeaponCost(character, attributeModifier);
  let total = specializationJp + packageJp(character.trainingPackages);
  const grants = combineCreationGrants(creationGrantedSkills(character, original), packageGrants(character.trainingPackages));
  const historicalGrants = combineCreationGrants(original?.creationRacialSkills, packageGrants(original?.trainingPackages));
  const earlierSkills = {};
  for (const [name, level] of Object.entries(character.skills)) {
    if (!skillPrices(name)) continue;
    if (name === "Fegyverforgatás" && level > 1) {
      if (Object.hasOwn(original?.skillJpByLevel ?? {}, name)) skillJpByLevel[name] = original.skillJpByLevel[name];
      if (Object.hasOwn(original?.skillJpPaid ?? {}, name)) skillJpPaid[name] = original.skillJpPaid[name];
      if (original?.estimatedSkillJp?.includes(name)) estimatedSkillJp.push(name);
      continue;
    }
    const previousLevel = original?.skills?.[name] ?? 0;
    const historical = previousLevel ? paidLevels(original, name, previousLevel) : null;
    let retainedEstimate = false;
    const prices = Array.from({ length: level }, (_, index) => {
      if (index < (grants[name] ?? 0)) return 0;
      if (specialization(name)?.branch && index < specializationLearningRank(name, 0, character)) return 0;
      const item = specialization(name);
      const lostGrant = index < (historicalGrants[name] ?? 0);
      const price = creationLevelCost(character, name, index + 1, item ? earlierSkills : undefined);
      if (!lostGrant && historical?.prices[index] != null && (item || price === creationLevelCost(original, name, index + 1))) {
        retainedEstimate ||= historical.estimated;
        return historical.prices[index];
      }
      return price;
    });
    if (retainedEstimate) estimatedSkillJp.push(name);
    skillJpByLevel[name] = prices;
    skillJpPaid[name] = prices.reduce((sum, price) => sum + price, 0);
    total += skillJpPaid[name];
    earlierSkills[name] = level;
  }
  return { skillJpByLevel, skillJpPaid, estimatedSkillJp, specializationJp, total };
}

export function savedCreationSkillTotal(character) {
  return Object.entries(character.skills ?? {}).reduce((total, [name, level]) => {
    if (!skillPrices(name) || (name === "Fegyverforgatás" && level > 1)) return total;
    return total + paidLevels(character, name, level).prices.slice(0, level).reduce((sum, price) => sum + price, 0);
  }, (character.racialSpecializationJp ?? 0) + packageJp(character.trainingPackages));
}

export function updateCreationSkill(character, budget, name, level, original) {
  const item = specialization(name);
  if (!creationSkillNames.includes(name) || !Number.isInteger(level) || level < 0 ||
      level > skillPrices(name).length || (item?.branch && level > 0 &&
      (level <= specializationLearningRank(name, 0, character) || !hasWeaponFoundation(character, item)))) return character.skills;
  if (level > 0 && item?.base === "Fegyverforgatás" && !item.branch &&
      racialWeaponTraining(character)?.id === item.id) return character.skills;
  const currentLevel = character.skills[name] ?? 0;
  if (name === freeMagicUse && level > currentLevel && skillPrerequisiteMessage(character.skills, name, level, character)) return character.skills;
  const minimum = combineCreationGrants(creationGrantedSkills(character, original), packageGrants(character.trainingPackages))[name] ?? 0;
  if (level < minimum || (level > currentLevel && level > creationSkillLimit(character, name))) return character.skills;
  const skills = { ...character.skills };
  if (!level && specializationNames.some((key) => specialization(key).foundation === name &&
      (skills[key] || character.skillTraining?.[key]))) return character.skills;
  if (level === 0) delete skills[name];
  else skills[name] = level;
  if (level > currentLevel && (budget == null || creationSkillCosts({ ...character, skills }, original).total > budget)) {
    return character.skills;
  }
  return skills;
}

