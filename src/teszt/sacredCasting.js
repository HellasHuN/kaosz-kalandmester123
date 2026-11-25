import { percentileResult } from "./trials.js";
import { academicMagicTrial, finishSacredSpell, spellCost, spellReadiness } from "../magiaSzabalyok.js";

export function logSacredCasting(character, magic, spell, context, { id, recordedAt }) {
  if (magic.castingLog?.some(entry => entry.id === id)) return magic;
  const next = finishSacredSpell(character, magic, spell, context, true);
  if (next === magic) return magic;
  const reservation = magic.acquisitions.find(entry => entry.form === "sacred" && entry.spellId === spell.id);
  return { ...next, castingLog: [...(magic.castingLog ?? []), {
    id, recordedAt, spellName: spell.name ?? spell.id, reservation,
    previousEp: magic.activeEp, remainingEp: next.activeEp, outcome: "kézi elbírálás",
  }] };
}

export function logAcademicCasting(character, magic, spell, context, { id, roll, recordedAt }) {
  if (magic.castingLog?.some(entry => entry.id === id) || spell.fp != null ||
      spellReadiness(character, magic, spell, "academic", context).state !== "ready") return magic;
  const { ep, difficulty } = spellCost(spell, "academic", context);
  const { target } = academicMagicTrial(character, magic, spell, difficulty);
  if (percentileResult(target, roll) !== "success" || !Number.isFinite(ep) || ep < 0) return magic;
  const remainingEp = magic.activeEp - ep;
  return { ...magic, activeEp: remainingEp, castingLog: [...(magic.castingLog ?? []), {
    id, recordedAt, spellName: spell.name ?? spell.id, previousEp: magic.activeEp, remainingEp,
    outcome: `sikeres létrehozási próba (${roll} / ${target})`,
  }] };
}

export function undoSacredCasting(magic) {
  const last = magic.castingLog?.at(-1);
  if (!last || last.remainingEp !== magic.activeEp ||
    (last.reservation && magic.acquisitions.some(entry => entry.form === last.reservation.form && entry.spellId === last.reservation.spellId))) return magic;
  return { ...magic, activeEp: last.previousEp, acquisitions: last.reservation ? [...magic.acquisitions, last.reservation] : magic.acquisitions,
    castingLog: magic.castingLog.slice(0, -1) };
}
