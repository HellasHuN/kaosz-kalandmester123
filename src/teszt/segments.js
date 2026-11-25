export function segmentEntries(entries, mode) {
  return entries.filter(entry => mode === "km" || entry.visible)
    .slice().sort((first, second) => first.segment - second.segment);
}

export function addSegment(entries, { id, name, segment, visible }) {
  if (!name.trim() || !Number.isSafeInteger(segment) || segment < 1 || entries.some(entry => entry.id === id)) return entries;
  return [...entries, { id, name: name.trim(), segment, visible: visible === true }];
}

export function segmentGroups(entries) {
  return Map.groupBy(entries, entry => entry.segment);
}

// Alapkönyv, 140. és 143–144. o., Folyamatos kezdeményezés.
export function calculateSegment({ previous, speed, action, roll }) {
  if (![previous, speed, action, roll].every(Number.isSafeInteger) ||
      previous < 0 || speed < 0 || action < 0 || roll < 1 || roll > 6) return null;
  const segment = previous + speed + action + roll;
  return Number.isSafeInteger(segment) ? segment : null;
}
