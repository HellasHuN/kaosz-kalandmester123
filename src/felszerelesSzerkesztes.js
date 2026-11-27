import { felszereles } from "./felszerelesAdatok.js";

const emptyEquipment = { items: [], notes: "" };
export const catalog = new Map(felszereles.map((item) => [item.id, item]));
export const labels = {
  speed: "Gyorsaság", preparation: "Előkészítés (szegmens)", strength: "Erő",
  rangeM: "Lőtáv (m)", massKg: "Tömeg (kg)", armorLevel: "Vértszint", protection: "Védett testrész",
  speedModifier: "GyM", minDamageSp: "Minimális sebzés (Sp)",
  conditionalStrength: "Feltételes fegyvererő", meleeSpeedModifier: "Közelharci GyM",
  oneHandMinStrength: "Egykezes használathoz szükséges Erő", requiredStrength: "Szükséges Erő",
};
const numberFormat = new Intl.NumberFormat("hu-HU");

export function formatStat(value) {
  return typeof value === "number" ? numberFormat.format(value) : value;
}

export function readEquipment(equipment = emptyEquipment) {
  if (Array.isArray(equipment.items)) return equipment;

  return {
    ...equipment,
    items: Object.entries(equipment.items ?? {}).map(([catalogId, quantity]) => ({
      id: catalogId, catalogId, quantity, values: {},
    })),
  };
}

export function variableStats(item) {
  return Object.entries(item?.stats ?? {}).filter(([, value]) => Array.isArray(value));
}

export function statOptions(min, max, currentValue) {
  const values = [min, ...Array.from(
    { length: Math.max(0, Math.ceil(max) - Math.floor(min) - 1) },
    (_, index) => Math.floor(min) + index + 1
  ), max];

  // Earlier versions accepted fractional weights. Keep the saved value selectable.
  const current = Number(currentValue);
  if (currentValue != null && currentValue !== "" && current >= min && current <= max) {
    values.push(current);
  }
  return [...new Set(values)].sort((first, second) => first - second);
}

export function equipmentDetails(item, entry) {
  const stats = Object.entries(item.stats ?? {}).map(([key, value]) =>
    `${labels[key]}: ${Array.isArray(value)
      ? (entry ? formatStat(entry.values?.[key] ?? "Pontosítandó") : value.map(formatStat).join("–"))
      : formatStat(value)}`
  );
  const enteredMass = entry?.values?.massKg;
  const mass = enteredMass != null && enteredMass !== "" ? Number(enteredMass) : item.stats?.massKg;
  if (typeof mass === "number" && Number(entry?.quantity) > 1) {
    stats.push(`Össztömeg: ${formatStat(mass * Number(entry.quantity))} kg`);
  }
  return stats.join(" · ") || "—";
}

export function validQuantity(quantity) {
  const value = Number(quantity);
  return Number.isSafeInteger(value) && value >= 1;
}

export function validEquipmentStat(key, raw, min, max) {
  const value = Number(raw);
  return raw != null && raw !== "" && Number.isFinite(value) && value >= min && value <= max &&
    (key === "massKg" || Number.isInteger(value));
}
