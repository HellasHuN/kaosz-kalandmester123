import { finishSacredSpell } from "../magiaSzabalyok.js";

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

export function undoSacredCasting(magic) {
  const last = magic.castingLog?.at(-1);
  if (!last || last.remainingEp !== magic.activeEp ||
    magic.acquisitions.some(entry => entry.form === last.reservation.form && entry.spellId === last.reservation.spellId)) return magic;
  return { ...magic, activeEp: last.previousEp, acquisitions: [...magic.acquisitions, last.reservation],
    castingLog: magic.castingLog.slice(0, -1) };
}
