import { codexTheorySkills } from "../jpKoltsegek.js";

export const generalTheory = "Mágiaelmélet";
export const academicUse = "Mágiahasználat (akadémikus)";
export const legacyTheoryNames = new Set(Object.values(codexTheorySkills));

export function academicTheoryRank(skills = {}) {
  return Math.max(skills[generalTheory] ?? 0, ...[...legacyTheoryNames].map(name => skills[name] ?? 0));
}

export function academicAccess(magic, spell) {
  const specialization = magic.academicSpecialization;
  if (!specialization) return { allowed: true, bonus: 0, componentFree: false };
  const onBranch = spell.type === specialization.branch;
  const onCodex = spell.codex === specialization.codex || spell.codex === "Kódexfüggetlen";
  const exceptions = magic.academicExceptions ?? {};
  const exception = Object.hasOwn(exceptions, spell.id) ? exceptions[spell.id] : null;
  const acquired = magic.acquisitions.some(entry => entry.spellId === spell.id && entry.form === "academic");
  if (!onBranch && !onCodex && !exception?.allowed && !acquired) return { allowed: false, bonus: 0, componentFree: false };
  if (!acquired) return { allowed: true, bonus: 0, componentFree: false };
  const approvedElsewhere = !onCodex && !onBranch;
  return {
    allowed: true,
    bonus: approvedElsewhere ? (exception?.bonus ? 20 : 0) : (onBranch ? 20 : 0),
    componentFree: approvedElsewhere ? exception?.componentFree === true : onBranch,
  };
}
