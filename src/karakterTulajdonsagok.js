import { speedByRace } from "./gyorsasag.js";
import { elonyok, hatranyok } from "./elonyokHatranyok.js";

const opposingTraits = [
  ["Kimagasló sebgyógyulás", "Vérzékenység"],
  ["Kimagasló mágikus ellenállás", "Rossz mágikus ellenállás"],
  ["Kimagasló gyorsaság", "Faji lassúság"],
  ["Az átlagosnál jobb látás", "Az átlagosnál rosszabb látás"],
  ["Az átlagosnál jobb hallás", "Az átlagosnál rosszabb hallás", "Siketség"],
  ["Az átlagosnál jobb szaglás", "Az átlagosnál rosszabb szaglás", "A szaglás teljes hiánya"],
  ["Rosszullét vér láttán", "Ájulás vér láttán"],
  ["Az átlagosnál jobb anyagi helyzet", "Az átlagosnál rosszabb anyagi helyzet", "Nincstelen"],
];

export function traitConflict(name, selected) {
  return name === "Spontán mágia" ? selected.includes(name)
    : opposingTraits.some((group) => group.includes(name) && selected.some((other) => other !== name && group.includes(other)));
}

export const narratorTraitPrices = {
  "Segítő kapcsolatok": [1, undefined],
  "Ártó kapcsolatok": [1, undefined],
  Allergia: [100, 1500],
  Fóbiák: [100, 1500],
  "Kedvezőtlen származás": [400, 1500],
  Beszédhiba: [100, 1000],
};

export const fingerPrices = [
  ...[100, 150].flatMap((unit) => Array.from({ length: 5 }, (_, index) => ({
    label: `${index + 1} ujj · ${unit === 100 ? "másik kéz" : "fegyverforgató kéz"}`, cost: (index + 1) * unit,
  }))),
  ...Array.from({ length: 9 }, (_, index) => ({ label: `${index + 2} ujj · mindkét kéz`, cost: (index + 2) * 200 })),
];

export function traitValueError(name, value, race) {
  if (name === "Született tehetség") return "";
  if ((name === "Csekély hőlátás" && race === "Ork") ||
      (name === "Csekély éjjeli látás" && ["Elf", "Törpe"].includes(race))) {
    return `A faj adottsága mellett nem választható: ${name}.`;
  }
  const trait = [...elonyok, ...hatranyok].find((item) => item.nev === name);
  if (!trait?.valtozo) return "";
  const price = Number(value);
  const range = narratorTraitPrices[name];
  const formula = calculateTraitJp(name, value, race);
  const valid = value != null && value !== "" && Number.isSafeInteger(price) && (
    range ? price >= range[0] && (range[1] == null || price <= range[1])
      : name === "Hiányzó kézujjak" ? fingerPrices.some(({ cost }) => price === cost)
        : formula != null ? formula > 0 : trait.jp?.includes?.(price)
  );
  return valid ? "" : `Add meg a tulajdonság érvényes fokozatát vagy költségét: ${name}.`;
}

export function traitSkillModifier(character, skill) {
  const modifiers = [
    ["Az átlagosnál jobb látás", "Az átlagosnál rosszabb látás", ["Íjászat", "Fegyverhajítás"]],
    ["Az átlagosnál jobb hallás", "Az átlagosnál rosszabb hallás", ["Hallgatózás", "Vakharc", "Hangutánzás"]],
  ];
  return modifiers.reduce((sum, [advantage, disadvantage, skills]) => {
    if (!skills.includes(skill)) return sum;
    if (character.disadvantages?.includes(disadvantage) &&
        !traitValueError(disadvantage, character.traitValues?.[disadvantage], character.race)) return sum + 20;
    if (!character.advantages?.includes(advantage) ||
        traitValueError(advantage, character.traitValues?.[advantage], character.race)) return sum;
    return sum - Number(character.traitValues[advantage]) / 10;
  }, 0);
}

export function traitSkillLimit(character, skill) {
  if (character.disadvantages?.includes("Víziszony") && ["Úszás", "Hajózás"].includes(skill)) return 0;
  if (character.disadvantages?.includes("Púposság") && skill === "Akrobatika") return 4;
  return Infinity;
}

export function calculateTraitJp(name, value, race) {
  const number = Number(value);

  if (!Number.isFinite(number)) return null;

  // Kimagasló gyorsaság
  if (name === "Kimagasló gyorsaság") {
    const speed = speedByRace[race];
    if (!speed) return null;

    if (number < speed.max || number > speed.avg) return 0;

    return (speed.avg - number) * 300;
  }

  // Faji lassúság
  if (name === "Faji lassúság") {
    const speed = speedByRace[race];
    if (!speed) return null;

    if (number < speed.avg || number > speed.min) return 0;

    return (number - speed.avg) * 300;
  }

  // Jobb látás, hallás és szaglás
  if (
    [
      "Az átlagosnál jobb látás",
      "Az átlagosnál jobb hallás",
      "Az átlagosnál jobb szaglás",
    ].includes(name)
  ) {
    if (number < 130 || number > 250 || number % 10 !== 0) return 0;
    return 800 + ((number - 130) / 10) * 100;
  }

  if (name === "Csekély hőlátás") {
    if (number < 1 || number > 15) return 0;
    return 500 + (number - 1) * 100;
  }

  if (name === "Csekély éjjeli látás") {
    if (number < 5 || number > 15) return 0;
    return 600 + (number - 5) * 80;
  }

  if (name === "Az átlagosnál rosszabb látás") {
    if (number < 40 || number > 70 || number % 10 !== 0) return 0;
    return 600 + ((70 - number) / 10) * 200;
  }

  if (
    [
      "Az átlagosnál rosszabb hallás",
      "Az átlagosnál rosszabb szaglás",
    ].includes(name)
  ) {
    if (number < 40 || number > 70 || number % 10 !== 0) return 0;
    return 400 + ((70 - number) / 10) * 200;
  }

  return null;
}

