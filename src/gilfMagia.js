export const gilfFreeTheory = "Mágiaelmélet (szabad)";
export const freeMagicUse = "Mágiahasználat (szabad)";

// Alapkönyv, 40., 113., 152–154. o. A két alapképzettségen kívül
// az Esszenciafelszabadítást nevezi meg a szabad varázslás részeként.
export function gilfStartingSkillCap(character, name) {
  if (character?.race !== "Gilf") return name === gilfFreeTheory ? 0 : Infinity;
  if (name === gilfFreeTheory || name === freeMagicUse) return 4;
  if (name === "Esszenciafelszabadítás") return 2;
  return Infinity;
}
