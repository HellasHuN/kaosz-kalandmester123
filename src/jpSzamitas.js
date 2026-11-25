import { codexTheorySkills, jpKoltsegek } from "./jpKoltsegek.js";
import { jartassagKovetelmenyek } from "./jartassagKovetelmenyek.js";
import { roundPercentageResult } from "./kerekites.js";
import { effectiveAttribute } from "./karakterFoeertekek.js";
import { gilfFreeTheory } from "./gilfMagia.js";
import { baseSkillName, genericSpecializations, racialWeaponSkillModifier, sameGroupWeaponDiscount,
  specialization, specializationNames, weaponRequirement } from "./jartassagSzakosodasok.js";

export const TEHETSEG = "Született tehetség";
const codexSkills = new Set(Object.values(codexTheorySkills));
export const talentEligibleSkills = [...Object.keys(jpKoltsegek), ...specializationNames]
  .filter((name) => name !== "Mágiaelmélet" && !genericSpecializations.has(name) &&
    !specialization(name)?.branch && skillRequirement(name) !== null).sort((a, b) => a.localeCompare(b, "hu"));
const talentDiscount = 15;
const attributes = {
  Fizikum: [0, 0], Erő: [0, 1], Szívósság: [0, -1],
  Rátermettség: [1, 0], Ügyesség: [1, 1], Reflex: [1, -1],
  Tudat: [2, 0], Intelligencia: [2, 1], Lelkierő: [2, -1],
  Esszencia: [3, 0], Varázserő: [3, 1], Esszenciapajzs: [3, -1],
};

export function attributeModifier(value, required) {
  const difference = value - required;
  if (difference >= 30) return -30;
  if (difference >= 20) return -15;
  if (difference >= 0) return 0;
  if (difference >= -10) return 15;
  if (difference >= -20) return 30;
  return 100;
}

export function talentCost(name) {
  const base = baseSkillName(name) === "Fegyverforgatás" ? 1800
    : skillPrices(name).slice(0, 3).reduce((sum, price) => sum + price, 0);
  // Az errata a Született tehetség áránál 467,5 Jp helyett 467 Jp-t ad meg.
  return Math.min(1000, Math.floor(base * (100 - talentDiscount) / 100));
}

export function skillPrices(name) {
  return specialization(name)?.prices ?? (name === "Fegyverforgatás" ? [600] : jpKoltsegek[baseSkillName(name)]);
}

export function skillRequirement(name) {
  const base = baseSkillName(name);
  return base === "Fegyverforgatás" ? weaponRequirement
    : jartassagKovetelmenyek[codexSkills.has(name) || name === gilfFreeTheory ? "Mágiaelmélet" : base];
}

export function levelCost(character, name, level, learningModifier = 0, groupSkills = character.skills) {
  const requirement = skillRequirement(name);
  const item = specialization(name);
  // Az errata (104. o.) engedi a rokonfegyver árának további módosítását.
  const discounted = item && sameGroupWeaponDiscount({ ...character, skills: groupSkills }, item, level);
  const price = skillPrices(name)[level - 1];
  let modifier = learningModifier + (requirement && character.talentSkills?.some((skill) =>
    skill === name || skill === item?.foundation || skill === baseSkillName(name)) ? -talentDiscount : 0);
  if (requirement) {
    const [attribute, ...thresholds] = requirement;
    const [index, direction] = attributes[attribute];
    const value = effectiveAttribute(character, index, direction);
    if (Number.isFinite(value)) {
      modifier += attributeModifier(value, thresholds[Math.floor((level - 1) / 3)]);
    }
  }
  if (item?.base === "Fegyverforgatás" && !item.branch) {
    const attack = racialWeaponSkillModifier(character, item, level, "attack");
    const defense = racialWeaponSkillModifier(character, item, level, "defense");
    return roundPercentageResult(price * (discounted ? 15 : 100) * (100 + modifier + (attack + defense) / 2) / 10000);
  }
  return roundPercentageResult(price * (discounted ? 15 : 100) * (100 + modifier +
    (item ? racialWeaponSkillModifier(character, item, level, item.branch) : 0)) / 10000);
}

export function paidLevels(character, name, level) {
  const recorded = character.skillJpByLevel?.[name];
  if (recorded) {
    return { prices: recorded, estimated: character.estimatedSkillJp?.includes(name) ?? false };
  }

  const basePrices = skillPrices(name).slice(0, level);
  const baseTotal = basePrices.reduce((sum, price) => sum + price, 0);
  const total = character.skillJpPaid?.[name] ?? baseTotal;
  if (total === baseTotal) return { prices: basePrices, estimated: !Object.hasOwn(character.skillJpPaid ?? {}, name) };

  // Allocate by cumulative weight so the inferred prices sum to the saved total.
  let cumulativeWeight = 0;
  let allocated = 0;
  const prices = basePrices.map((price) => {
    cumulativeWeight += baseTotal ? price : 1;
    const next = Math.floor(total * cumulativeWeight / (baseTotal || level));
    const amount = next - allocated;
    allocated = next;
    return amount;
  });
  return { prices, estimated: true };
}
