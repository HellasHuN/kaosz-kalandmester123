import { effectiveAttribute } from "./karakterFoeertekek.js";

// Alapkönyv, 169. oldal. A maradék Fp csillagai egyenletesen,
// az utolsó csillaggal a 10. rubrikában oszlanak el.
export function woundThresholds(maximum) {
  const base = Math.floor(maximum / 10);
  const remainder = maximum % 10;
  return Array.from({ length: 10 }, (_, index) => {
    const level = index + 1;
    return level * base + Math.floor(level * remainder / 10);
  });
}

export function woundLevel(current, maximum) {
  if (!Number.isSafeInteger(current) || !Number.isSafeInteger(maximum) ||
      maximum <= 0 || current > maximum) return null;
  if (current <= 0) return 10;
  const lost = maximum - current;
  return lost === 0 ? 0 : woundThresholds(maximum).findIndex((limit) => lost <= limit) + 1;
}
export function maxHealth(character) {
  // Alapkönyv, 169. oldal: teljes feltöltöttségnél a Fizikum főérték adja az Fp-t.
  return effectiveAttribute(character, 0) ?? 0;
}

export function changeCurrentHealth(character, amount) {
  const maximum = maxHealth(character);
  const current = character.currentFp ?? maximum;
  const next = current + amount;
  if (!Number.isSafeInteger(next) || next < 0 || next > maximum || Math.abs(amount) !== 1) return character;
  return { ...character, currentFp: next };
}

