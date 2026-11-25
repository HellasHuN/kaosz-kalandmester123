import { levelCost, paidLevels, skillPrices, skillRequirement } from "./jpSzamitas.js";
import { devotionError, devotionSkill } from "./elhivatottsag.js";
import { learningMethods, skillPrerequisiteMessage } from "./jartassagElofeltetelek.js";
import { traitSkillModifier } from "./karakterTulajdonsagok.js";
import { racialSkillModifier } from "./fajiSzakosodasok.js";
import { inheritedModifier } from "./felverOrokles.js";
import { packagePlayModifier } from "./kepzesiCsomagok.js";
import { gilfFreeTheory } from "./gilfMagia.js";

import { baseSkillName, racialWeaponTraining, specialization, specializationLearningRank } from "./jartassagSzakosodasok.js";

export function relatedAttribute(name) {
  return skillRequirement(name)?.[0];
}

export function trainingQuote(character, name, current, method = "mentor") {
  const foundation = character.skillFoundations?.[name];
  const item = specialization(name);
  const base = baseSkillName(name);
  const prior = specializationLearningRank(name, current, character);
  const relearn = foundation === "practice" && current === 1;
  const level = relearn ? 1 : prior + 1;
  if (name === "Mágiaelmélet" || name === devotionSkill || (name === gilfFreeTheory && character.race !== "Gilf") ||
      !skillPrices(name) || level > skillPrices(name).length) return null;
  if (item?.base === "Fegyverforgatás" && !item.branch && racialWeaponTraining(character)?.id === item.id) return null;
  // Alapkönyv, 96–97. oldal. A Mesélő igazolja a jártasság tanulási kódját.
  if (!learningMethods(name, prior, foundation).includes(method)) return null;
  const modifier = method === "mentor" ? 0 : method === "practice-foundation" ? 200
    : level <= 2 ? 100 : level <= 5 ? 50 : level <= 7 ? 10 : 0;
  const racial = inheritedModifier(character, base) ||
    (item && base === "Íjászat" && character.race === "Gennymanó" ? 0 : racialSkillModifier(character, base));
  const cost = Math.max(0, levelCost(character, name, level, modifier + racial +
    traitSkillModifier(character, base) + packagePlayModifier(character, base)));
  // Az Oktatás szabálya (117. o.) pontosítja az általános mentorleírást.
  return { level, cost, mentorLevel: Math.max(7, Math.min(10, level + 2)), ...(relearn && { relearn }),
    ...(item?.branch && { from: prior }) };
}

export function skillRows(character) {
  const skills = character.skills ?? {};
  const training = character.skillTraining ?? {};
  const sunk = character.skillSunkJp ?? {};
  return Object.fromEntries([...new Set([...Object.keys(skills), ...Object.keys(training), ...Object.keys(character.skillNotes ?? {}), ...Object.keys(sunk)])].map((name) => {
    const level = skills[name] ?? 0;
    const paid = level > 0 && skillPrices(name) ? paidLevels(character, name, level) : {
      prices: character.skillJpByLevel?.[name] ?? [], estimated: false,
    };
    return [name, { level, ...paid, note: character.skillNotes?.[name] ?? "", training: training[name] ?? null,
      foundation: character.skillFoundations?.[name], sunk: sunk[name] ?? 0 }];
  }));
}

const paidTotal = ({ level, prices }) => prices.slice(0, level).reduce((sum, price) => sum + price, 0);

export function committedJp(rows) {
  return Object.values(rows).reduce((sum, row) => sum + paidTotal(row) + (row.training?.cost ?? 0) + (row.sunk ?? 0), 0);
}

export function completeTraining(row, name) {
  const { training } = row;
  if (training?.relearn && row.level === 1 && row.foundation === "practice") {
    return { ...row, prices: [training.cost], sunk: (row.sunk ?? 0) + paidTotal(row), foundation: undefined, training: null };
  }
  const prior = specialization(name)?.branch ? Math.max(1, row.level, training?.from ?? 0) : row.level;
  if (!training || training.level !== prior + 1) return row;
  const prices = Array.from({ length: prior }, (_, index) => index < row.level ? (row.prices[index] ?? null) : 0);
  return { ...row, level: training.level, prices: [...prices, training.cost], training: null,
    ...(training.method === "practice-foundation" && { foundation: "practice" }) };
}

export function changeDevotionInPlay(character, row, level, approved) {
  if (devotionError(character, level, approved) || level === row.level || row.training) return row;
  const prices = Array.from({ length: level }, (_, index) =>
    index < row.level ? (row.prices[index] ?? null) : 0);
  const sunk = (row.sunk ?? 0) + row.prices.slice(level, row.level).reduce((sum, price) => sum + price, 0);
  return { ...row, level, prices, sunk };
}

export function cancelTraining(row) {
  return { ...row, training: null };
}

export function firstInvalidTrainingChange(training, skills, character, original) {
  for (const [name, record] of Object.entries(training)) {
    const retained = record === original.skillTraining?.[name];
    if (retained && skillPrerequisiteMessage(original.skills, name, record.level, original)) continue;
    const previousDevotion = original.skills?.[devotionSkill] ?? 0;
    const prerequisiteSkills = retained && previousDevotion > (skills[devotionSkill] ?? 0)
      ? { ...skills, [devotionSkill]: previousDevotion } : skills;
    const message = skillPrerequisiteMessage(prerequisiteSkills, name, record.level, character);
    if (message) return message;
  }
  return "";
}

export function serializeSkills(rows) {
  const entries = Object.entries(rows);
  const acquired = entries.filter(([, row]) => row.level > 0);
  return [
    Object.fromEntries(acquired.map(([name, row]) => [name, row.level])),
    Object.fromEntries(acquired.map(([name, row]) => [name, paidTotal(row)])),
    Object.fromEntries(acquired.map(([name, row]) => [name, row.prices.slice(0, row.level)])),
    acquired.filter(([, row]) => row.prices.slice(0, row.level).includes(null)).map(([name]) => name),
    Object.fromEntries(entries.filter(([, row]) => row.training).map(([name, row]) => [name, row.training])),
    Object.fromEntries(entries.filter(([, row]) => row.note).map(([name, row]) => [name, row.note])),
    Object.fromEntries(acquired.filter(([, row]) => row.foundation).map(([name, row]) => [name, row.foundation])),
    Object.fromEntries(entries.filter(([, row]) => row.sunk).map(([name, row]) => [name, row.sunk])),
  ];
}

