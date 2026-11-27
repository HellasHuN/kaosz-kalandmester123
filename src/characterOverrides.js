export function recordCharacterOverrides(history, changes, reason, recordedAt) {
  if (!changes.length) return history;
  const explanation = reason?.trim();
  if (!explanation) return null;
  return [...history, ...changes.map(change => ({ ...change, reason: explanation, recordedAt }))];
}

export function approveCharacterOverrides(character, changes) {
  if (!changes.length) return character;
  const proposed = changes.map(({ field, before, after }) =>
    `${field}: ${before ?? "—"} → ${after ?? "—"}`).join("\n");
  const reason = window.prompt(`Eltérés a karakter szabályos értékeitől. A mentéshez adj meg indoklást.\n\n${proposed}`, "");
  const overrideLog = recordCharacterOverrides(character.overrideLog ?? [], changes, reason, new Date().toISOString());
  if (overrideLog === null) return null;
  return { ...character, gmOverrides: true, overrideLog };
}
