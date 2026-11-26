import { attributeTarget } from "./trials.js";

export function trialOverride(entries, characterId, attribute) {
  return entries.findLast(entry => entry.kind === "attribute-target" &&
    entry.characterId === String(characterId) && entry.attribute === attribute &&
    Number.isSafeInteger(entry.target) && !entry.revokedAt);
}

export function addTrialOverride(entries, character, attribute, previous, target, reason, id, recordedAt) {
  if (!character || !Number.isSafeInteger(previous) || !Number.isSafeInteger(target) ||
    !reason.trim() || entries.some(entry => entry.id === id)) return entries;
  const active = trialOverride(entries, character.id, attribute);
  const history = active ? revokeTrialOverride(entries, active.id, recordedAt) : entries;
  return [...history, {
    id, kind: "attribute-target", characterId: String(character.id), character: character.name,
    attribute, rule: `${attribute} · titkos főértékpróba`, target,
    previous: String(previous), approved: String(target), reason: reason.trim(), recordedAt,
  }];
}

export function revokeTrialOverride(entries, id, revokedAt) {
  return entries.map(entry => entry.id === id && entry.kind === "attribute-target" && !entry.revokedAt
    ? { ...entry, revokedAt } : entry);
}

export function effectiveTrialTarget(entries, character, attribute, modifier) {
  const base = trialOverride(entries, character.id, attribute)?.target;
  return base == null ? attributeTarget(character, attribute, modifier) : base + modifier;
}
