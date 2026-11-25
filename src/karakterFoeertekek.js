import { roundPercentageResult } from "./kerekites.js";
import { skillAttributeBonuses } from "./jartassagVisszahatasok.js";

export const STAT_POINTS = 270;
export const LEGACY_PERCEPTION = 50;

// TESZT 1.0 háziszabály-javaslatok. A számok tervezési értékek, nem könyvi táblázat.
const proposals = {
  Elf: [35, 60, 90, "Éles hallás és látás (Alapkönyv, 37. o.)."],
  Ember: [20, 50, 80, "Az emberi érzékelés a viszonyítási alap."],
  Gennymanó: [25, 55, 85, "Lopakodó szerepkör, TESZT 1.0-as javaslat."],
  Gilf: [25, 55, 85, "TESZT 1.0-as, enyhén megemelt tartomány."],
  Gnóm: [20, 50, 80, "Semleges tartomány. A Hatodik érzék külön faji képesség."],
  Gyíklény: [20, 50, 85, "Semleges alap, a helyzetfüggő faji képességek külön érvényesülnek."],
  Manó: [20, 50, 80, "Semleges tartomány. A méregérzékelés külön képesség."],
  Ogár: [15, 45, 80, "Szélesebb tartomány a torzulásoktól független alaphoz."],
  Ork: [25, 55, 85, "Ork éjjellátás, az erőállati érzékek külön maradnak (24–25. o., errata)."],
  Törpe: [25, 55, 85, "Hő- és éjjellátás (Alapkönyv, 47. o.)."],
  Tündérke: [20, 55, 90, "TESZT 1.0-as, tág tartomány."],
  "Félvér elf": [25, 55, 85, "Az elf javaslathoz közelítő, tág félvér tartomány."],
  "Félvér gilf": [20, 50, 85, "Tág félvér tartomány."],
  "Félvér ogár": [15, 45, 85, "Tág félvér tartomány."],
  "Félvér ork": [20, 50, 85, "Tág félvér tartomány."],
  Szürkemanó: [15, 50, 90, "Tág tartomány többféle származáshoz."],
};
export const perceptionLimits = Object.fromEntries(Object.entries(proposals).map(([race, [min, suggested, max, note]]) =>
  [race, { range: [min, max], suggested, note }]));
export const PERCEPTION_LIMITS = [0, 100];

export const attributes = [
  ["Fizikum", "Erő", "Szívósság"],
  ["Rátermettség", "Ügyesség", "Reflex"],
  ["Tudat", "Intelligencia", "Lelkierő"],
  ["Esszencia", "Varázserő", "Esszenciapajzs"],
  ["Érzékelés", "Érzékszerv", "Intuíció"],
];

const percentRange = (min, max) => Array.from({ length: max - min + 1 }, (_, index) => min + index);
export const ageOptions = {
  juvenis: { stats: percentRange(50, 80), jp: percentRange(30, 80) },
  senius: { stats: [80, 70, 60, 50], jp: percentRange(200, 500) },
};

export function ageStage(age, limits) {
  if (!Number.isInteger(Number(age)) || Number(age) < 1 || !limits?.[2]) return null;
  if (age > limits[2]) return "extrém";
  if (age >= limits[1]) return "senius";
  return age < limits[0] ? "juvenis" : "adultus";
}

export function statPoints(percent = 100) {
  return roundPercentageResult(STAT_POINTS * percent / 100);
}

export function attributeAdjustmentLimit(base) {
  // Az egész pontokban megadott eltérés nem haladhatja meg a 20%-os korlátot.
  return Math.floor(base / 5);
}

export function clampAttributeAdjustment(base, adjustment) {
  const limit = attributeAdjustmentLimit(base);
  return Math.max(-limit, Math.min(limit, adjustment));
}

export function statLimits(racialLimits, seniorPercent = 100, perceptionRange = PERCEPTION_LIMITS) {
  const [physical, aptitude, mind, essence] = racialLimits;
  const physicalMin = physical[0] * seniorPercent / 100;
  const aptitudeMin = aptitude[0] * seniorPercent / 100;
  // Az errata példájában 17,5 pont átlagos csökkenés 17 ponttal emeli a maximumokat.
  const increase = Math.floor((physical[0] - physicalMin + aptitude[0] - aptitudeMin) / 2);
  return [
    [roundPercentageResult(physicalMin), physical[1]],
    [roundPercentageResult(aptitudeMin), aptitude[1]],
    [mind[0], mind[1] + increase],
    [essence[0], essence[1] + increase],
    perceptionRange,
  ];
}

export function characterStats(character) {
  return [...(character?.stats ?? [55, 55, 55, 55]).slice(0, 4), character?.stats?.[4] ?? LEGACY_PERCEPTION];
}

export function characterAdjustments(character) {
  return attributes.map((_, index) => character?.adjustments?.[index] ?? 0);
}

export function effectiveAttribute(character, index, direction = 0, bonuses = skillAttributeBonuses(character)) {
  const base = character.stats?.[index];
  if (!Number.isFinite(base)) return undefined;
  const attribute = attributes[index][direction === 1 ? 1 : direction === -1 ? 2 : 0];
  return base + direction * (character.adjustments?.[index] ?? 0) + (bonuses[attribute] ?? 0);
}

export function withEffectiveStrength(character) {
  const { Erő: bonus } = skillAttributeBonuses(character);
  if (!bonus) return character;
  const adjustments = characterAdjustments(character);
  adjustments[0] += bonus;
  return { ...character, adjustments };
}

export function allocateStartingStats(limits, budget, suggestedPerception) {
  const values = limits.map(([min]) => min);
  let remaining = budget - values.reduce((sum, value) => sum + value, 0);
  const proposed = Math.min(Math.max(0, remaining), Math.max(0, suggestedPerception - values[4]), limits[4][1] - values[4]);
  values[4] += proposed;
  remaining -= proposed;
  while (remaining > 0) {
    let allocated = 0;
    const count = values.slice(0, 4).some((value, index) => value < limits[index][1]) ? 4 : values.length;
    for (let index = 0; index < count && remaining > 0; index++) {
      if (values[index] < limits[index][1]) {
        values[index]++;
        remaining--;
        allocated++;
      }
    }
    if (!allocated) break;
  }
  return values;
}
