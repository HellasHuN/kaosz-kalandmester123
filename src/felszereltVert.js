import { felszereles } from "./felszerelesAdatok.js";

const armorCatalog = new Map(felszereles.filter((item) => item.kind === "armor").map((item) => [item.id, item]));
const coverage = {
  "Fej": ["Fej"],
  "Fej és törzs": ["Fej", "Mellkas"],
  "Mellkas": ["Mellkas"],
  "Teljes test": "all",
};

export function armorProtection(equipment, zones) {
  const items = Array.isArray(equipment?.items) ? equipment.items : [];
  const armor = items.filter((entry) => armorCatalog.has(entry.catalogId));
  const unknownEquipment = armor.some((entry) => entry.equipped == null) ||
    (!Array.isArray(equipment?.items) && Object.keys(equipment?.items ?? {}).some((id) => armorCatalog.has(id)));
  const worn = armor.filter((entry) => entry.equipped === true && Number(entry.quantity) > 0);
  const protection = Object.fromEntries(zones.map((zone) => [zone, { levels: [], covered: false, unknown: false }]));
  let unknownCoverage = false;
  let unknownLevel = false;

  for (const entry of worn) {
    const { stats } = armorCatalog.get(entry.catalogId);
    const area = coverage[stats.protection];
    if (!area) {
      unknownCoverage = true;
      continue;
    }
    const value = entry.values?.armorLevel;
    const level = Array.isArray(stats.armorLevel)
      ? value != null && value !== "" && Number.isInteger(Number(value)) &&
        Number(value) >= stats.armorLevel[0] && Number(value) <= stats.armorLevel[1] ? Number(value) : null
      : stats.armorLevel ?? null;
    if (level == null) unknownLevel = true;
    for (const zone of area === "all" ? zones : area) {
      protection[zone].covered = true;
      if (level == null) protection[zone].unknown = true;
      else protection[zone].levels.push(level);
    }
  }
  return { protection, unknownEquipment, unknownCoverage, unknownLevel };
}
