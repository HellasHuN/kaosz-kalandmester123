import { attributes, effectiveAttribute } from "../karakterFoeertekek.js";

// Alapkönyv, 135–136. o., Zafír Tábla és főértékpróbák.
const sapphire = [
  [90, 75, 35, 15, 5, 5, 5, 5, 5, 5, 5],
  [90, 90, 75, 55, 35, 15, 10, 5, 5, 5, 5],
  [95, 90, 90, 75, 55, 35, 15, 10, 5, 5, 5],
  [95, 95, 90, 90, 75, 55, 35, 15, 10, 5, 5],
  [95, 95, 95, 90, 90, 75, 55, 35, 15, 10, 5],
  [95, 95, 95, 95, 90, 90, 75, 55, 35, 15, 10],
  [95, 95, 95, 95, 95, 90, 90, 75, 55, 35, 15],
  [95, 95, 95, 95, 95, 95, 90, 90, 75, 55, 35],
  [95, 95, 95, 95, 95, 95, 95, 90, 90, 75, 55],
  [95, 95, 95, 95, 95, 95, 95, 95, 90, 90, 75],
  [95, 95, 95, 95, 95, 95, 95, 95, 95, 90, 90],
];

export function skillTarget(level, difficulty) {
  return sapphire[level]?.[difficulty] ?? null;
}

export function attributeTarget(character, name, modifier) {
  const index = attributes.findIndex(group => group.includes(name));
  if (index < 0 || !Number.isInteger(modifier)) return null;
  const direction = [0, 1, -1][attributes[index].indexOf(name)];
  const value = effectiveAttribute(character, index, direction);
  return Number.isFinite(value) ? value + modifier : null;
}

export function percentileResult(target, roll, { attribute = false, followUp } = {}) {
  const valid = value => Number.isSafeInteger(value) && value >= 1 && value <= 100;
  if (!Number.isFinite(target) || !valid(roll)) return "invalid";
  if (roll === 100 && attribute && target >= 100) {
    if (!valid(followUp)) return "follow-up";
    return followUp <= target - 100 ? "success" : "critical-failure";
  }
  if (roll === 100) return "critical-failure";
  if (roll === 1 || roll <= target) return "success";
  return "failure";
}

// TESZT 1.0 háziszabály, két Zafír-próba. Azonos kimenetelnél a KM dönt.
export function investigationContest(investigation, disguise) {
  const outcomes = [investigation, disguise];
  if (outcomes.some(outcome => !["success", "failure", "critical-failure"].includes(outcome))) return "invalid";
  const successes = outcomes.map(outcome => outcome === "success");
  if (successes[0] === successes[1]) return "narrator";
  return successes[0] ? "discovered" : "hidden";
}
