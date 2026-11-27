import { remainingCodexNames } from "../magic/codexEditions.js";
import { percentileResult } from "./trials.js";
import { academicMagicTrial, availableMagicEp, finishSacredSpell, readDamageDice, spellCost, spellReadiness } from "../magiaSzabalyok.js";

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

export function logAcademicCasting(character, magic, spell, context, { id, roll, recordedAt, damageDice, method, fpConfirmed = false }) {
  if (magic.castingLog?.some(entry => entry.id === id) || (spell.fp != null && spell.fp !== 0 && method !== "manual" && !fpConfirmed) ||
      spellReadiness(character, magic, spell, "academic", context).state !== "ready") return magic;
  const { ep, difficulty } = spellCost(spell, "academic", context);
  const { target } = academicMagicTrial(character, magic, spell, difficulty);
  if ((method !== "manual" && percentileResult(target, roll) !== "success") || !Number.isFinite(ep) || ep < 0) return magic;
  const damage = damageDice && spell.id === "official:sebokozas" && readDamageDice(damageDice.join(" "), context.units);
  const remainingEp = magic.activeEp - ep;
  return { ...magic, activeEp: remainingEp, castingLog: [...(magic.castingLog ?? []), {
    id, recordedAt, spellName: spell.name ?? spell.id, previousEp: magic.activeEp, remainingEp,
    outcome: method === "manual" ? "Kézzel elbírált siker" : `sikeres létrehozási próba (${roll} / ${target})`,
    ...(method === "manual" && { method, spellId: spell.id }),
    ...(damage && { consequence: `Sebzés feloldás előtt: ${damage.reduce((sum, die) => sum + die, 0)} Fp (${damage.join(" + ")})` }),
  }] };
}

export function logAcademicFailure(character, magic, spell, context, { id, roll, epLoss, consequence, recordedAt }) {
  if (magic.castingLog?.some(entry => entry.id === id) ||
      spellReadiness(character, magic, spell, "academic", context).state !== "ready" ||
      !Number.isFinite(epLoss) || epLoss < 0 || epLoss > availableMagicEp(character, magic) ||
      !consequence?.trim() || consequence.length > 1000) return magic;
  const { difficulty } = spellCost(spell, "academic", context);
  const { target } = academicMagicTrial(character, magic, spell, difficulty);
  const outcome = percentileResult(target, roll);
  if (outcome !== "failure" && outcome !== "critical-failure") return magic;
  const remainingEp = magic.activeEp - epLoss;
  const label = outcome === "failure" ? "sikertelen létrehozási próba" : "katasztrofális rontás";
  return { ...magic, activeEp: remainingEp, castingLog: [...(magic.castingLog ?? []), {
    id, recordedAt, spellName: spell.name ?? spell.id, previousEp: magic.activeEp, remainingEp,
    outcome: `${label} (${roll} / ${target})`, consequence: consequence.trim(),
  }] };
}

export function recordAcademicPendingFailure(character, magic, spell, context, { id, roll, recordedAt }) {
  if (!["Kódexfüggetlen", "Skarlát", "Azúr", ...remainingCodexNames].includes(spell.codex) || magic.castingLog?.some(entry => entry.id === id) ||
      spellReadiness(character, magic, spell, "academic", context).state !== "ready") return magic;
  const { difficulty } = spellCost(spell, "academic", context);
  const { target } = academicMagicTrial(character, magic, spell, difficulty);
  const result = percentileResult(target, roll);
  if (result !== "failure" && result !== "critical-failure") return magic;
  const outcome = result === "failure" ? "Sikertelen létrehozási próba" : "Katasztrofális rontás";
  return { ...magic, castingLog: [...(magic.castingLog ?? []), {
    id, spellId: spell.id, spellName: spell.name, roll, target, recordedAt, outcome, status: "pending",
  }] };
}

export function adjudicateAcademicFailure(character, magic, { id, epLoss, consequence, adjudicatedAt }) {
  if (!magic.castingLog?.some(entry => entry.id === id && entry.status === "pending") ||
      !Number.isFinite(epLoss) || epLoss < 0 || (availableMagicEp(character, magic) ?? -1) < epLoss ||
      !consequence?.trim() || consequence.length > 1000) return magic;
  const remainingEp = magic.activeEp - epLoss;
  return { ...magic, activeEp: remainingEp, castingLog: magic.castingLog.map(entry => entry.id === id && entry.status === "pending"
    ? { ...entry, status: "adjudicated", previousEp: magic.activeEp, remainingEp, consequence: consequence.trim(), adjudicatedAt }
    : entry) };
}

export function undoSacredCasting(magic) {
  const last = magic.castingLog?.at(-1);
  if (!last || last.status === "pending" || last.status === "adjudicated" || last.remainingEp !== magic.activeEp ||
    (last.reservation && magic.acquisitions.some(entry => entry.form === last.reservation.form && entry.spellId === last.reservation.spellId))) return magic;
  return { ...magic, activeEp: last.previousEp, acquisitions: last.reservation ? [...magic.acquisitions, last.reservation] : magic.acquisitions,
    castingLog: magic.castingLog.slice(0, -1) };
}
