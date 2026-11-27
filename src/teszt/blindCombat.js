// Alapkönyv, 107. o. Mindkét harcértéket a kisebbik szint korlátozza.
export function blindCombatRanks(weapon, skill) {
  return { attack: Math.min(weapon.attack, skill), defense: Math.min(weapon.defense, skill) };
}

// TESZT 1.0 háziszabály: az ötödik főérték aktív/passzív ága.
export const blindCombatAttribute = level => level <= 5 ? "Érzékszerv" : "Intuíció";
