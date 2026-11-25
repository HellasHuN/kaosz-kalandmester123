import { roundPercentageResult } from "./kerekites.js";
import { skillAttributeBonuses } from "./jartassagVisszahatasok.js";

export const BASE_STAT_POINTS = 220;
export const PERCEPTION_POINTS = 50;
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
  return roundPercentageResult((BASE_STAT_POINTS + PERCEPTION_POINTS) * percent / 100);
}

export function attributeAdjustmentLimit(base) {
  // Az egész pontokban megadott eltérés nem haladhatja meg a 20%-os korlátot.
  return Math.floor(base / 5);
}

export function clampAttributeAdjustment(base, adjustment) {
  const limit = attributeAdjustmentLimit(base);
  return Math.max(-limit, Math.min(limit, adjustment));
}

export function statLimits(racialLimits, seniorPercent = 100) {
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
    PERCEPTION_LIMITS,
  ];
}

export function characterStats(character) {
  return [...(character?.stats ?? [55, 55, 55, 55]).slice(0, 4), character?.stats?.[4] ?? PERCEPTION_POINTS];
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
