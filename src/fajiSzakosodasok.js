import { roundPercentageResult } from "./kerekites.js";

// Alapkönyv, 37. o. és a Művészet jártasság leírása.
export const artGenres = [
  "Szobrászat", "Festészet (rajzzal)", "Irodalom", "Zene (hangszerhasználat)",
  "Ének", "Színészet", "Kertészet", "Szexualitás", "Tánc",
];

export function activeRacialChoices(race, subrace, choices = {}) {
  if (race === "Elf") return {
    artGenre: subrace === "Erdei elf" ? choices.artGenre ?? "" : undefined,
    approvedNatureSkills: choices.approvedNatureSkills ?? [],
  };
  if (race === "Gyíklény") {
    return { waterHunting: choices.waterHunting === true, weaponTraining: choices.weaponTraining };
  }
  if (race === "Ogár") {
    const { extraLimbs, extraLimbDescription, spikeLocations, torsoSpikes, customMutation, customCost, customApproved, customApprovalSource } = choices;
    return {
      extraLimbs, extraLimbDescription, torsoSpikes, customMutation, customCost, customApproved, customApprovalSource,
      spikeLocations: ogreLimbOptions(extraLimbs).filter((limb) => spikeLocations?.includes(limb)),
    };
  }
  if (race === "Gennymanó" || race === "Gnóm") {
    const { weaponType, weaponApproval, weaponApprovalSource, weaponName, weaponTraining } = choices;
    return { weaponType, weaponApproval, weaponApprovalSource, weaponName, weaponTraining };
  }
  return {};
}

const count = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : 0;

export function ogreLimbOptions(extraLimbs) {
  // A 270 pontos induló keretből legfeljebb 9 extra végtag finanszírozható.
  return ["Bal kar", "Jobb kar", "Bal láb", "Jobb láb",
    ...Array.from({ length: Math.min(count(extraLimbs), 9) }, (_, index) => `Extra végtag ${index + 1}`)];
}

// Alapkönyv, 28–29. o. A torzulások főértékpontba kerülnek.
export function specializationStatCost(race, choices = {}) {
  if (race !== "Ogár") return 0;
  return 30 * count(choices.extraLimbs) + 3 * ogreLimbOptions(choices.extraLimbs)
    .filter((limb) => choices.spikeLocations?.includes(limb)).length +
    (choices.torsoSpikes ? 10 : 0) +
    (choices.customApproved && choices.customMutation?.trim() ? count(choices.customCost) : 0);
}

export function specializationError(race, subrace, choices = {}, abilities = []) {
  if (race === "Elf" && subrace === "Erdei elf" && !artGenres.includes(choices.artGenre)) {
    return "Válaszd ki az erdei elf ingyenes Művészet jártasságának műfaját.";
  }
  if (race === "Ogár") {
    if ((choices.spikeLocations?.length || choices.torsoSpikes) &&
        abilities.some((ability) => ["Kitinbőr", "Mérges fekélyek", "Ragacsos bőr"].includes(ability))) {
      return "A csonttüskék más bőrtorzulással csak a Rossz szag esetén kombinálhatók.";
    }
    if (choices.customMutation?.trim() &&
        (!choices.customApproved || choices.customCost == null || choices.customCost === "" ||
        !Number.isSafeInteger(Number(choices.customCost)) || Number(choices.customCost) < 0)) {
      return "Az egyedi torzuláshoz add meg a Mesélő által jóváhagyott főértékpont-költséget.";
    }
  }
  if (race === "Gennymanó" && choices.weaponType === "Íj" && !choices.weaponApproval) {
    return "A gennymanó íjához Mesélői engedély szükséges.";
  }
  const { attack = 0, defense = 0 } = choices.weaponTraining ?? {};
  if (attack || defense) {
    if ((!attack || !defense) || [attack, defense].some((rank) => !Number.isInteger(rank) || rank < 0 || rank > 4)) {
      return "A fegyverforgatás első szintje közös. Mindkét harcértéket add meg.";
    }
    if (["Gnóm", "Gennymanó"].includes(race) &&
        (choices.weaponType !== "Közelharci fegyver" || !choices.weaponName?.trim())) {
      return "A fegyverforgatás szintjeihez add meg a közelharci fegyvert.";
    }
  }
  return "";
}

export function racialSkillModifier(character, name) {
  const choices = character.racialSpecializations ?? {};
  if (character.race === "Ork" && name === "Íjászat") return 10;
  if (character.race === "Gnóm" && ["Cselezés", "Lefegyverzés"].includes(name)) return 10;
  if (character.race === "Ogár" && name === "Birkózás") return -25 * count(choices.extraLimbs);
  // Az Íjászat a kiválasztott fegyverre vonatkozik (34. és 105. o.).
  if (character.race === "Gennymanó" && name === "Íjászat" &&
      (["Fúvócső", "Parittya"].includes(choices.weaponType) ||
      (choices.weaponType === "Íj" && choices.weaponApproval))) return -40;
  return 0;
}

// P. 34, 49, 52, 96, 104 és 120. A két harcérték első szintje közös.
export function racialWeaponCost(character, attributeModifier) {
  const choices = character.racialSpecializations ?? {};
  const { attack = 0, defense = 0 } = choices.weaponTraining ?? {};
  if (Math.max(attack, defense) < 1) return 0;
  const base = character.stats?.[1];
  const price = (basePrice, level, attackTrack) => {
    const target = level <= 3 ? 40 : 50;
    const racial = character.race === "Gnóm" && choices.weaponType === "Közelharci fegyver" ? 10
      : character.race === "Gennymanó" && attackTrack ? (level <= 3 ? 50 : 10) : 0;
    const modifier = Number.isFinite(base) ? attributeModifier(base, target) : 0;
    return roundPercentageResult(basePrice * (100 + modifier + racial) / 100);
  };
  let cost = price(300, 1, true) + price(300, 1, false);
  for (const [rank, attackTrack] of [[attack, true], [defense, false]]) {
    for (let level = 2; level <= rank; level++) cost += price(level <= 3 ? 300 : 600, level, attackTrack);
  }
  return cost;
}
