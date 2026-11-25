import { skillPrerequisiteMessage } from "./jartassagElofeltetelek.js";
import { specialization } from "./jartassagSzakosodasok.js";

// Alapkönyv 66–73. o. A képzési csomagok itt csak az igazolt induló szint felső határát adják meg.
export const startingTrainingSources = {
  individual: "Egyedi mesélői kivétel (errata)",
  arena: "Veremharcosok (67. o.)",
  magnoliaOld: "Régi Magnólia boszorkány (69. o.)",
  magnoliaKnight: "Magnólia hölgylovag (69. o.)",
  liathar: "Liathar Leányai (71. o.)",
  heraldAdept: "A Kín Hírnökei – Adeptus (72–73. o.)",
};

export function startingTrainingCap(source, name, character) {
  const item = specialization(name);
  switch (source) {
    case "individual": return 10;
    case "arena": return item?.base === "Fegyverforgatás" ? (item.branch ? 4 : 1) : 0;
    case "magnoliaOld": return name === "Esszenciafelszabadítás" || item?.base === "Művészet" ? 4 : 0;
    case "magnoliaKnight": return character.gender === "Nő" && name === "Lovaglás" ? 5 : 0;
    case "liathar": return character.gender === "Nő" && name === "Esszenciapajzs-aktivizálás" ? 4 : 0;
    case "heraldAdept": return ({ Fájdalomtűrés: 4, Aszkézis: 2, "Érzelmi kontroll": 5 })[name] ?? 0;
    default: return 0;
  }
}

export function startingApprovalContext(character) {
  const { race, subrace, age, creationStage, gender, religion, ancestry } = character;
  return [race, subrace, String(age ?? ""), creationStage, gender, religion, ancestry].map((value) => value ?? null);
}

function approvedFor(character, record) {
  return record?.approved === true &&
    JSON.stringify(record.context) === JSON.stringify(startingApprovalContext(character));
}

export function seniorStartingCap(character) {
  if (character.creationStage !== "senius") return 3;
  const record = character.startingSkillApprovals?.senior;
  // 57. o. Képlet nélkül a könyvben megadott tartomány alsó széle használható.
  return approvedFor(character, record) && record.level === 7 ? 7 : 6;
}

export function startingSkillException(character, name, baseLimit) {
  const record = character.startingSkillApprovals?.exceptions?.[name];
  if (!approvedFor(character, record) || !Number.isInteger(record.level) || record.level <= baseLimit ||
      typeof record.reason !== "string" || !record.reason.trim() ||
      record.level > startingTrainingCap(record.source, name, character) ||
      skillPrerequisiteMessage(character.skills, name, record.level, character)) return baseLimit;
  const item = specialization(name);
  if ((record.source === "arena" || (record.source === "magnoliaOld" && item?.base === "Művészet")) &&
      Object.entries(character.startingSkillApprovals.exceptions).some(([other, approval]) =>
        other !== name && approval.source === record.source && approvedFor(character, approval) &&
        (record.source === "arena" ? specialization(other)?.id !== item.id : specialization(other)?.base === "Művészet"))) {
    return baseLimit;
  }
  return record.level;
}
