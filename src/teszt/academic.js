import { codexTheorySkills } from "../jpKoltsegek.js";
import { gilfFreeTheory } from "../gilfMagia.js";
import { codices } from "../varazslatAdatok.js";

export const academicCodices = codices.filter(codex => codex !== "Kódexfüggetlen" && codex !== "Praktikus mágia");
export const generalTheory = "Mágiaelmélet";
export const academicUse = "Mágiahasználat (akadémikus)";
export const legacyTheoryNames = new Set([...Object.values(codexTheorySkills), gilfFreeTheory]);

export function validAcademicSpecialization(specialization) {
  return specialization === null || academicCodices.includes(specialization?.codex);
}

export function selectAcademicCodex(previous, codex) {
  if (!codex) return null;
  return { ...previous, codex };
}

export function legacyTheoryRank(skills = {}) {
  return Math.max(0, ...[...legacyTheoryNames].map(name => skills[name] ?? 0));
}

export function academicTheoryRank(skills = {}) {
  return Math.max(skills[generalTheory] ?? 0, legacyTheoryRank(skills));
}

export function academicException(magic, spell) {
  return Object.hasOwn(magic.academicExceptions ?? {}, spell.id) ? magic.academicExceptions[spell.id] : undefined;
}

export function academicAccess(magic, spell) {
  const codex = magic.academicSpecialization?.codex;
  const ownCodex = academicCodices.includes(codex) && spell.codex === codex;
  const exception = academicException(magic, spell);
  const permitted = exception?.allowed === true;
  const acquired = magic.acquisitions?.some(entry => entry.spellId === spell.id && entry.form === "academic");
  return {
    allowed: !codex || ownCodex || permitted,
    bonus: ownCodex || (permitted && acquired && exception.bonus === true) ? 20 : 0,
    componentFree: ownCodex || (permitted && exception.componentFree === true),
  };
}

export function setAcademicGrant(character, magic, spell, granted) {
  if (!character.skills?.[academicUse] || spell.codex === "Praktikus mágia") return magic;
  const previous = academicException(magic, spell);
  if (granted === (previous?.granted === true)) return magic;
  const isFormula = (entry) => entry.spellId === spell.id && entry.form === "academic";
  const acquisitions = magic.acquisitions ?? [];
  const added = granted && !acquisitions.some(isFormula);
  const next = granted
    ? { ...previous, allowed: true, granted: true, grantAddedAcquisition: added, bonus: previous?.allowed === true && previous.bonus === true }
    : { ...previous, allowed: false, granted: false, grantAddedAcquisition: false, bonus: false };
  return {
    ...magic,
    academicExceptions: { ...magic.academicExceptions, [spell.id]: next },
    acquisitions: added ? [...acquisitions, { spellId: spell.id, form: "academic" }]
      : !granted && previous?.grantAddedAcquisition ? acquisitions.filter(entry => !isFormula(entry)) : acquisitions,
  };
}
