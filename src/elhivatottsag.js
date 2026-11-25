// Alapkönyv, 113. o. (karakteralkotás és szerepjáték) és 155–156. o. (szakrális mágia).
export const devotionSkill = "Elhivatottság*";

export function devotionError(character, level, approved) {
  if (!Number.isInteger(level) || level < 0 || level > 10) return "Az Elhivatottság szintje 0 és 10 közötti egész szám lehet.";
  if (!approved) return "Az Elhivatottság szintjét a Kalandmesternek kell jóváhagynia.";
  if (level > 0 && !(character.religion?.trim() || character.magic?.patron?.trim())) {
    return "Előbb rögzítsd az istenséget vagy papságot.";
  }
  return "";
}
