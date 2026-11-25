import { felszereles } from "./felszerelesAdatok.js";
import { characterStats, characterAdjustments } from "./karakterFoeertekek.js";

export const speedByRace = {
  Elf: { min: 14, avg: 4, max: 2 },
  Ember: { min: 17, avg: 7, max: 4 },
  Gennymanó: { min: 14, avg: 4, max: 2 },
  Gilf: { min: 15, avg: 5, max: 2 },
  Gnóm: { min: 18, avg: 8, max: 5 },
  Gyíklény: { min: 15, avg: 5, max: 2 },
  Manó: { min: 16, avg: 6, max: 3 },
  Ogár: { min: 19, avg: 9, max: 6 },
  Ork: { min: 17, avg: 7, max: 4 },
  Törpe: { min: 18, avg: 8, max: 5 },
  Tündérke: { min: 3, avg: 2, max: 1 },
  "Félvér elf": { min: 15, avg: 5, max: 2 },
  "Félvér gilf": { min: 16, avg: 6, max: 3 },
  "Félvér ogár": { min: 18, avg: 8, max: 5 },
  Szürkemanó: { min: 19, avg: 6, max: 2 },
  "Félvér ork": { min: 17, avg: 7, max: 4 },
};

const catalog = new Map(felszereles.map((item) => [item.id, item]));
const armorReduction = [0, 0, 0, 0, 1, 1, 2, 4, 6, 8, 10];

function equipmentValue(entry, item, key) {
  const limits = item.stats?.[key];
  if (!Array.isArray(limits)) return Number.isFinite(limits) ? limits : null;
  const selected = entry.values?.[key];
  if (selected == null || selected === "") return null;
  const value = Number(selected);
  return Number.isFinite(value) && value >= limits[0] && value <= limits[1] ? value : null;
}

export function characterSpeed(character) {
  const race = Object.hasOwn(speedByRace, character.race) ? speedByRace[character.race] : null;
  if (!race) return { value: null, reason: "A faj alapgyorsasága nincs meghatározva." };
  let base = race.avg;
  const speedTraits = [
    [character.advantages, "Kimagasló gyorsaság", race.max, race.avg],
    [character.disadvantages, "Faji lassúság", race.avg, race.min],
  ].filter(([group, trait]) => group?.some((entry) => (entry?.name ?? entry) === trait));
  if (speedTraits.length) {
    const [, trait, min, max] = speedTraits[0];
    const value = Number(character.traitValues?.[trait]);
    if (speedTraits.length > 1 || !Number.isInteger(value) || value < min || value > max) {
      return { value: null, reason: "Az előny vagy hátrány gyorsaságértéke hiányzik vagy ellentmondásos." };
    }
    base = value;
  }

  const savedItems = character.equipment?.items;
  const items = Array.isArray(savedItems) ? savedItems
    : Object.entries(savedItems ?? {}).map(([catalogId, quantity]) => ({ catalogId, quantity }));
  let mass = 0;
  const missingWeights = new Set();
  const unknownWear = new Set();
  const armorPenalties = [];

  for (const entry of items) {
    const quantity = Number(entry.quantity);
    if (!(quantity > 0)) continue;
    const item = catalog.get(entry.catalogId);
    const weight = item ? equipmentValue(entry, item, "massKg") : null;
    if (weight == null) missingWeights.add(item?.name ?? entry.catalogId);
    else mass += quantity * weight;
    if (item?.kind !== "armor") continue;
    const penalty = equipmentValue(entry, item, "speedModifier");
    if (entry.equipped == null && penalty !== 0) {
      unknownWear.add(item.name);
    }
    if (entry.equipped !== true) continue;
    if (penalty == null) return { value: null, reason: `Hiányzó vértmódosító: ${item.name}.` };
    if (penalty > 0) armorPenalties.push(penalty);
  }

  if (armorPenalties.length > 1) {
    return { value: null, reason: "Több mozgást korlátozó vért együttes hatásához Mesélői döntés szükséges." };
  }
  const [limit, step] = {
    "Tündérke": [0.5, 0.25],
    "Gennymanó": [3, 1],
    "Ogár": [15, 5],
  }[character.race] ?? [10, 5];
  const strength = characterStats(character)[0] + characterAdjustments(character)[0];
  const loadPenalty = Math.ceil(Math.max(0, mass - limit) / step);
  const armorSkill = character.skills?.["Vértviselet"] ?? 0;
  const reduction = armorReduction[armorSkill] ?? 0;
  const armorPenalty = Math.max(0, (armorPenalties[0] ?? 0) - reduction);
  const value = base + loadPenalty + armorPenalty;
  const notices = [];
  if (missingWeights.size) {
    notices.push(`Alsó becslés az ismert tömegekből. Hiányzó tömegadat: ${[...missingWeights].join(", ")}.`);
  }
  if (unknownWear.size) {
    notices.push(`A számítás csak a jelölt vérteket veszi figyelembe. A viselés nincs rögzítve: ${[...unknownWear].join(", ")}.`);
  }
  if ((mass > 0 || missingWeights.size) && limit === 10 && step === 5 && (strength < 30 || strength > 70)) {
    notices.push("A számítás az alap teherbírást használja. Rendkívüli Erőnél a Mesélő ettől eltérhet.");
  }
  return notices.length ? { value, reason: notices.join(" ") } : { value };
}
